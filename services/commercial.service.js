const { pool } = require("../db");
const Modele = require("../models/modele");
const ModeleService = require("./modele.service");
const commercialStock = require("./commercialStock.service");
const StockService = require("./stock.service");
const socketServer = require("../websocket/socketServer");

let schemaReady = false;

function lineKey(idModele, ligneKey, colKey) {
  return `${Number(idModele)}\n${String(ligneKey)}\n${String(colKey)}`;
}

/** Pas de TVA sur les bons de commande commercial. */
const TVA_RATE = 0;

async function ensureSchema() {
  if (schemaReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bon_commande (
      id_bc INT AUTO_INCREMENT PRIMARY KEY,
      reference VARCHAR(48) NOT NULL UNIQUE,
      nom_client VARCHAR(255) NOT NULL,
      ville VARCHAR(255) DEFAULT '',
      telephone VARCHAR(64) DEFAULT '',
      email VARCHAR(255) DEFAULT '',
      adresse TEXT,
      remarque TEXT,
      total_ht DECIMAL(14,2) NOT NULL DEFAULT 0,
      total_tva DECIMAL(14,2) NOT NULL DEFAULT 0,
      total_ttc DECIMAL(14,2) NOT NULL DEFAULT 0,
      statut VARCHAR(32) NOT NULL DEFAULT 'en_attente',
      source VARCHAR(32) DEFAULT 'app',
      created_by INT NULL,
      workflow_step VARCHAR(32) DEFAULT 'commercial',
      validated_by INT NULL,
      validated_at DATETIME NULL,
      stock_confirmed_by INT NULL,
      stock_confirmed_at DATETIME NULL,
      production_received_by INT NULL,
      production_received_at DATETIME NULL,
      version INT DEFAULT 1,
      locked_by INT NULL,
      locked_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_bc_created (created_at),
      INDEX idx_bc_statut (statut),
      INDEX idx_bc_created_by (created_by),
      INDEX idx_bc_workflow (workflow_step),
      INDEX idx_bc_version (version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bon_commande_ligne (
      id_ligne INT AUTO_INCREMENT PRIMARY KEY,
      id_bc INT NOT NULL,
      id_modele INT NOT NULL,
      ligne_key TEXT NOT NULL,
      col_key TEXT NOT NULL,
      quantite DECIMAL(14,4) NOT NULL,
      prix_unitaire DECIMAL(14,4) NOT NULL DEFAULT 0,
      designation VARCHAR(768) DEFAULT '',
      id_produit INT NULL,
      KEY idx_bc (id_bc)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const alters = [
    "ALTER TABLE bon_commande ADD COLUMN adresse TEXT",
    "ALTER TABLE bon_commande ADD COLUMN remarque TEXT",
    "ALTER TABLE bon_commande ADD COLUMN total_tva DECIMAL(14,2) NOT NULL DEFAULT 0",
    "ALTER TABLE bon_commande ADD COLUMN total_ttc DECIMAL(14,2) NOT NULL DEFAULT 0",
    "ALTER TABLE bon_commande ADD COLUMN statut VARCHAR(32) NOT NULL DEFAULT 'en_attente'",
    "ALTER TABLE bon_commande ADD COLUMN created_by INT NULL",
    'ALTER TABLE bon_commande ADD COLUMN workflow_step VARCHAR(32) DEFAULT "commercial"',
    "ALTER TABLE bon_commande ADD COLUMN validated_by INT NULL",
    "ALTER TABLE bon_commande ADD COLUMN validated_at DATETIME NULL",
    "ALTER TABLE bon_commande ADD COLUMN stock_confirmed_by INT NULL",
    "ALTER TABLE bon_commande ADD COLUMN stock_confirmed_at DATETIME NULL",
    "ALTER TABLE bon_commande ADD COLUMN production_received_by INT NULL",
    "ALTER TABLE bon_commande ADD COLUMN production_received_at DATETIME NULL",
    "ALTER TABLE bon_commande ADD COLUMN version INT DEFAULT 1",
    "ALTER TABLE bon_commande ADD COLUMN locked_by INT NULL",
    "ALTER TABLE bon_commande ADD COLUMN locked_at DATETIME NULL",
    "ALTER TABLE bon_commande ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    "ALTER TABLE bon_commande_ligne ADD COLUMN id_produit INT NULL",
  ];
  for (const sql of alters) {
    try {
      await pool.query(sql);
    } catch (e) {
      if (e.code !== "ER_DUP_FIELDNAME") throw e;
    }
  }

  schemaReady = true;
}

async function loadReservedMap() {
  const [rows] = await pool.query(
    `SELECT id_modele, ligne_key, col_key, quantite FROM bon_commande_ligne`,
  );
  const map = new Map();
  for (const r of rows || []) {
    const k = lineKey(r.id_modele, r.ligne_key, r.col_key);
    const q = parseFloat(r.quantite) || 0;
    map.set(k, (map.get(k) || 0) + q);
  }
  return map;
}

/**
 * Catalogue commercial : une ligne par cellule du pivot (modèles Stock),
 * avec quantité disponible = pivot produit − quantités déjà commandées.
 */
async function buildCatalog() {
  await ensureSchema();
  const reserved = await loadReservedMap();
  const modeles = await Modele.getAll();
  const items = [];
  const warnings = [];
  const lowStockThreshold = 5; // Alert when available quantity is below this

  for (const m of modeles) {
    let pivot;
    try {
      pivot = await ModeleService.getPivotStockData(m.id_modele);
    } catch (e) {
      warnings.push({
        id_modele: m.id_modele,
        nom: m.nom_modele,
        error: e.message,
      });
      continue;
    }
    const body = pivot.body || {};
    for (const ligneKey of Object.keys(body)) {
      const cols = body[ligneKey] || {};
      for (const colKey of Object.keys(cols)) {
        const pivotQty = parseFloat(cols[colKey]) || 0;
        const res = reserved.get(lineKey(m.id_modele, ligneKey, colKey)) || 0;
        const disponible = Math.max(0, pivotQty - res);
        const isLowStock = disponible < lowStockThreshold && disponible > 0;
        const isOutOfStock = disponible === 0;

        items.push({
          id_modele: m.id_modele,
          nom_modele: m.nom_modele,
          unite: m.unite || "m³",
          ligne_key: ligneKey,
          col_key: colKey,
          quantite_stock: pivotQty,
          quantite_reservee: res,
          quantite_disponible: disponible,
          designation: `${m.nom_modele} — ${ligneKey} / ${colKey}`,
          is_low_stock: isLowStock,
          is_out_of_stock: isOutOfStock,
          alert_level: isOutOfStock
            ? "critical"
            : isLowStock
              ? "warning"
              : "normal",
        });
      }
    }
  }

  return { items, warnings };
}

async function getDisponibiliteMap() {
  const { items } = await buildCatalog();
  const map = new Map();
  for (const it of items) {
    map.set(
      lineKey(it.id_modele, it.ligne_key, it.col_key),
      it.quantite_disponible,
    );
  }
  return map;
}

function normalizeReference(ref) {
  return String(ref || "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
}

async function generateReference() {
  const year = new Date().getFullYear();
  const prefix = `BC-${year}-`;
  const [rows] = await pool.query(
    `SELECT reference FROM bon_commande WHERE reference LIKE ? ORDER BY id_bc DESC LIMIT 1`,
    [`${prefix}%`],
  );
  let seq = 1;
  if (rows?.length) {
    const match = String(rows[0].reference || "").match(/BC-\d{4}-(\d+)/i);
    if (match) seq = parseInt(match[1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function referenceExists(ref) {
  const [rows] = await pool.query(
    "SELECT id_bc FROM bon_commande WHERE reference = ? LIMIT 1",
    [ref],
  );
  return rows && rows.length > 0;
}

function mapBonRow(bc) {
  const total_ht = parseFloat(bc.total_ht) || 0;
  const total_tva = parseFloat(bc.total_tva) || 0;
  const total_ttc = parseFloat(bc.total_ttc) || total_ht + total_tva;
  return {
    ...bc,
    total_ht,
    total_tva,
    total_ttc,
    statut: bc.statut || "en_attente",
  };
}

async function createCommande(payload, source = "app") {
  await ensureSchema();
  const {
    nom_client,
    ville = "",
    telephone = "",
    email = "",
    adresse = "",
    remarque = "",
    articles,
    reference_manuelle = null,
    statut = "en_attente",
    created_by = null,
  } = payload;

  if (!nom_client || !Array.isArray(articles) || articles.length === 0) {
    throw new Error("Client et au moins une ligne article sont obligatoires.");
  }

  const agg = new Map();
  for (const a of articles) {
    const idm = Number(a.id_modele);
    const lk = String(a.ligne_key ?? "");
    const ck = String(a.col_key ?? "");
    const idp = a.id_produit ? Number(a.id_produit) : null;
    const q = parseFloat(a.quantite);
    const pu = parseFloat(a.prix_unitaire ?? a.prix_unitaire_ht);
    if (!idm || lk === "" || ck === "" || !(q > 0) || !(pu >= 0)) {
      throw new Error(
        "Chaque ligne doit avoir id_modele, ligne_key, col_key, quantité et prix valides.",
      );
    }
    const k = idp ? `p:${idp}` : lineKey(idm, lk, ck);
    if (!agg.has(k)) {
      agg.set(k, {
        id_modele: idm,
        id_produit: idp,
        ligne_key: lk,
        col_key: ck,
        quantite: 0,
        prix_unitaire: pu,
        designation: String(a.designation || "").slice(0, 768),
      });
    }
    const row = agg.get(k);
    row.quantite += q;
    if (String(a.designation || "").trim())
      row.designation = String(a.designation).slice(0, 768);
  }

  const lines = [...agg.values()];

  const disponible = await getDisponibiliteMap();
  for (const row of lines) {
    if (row.id_produit) continue;
    const k = lineKey(row.id_modele, row.ligne_key, row.col_key);
    const disp = disponible.get(k);
    if (disp == null) {
      throw new Error(
        `Ligne inconnue ou modèle indisponible : ${row.designation || k}`,
      );
    }
    if (row.quantite > disp + 1e-6) {
      throw new Error(
        `Stock insuffisant pour « ${row.designation || k} » : demandé ${row.quantite}, disponible ${disp.toFixed(4)}. Commande impossible.`,
      );
    }
    // Prevent orders with zero or negative quantity
    if (row.quantite <= 0) {
      throw new Error(
        `Quantité invalide pour « ${row.designation || k} » : doit être positive.`,
      );
    }
  }

  await commercialStock.validatePhysicalStock(lines);

  let reference = normalizeReference(reference_manuelle);
  if (reference) {
    if (await referenceExists(reference)) {
      throw new Error(
        "Cette référence de bon existe déjà (scan / historique).",
      );
    }
  } else {
    reference = await generateReference();
    while (await referenceExists(reference)) {
      reference = await generateReference();
    }
  }

  let total_ht = 0;
  for (const row of lines) {
    total_ht += row.quantite * row.prix_unitaire;
  }
  total_ht = Math.round(total_ht * 100) / 100;
  const total_tva = 0;
  const total_ttc = total_ht;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [ins] = await conn.query(
      `INSERT INTO bon_commande (
         reference, nom_client, ville, telephone, email, adresse, remarque,
         total_ht, total_tva, total_ttc, statut, source, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reference,
        nom_client,
        ville,
        telephone,
        email,
        adresse,
        remarque,
        total_ht,
        total_tva,
        total_ttc,
        statut,
        source,
        created_by,
      ],
    );
    const id_bc = ins.insertId;
    const saleCtx = { reference, nom_client };
    for (const row of lines) {
      await conn.query(
        `INSERT INTO bon_commande_ligne (id_bc, id_modele, id_produit, ligne_key, col_key, quantite, prix_unitaire, designation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_bc,
          row.id_modele,
          row.id_produit || null,
          row.ligne_key,
          row.col_key,
          row.quantite,
          row.prix_unitaire,
          row.designation || null,
        ],
      );
      await commercialStock.applySaleForLine(conn, row, saleCtx);
    }
    await conn.commit();
    const saved = await findByReference(reference);

    // Broadcast updated stock snapshot to connected clients (commercial/stock)
    try {
      const stockSnapshot = await StockService.getAll();
      // stockSnapshot expected: { columns, rows, total }
      socketServer.broadcastStockUpdate({
        columns: stockSnapshot.columns || [],
        rows: stockSnapshot.rows || [],
      });
    } catch (err) {
      console.warn(
        "broadcastStockUpdate failed:",
        err && err.message ? err.message : err,
      );
    }

    return saved;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function findByReference(reference) {
  await ensureSchema();
  const ref = normalizeReference(reference);
  if (!ref) return null;
  const [bcRows] = await pool.query(
    "SELECT * FROM bon_commande WHERE reference = ? LIMIT 1",
    [ref],
  );
  if (!bcRows || !bcRows.length) return null;
  const bc = bcRows[0];
  const [lines] = await pool.query(
    `SELECT bl.*, m.nom_produit AS nom_modele
     FROM bon_commande_ligne bl
     LEFT JOIN modele m ON bl.id_modele = m.id_modele
     WHERE bl.id_bc = ?
     ORDER BY bl.id_modele, bl.id_ligne`,
    [bc.id_bc],
  );
  return {
    bon: mapBonRow(bc),
    lignes: (lines || []).map((l) => ({
      ...l,
      nom_modele: l.nom_modele || `Modèle #${l.id_modele}`,
      quantite: parseFloat(l.quantite) || 0,
      prix_unitaire: parseFloat(l.prix_unitaire) || 0,
      sous_total_ht:
        Math.round(
          (parseFloat(l.quantite) || 0) *
            (parseFloat(l.prix_unitaire) || 0) *
            100,
        ) / 100,
    })),
  };
}

async function listRecent(limit = 100) {
  await ensureSchema();
  const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const [rows] = await pool.query(
    `SELECT id_bc, reference, nom_client, ville, total_ht, total_tva, total_ttc, statut, source, created_at
     FROM bon_commande ORDER BY created_at DESC LIMIT ?`,
    [lim],
  );
  return rows || [];
}

async function getPreviousOrders(userId, limit = 50, offset = 0) {
  await ensureSchema();
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
  const off = Math.max(parseInt(offset, 10) || 0, 0);

  const [rows] = await pool.query(
    `SELECT id_bc, reference, nom_client, ville, telephone, email, total_ht, total_tva, total_ttc, statut, source, created_at
     FROM bon_commande 
     WHERE created_by = ? OR source = 'app'
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [userId, lim, off],
  );

  const [countResult] = await pool.query(
    `SELECT COUNT(*) as total FROM bon_commande WHERE created_by = ? OR source = 'app'`,
    [userId],
  );

  return {
    orders: rows || [],
    total: countResult[0]?.total || 0,
    limit: lim,
    offset: off,
  };
}

async function getOrderStats(userId) {
  await ensureSchema();

  const [totalStats] = await pool.query(
    `SELECT 
      COUNT(*) as total_orders,
      SUM(total_ht) as total_sales,
      AVG(total_ht) as avg_order_value,
      COUNT(CASE WHEN statut = 'en_attente' THEN 1 END) as pending_orders,
      COUNT(CASE WHEN statut = 'validée' THEN 1 END) as validated_orders,
      COUNT(CASE WHEN statut = 'livrée' THEN 1 END) as delivered_orders,
      COUNT(CASE WHEN statut = 'annulée' THEN 1 END) as cancelled_orders
     FROM bon_commande 
     WHERE created_by = ? OR source = 'app'`,
    [userId],
  );

  const [monthlyStats] = await pool.query(
    `SELECT 
      DATE_FORMAT(created_at, '%Y-%m') as month,
      COUNT(*) as orders_count,
      SUM(total_ht) as monthly_sales
     FROM bon_commande 
     WHERE (created_by = ? OR source = 'app')
     AND created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
     GROUP BY DATE_FORMAT(created_at, '%Y-%m')
     ORDER BY month DESC`,
    [userId],
  );

  const [topProducts] = await pool.query(
    `SELECT 
      bl.designation,
      SUM(bl.quantite) AS total_quantity,
      SUM(bl.quantite * bl.prix_unitaire) AS total_sales,
      COUNT(DISTINCT bl.id_bc) AS orders_count
     FROM bon_commande_ligne bl
     JOIN bon_commande bc ON bl.id_bc = bc.id_bc
     WHERE (bc.created_by = ? OR bc.source = 'app')
     GROUP BY bl.designation
     ORDER BY total_sales DESC
     LIMIT 10`,
    [userId],
  );

  const [topClients] = await pool.query(
    `SELECT 
      bc.nom_client as client_name,
      bc.ville,
      COUNT(*) as orders_count,
      SUM(bc.total_ht) as total_spent,
      AVG(bc.total_ht) as avg_order_value
     FROM bon_commande bc
     WHERE (bc.created_by = ? OR bc.source = 'app')
     GROUP BY bc.nom_client, bc.ville
     ORDER BY total_spent DESC
     LIMIT 10`,
    [userId],
  );

  return {
    overall: totalStats[0] || {},
    monthly: monthlyStats || [],
    topProducts: topProducts || [],
    topClients: topClients || [],
  };
}

async function getNotifications(limit = 15) {
  await ensureSchema();
  const lim = Math.min(Math.max(parseInt(limit, 10) || 15, 1), 100);

  const recentOrders = await listRecent(lim);
  const { items } = await buildCatalog();
  const lowStockItems = items.filter((item) => item.alert_level !== "normal");

  const stockNotifications = lowStockItems.map((item, index) => ({
    id: `stock-${item.id_modele}-${item.ligne_key}-${item.col_key}`,
    type: "stock",
    title: item.is_out_of_stock ? "Stock épuisé" : "Stock faible",
    message: `${item.designation}: ${item.quantite_disponible} ${item.unite} disponible`,
    severity: item.alert_level || "warning",
    read: false,
    createdAt: new Date().toISOString(),
  }));

  const orderNotifications = (recentOrders || []).map((order) => {
    const statut = (order.statut || "").toLowerCase();
    const severity =
      statut === "validée" || statut === "livrée"
        ? "success"
        : statut === "annulée"
          ? "critical"
          : "info";

    return {
      id: `order-${order.id_bc}`,
      type: "order",
      title:
        statut === "validée"
          ? "Commande validée"
          : statut === "livrée"
            ? "Commande livrée"
            : statut === "annulée"
              ? "Commande annulée"
              : "Nouvelle commande",
      message: `${order.reference || "BC"} · ${order.nom_client || "Client inconnu"} · ${parseFloat(
        order.total_ht || 0,
      ).toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} DH`,
      severity,
      read: false,
      createdAt: order.created_at || new Date().toISOString(),
    };
  });

  const notifications = [...stockNotifications, ...orderNotifications];
  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return notifications;
}

async function getClientHistory(clientName, limit = 20) {
  await ensureSchema();
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

  const [rows] = await pool.query(
    `SELECT id_bc, reference, nom_client, ville, telephone, email, adresse, remarque,
            total_ht, total_tva, total_ttc, statut, source, created_at
     FROM bon_commande 
     WHERE nom_client LIKE ?
     ORDER BY created_at DESC 
     LIMIT ?`,
    [`%${clientName}%`, lim],
  );

  return rows || [];
}

async function getClientStats(clientName) {
  await ensureSchema();

  const [stats] = await pool.query(
    `SELECT 
      COUNT(*) as total_orders,
      SUM(total_ht) as total_spent,
      AVG(total_ht) as avg_order_value,
      MIN(created_at) as first_order,
      MAX(created_at) as last_order,
      COUNT(CASE WHEN statut = 'livrée' THEN 1 END) as delivered_orders
     FROM bon_commande 
     WHERE nom_client LIKE ?`,
    [`%${clientName}%`],
  );

  const [topProducts] = await pool.query(
    `SELECT 
      bl.designation,
      SUM(bl.quantite) as total_quantity,
      COUNT(*) as order_count,
      AVG(bl.prix_unitaire) as avg_price
     FROM bon_commande_ligne bl
     JOIN bon_commande bc ON bl.id_bc = bc.id_bc
     WHERE bc.nom_client LIKE ?
     GROUP BY bl.designation
     ORDER BY total_quantity DESC
     LIMIT 10`,
    [`%${clientName}%`],
  );

  return {
    overall: stats[0] || {},
    topProducts: topProducts || [],
  };
}

async function updateOrderStatus(reference, newStatut) {
  await ensureSchema();
  const ref = normalizeReference(reference);
  if (!ref) throw new Error("Référence invalide");

  const [result] = await pool.query(
    "UPDATE bon_commande SET statut = ? WHERE reference = ?",
    [newStatut, ref],
  );

  if (result.affectedRows === 0) {
    throw new Error("Bon de commande introuvable");
  }

  return await findByReference(ref);
}

async function advanceWorkflowStep(reference, userId, step) {
  await ensureSchema();
  const ref = normalizeReference(reference);
  if (!ref) throw new Error("Référence invalide");

  const validSteps = ["commercial", "validation", "stock", "production"];
  if (!validSteps.includes(step)) {
    throw new Error("Étape de workflow invalide");
  }

  let updateFields = {};
  let updateValues = [];

  switch (step) {
    case "validation":
      updateFields = {
        workflow_step: "validation",
        validated_by: userId,
        validated_at: new Date(),
        statut: "validée",
      };
      break;
    case "stock":
      updateFields = {
        workflow_step: "stock",
        stock_confirmed_by: userId,
        stock_confirmed_at: new Date(),
        statut: "en_production",
      };
      break;
    case "production":
      updateFields = {
        workflow_step: "production",
        production_received_by: userId,
        production_received_at: new Date(),
        statut: "livrée",
      };
      break;
    default:
      throw new Error("Étape non supportée");
  }

  const setClause = Object.keys(updateFields)
    .map((k) => `${k} = ?`)
    .join(", ");
  const values = Object.values(updateFields);
  values.push(ref);

  const [result] = await pool.query(
    `UPDATE bon_commande SET ${setClause} WHERE reference = ?`,
    values,
  );

  if (result.affectedRows === 0) {
    throw new Error("Bon de commande introuvable");
  }

  return await findByReference(ref);
}

async function getWorkflowHistory(reference) {
  await ensureSchema();
  const ref = normalizeReference(reference);
  if (!ref) throw new Error("Référence invalide");

  const [rows] = await pool.query(
    `SELECT reference, workflow_step, statut, created_by, validated_by, validated_at,
            stock_confirmed_by, stock_confirmed_at, production_received_by, production_received_at, created_at
     FROM bon_commande WHERE reference = ? LIMIT 1`,
    [ref],
  );

  if (!rows || !rows.length) {
    throw new Error("Bon de commande introuvable");
  }

  const bc = rows[0];
  const history = [
    {
      step: "commercial",
      user_id: bc.created_by,
      timestamp: bc.created_at,
      action: "Commande créée",
    },
  ];

  if (bc.validated_by && bc.validated_at) {
    history.push({
      step: "validation",
      user_id: bc.validated_by,
      timestamp: bc.validated_at,
      action: "Validée par directeur",
    });
  }

  if (bc.stock_confirmed_by && bc.stock_confirmed_at) {
    history.push({
      step: "stock",
      user_id: bc.stock_confirmed_by,
      timestamp: bc.stock_confirmed_at,
      action: "Stock confirmé",
    });
  }

  if (bc.production_received_by && bc.production_received_at) {
    history.push({
      step: "production",
      user_id: bc.production_received_by,
      timestamp: bc.production_received_at,
      action: "Reçu en production",
    });
  }

  return history;
}

async function lockOrder(reference, userId) {
  await ensureSchema();
  const ref = normalizeReference(reference);
  if (!ref) throw new Error("Référence invalide");

  const lockTimeout = 30; // minutes

  const [result] = await pool.query(
    `UPDATE bon_commande 
     SET locked_by = ?, locked_at = NOW() 
     WHERE reference = ? 
     AND (locked_by IS NULL OR locked_at < DATE_SUB(NOW(), INTERVAL ? MINUTE))`,
    [userId, ref, lockTimeout],
  );

  if (result.affectedRows === 0) {
    const [locked] = await pool.query(
      "SELECT locked_by, locked_at FROM bon_commande WHERE reference = ?",
      [ref],
    );
    if (locked && locked.length > 0 && locked[0].locked_by) {
      throw new Error("Commande verrouillée par un autre utilisateur");
    }
    throw new Error("Bon de commande introuvable");
  }

  return await findByReference(ref);
}

async function unlockOrder(reference, userId) {
  await ensureSchema();
  const ref = normalizeReference(reference);
  if (!ref) throw new Error("Référence invalide");

  const [result] = await pool.query(
    "UPDATE bon_commande SET locked_by = NULL, locked_at = NULL WHERE reference = ? AND locked_by = ?",
    [ref, userId],
  );

  if (result.affectedRows === 0) {
    throw new Error(
      "Bon de commande introuvable ou non verrouillé par cet utilisateur",
    );
  }

  return await findByReference(ref);
}

async function updateOrderWithVersion(
  reference,
  updates,
  expectedVersion,
  userId,
) {
  await ensureSchema();
  const ref = normalizeReference(reference);
  if (!ref) throw new Error("Référence invalide");

  const setClause = Object.keys(updates)
    .map((k) => `${k} = ?`)
    .join(", ");
  const values = Object.values(updates);
  values.push(expectedVersion);
  values.push(ref);

  const [result] = await pool.query(
    `UPDATE bon_commande 
     SET ${setClause}, version = version + 1 
     WHERE reference = ? AND version = ?`,
    [...values, ref, expectedVersion],
  );

  if (result.affectedRows === 0) {
    const [current] = await pool.query(
      "SELECT version FROM bon_commande WHERE reference = ?",
      [ref],
    );
    if (current && current.length > 0) {
      throw new Error(
        `Conflit de version: attendu ${expectedVersion}, actuel ${current[0].version}`,
      );
    }
    throw new Error("Bon de commande introuvable");
  }

  return await findByReference(ref);
}

async function duplicateOrder(reference, newClientName = null) {
  await ensureSchema();
  const ref = normalizeReference(reference);
  if (!ref) throw new Error("Référence invalide");

  const [rows] = await pool.query(
    "SELECT * FROM bon_commande WHERE reference = ? LIMIT 1",
    [ref],
  );

  if (!rows || !rows.length) {
    throw new Error("Bon de commande introuvable");
  }

  const original = rows[0];

  const [lignes] = await pool.query(
    "SELECT * FROM bon_commande_ligne WHERE id_bc = ?",
    [original.id_bc],
  );

  const newReference = await generateReference();
  const clientName = newClientName || original.nom_client + " (copie)";

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ins] = await conn.query(
      `INSERT INTO bon_commande (
         reference, nom_client, ville, telephone, email, adresse, remarque,
         total_ht, total_tva, total_ttc, statut, source, created_by, workflow_step
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newReference,
        clientName,
        original.ville,
        original.telephone,
        original.email,
        original.adresse,
        original.remarque,
        original.total_ht,
        original.total_tva,
        original.total_ttc,
        "brouillon",
        "app",
        original.created_by,
        "commercial",
      ],
    );
    const newId = ins.insertId;

    for (const ligne of lignes) {
      await conn.query(
        `INSERT INTO bon_commande_ligne (id_bc, id_modele, id_produit, ligne_key, col_key, quantite, prix_unitaire, designation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          ligne.id_modele,
          ligne.id_produit,
          ligne.ligne_key,
          ligne.col_key,
          ligne.quantite,
          ligne.prix_unitaire,
          ligne.designation,
        ],
      );
    }

    await conn.commit();
    return await findByReference(newReference);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function processOCR(file) {
  await ensureSchema();

  // Real OCR implementation using Tesseract.js
  const Tesseract = require("tesseract.js");

  try {
    const {
      data: { text, confidence },
    } = await Tesseract.recognize(
      file.buffer,
      "fra", // French language
      {
        logger: (m) => console.log(m),
      },
    );

    // Parse the extracted text to extract structured data
    const extractedData = parseOCRText(text);

    return {
      ...extractedData,
      confidence: confidence || 0,
      rawText: text,
    };
  } catch (error) {
    console.error("OCR processing error:", error);
    throw new Error("Erreur lors du traitement OCR");
  }
}

function parseOCRText(text) {
  const lines = text.split("\n").filter((line) => line.trim());

  // Initialize default values
  let clientName = "";
  let ville = "";
  let telephone = "";
  let email = "";
  let products = [];

  // Parse each line to extract information
  lines.forEach((line) => {
    const lowerLine = line.toLowerCase();

    // Extract client name
    if (lowerLine.includes("client") || lowerLine.includes("nom")) {
      const match = line.match(/(?:client|nom)\s*[:=]?\s*(.+)/i);
      if (match) clientName = match[1].trim();
    }

    // Extract city
    if (lowerLine.includes("ville") || lowerLine.includes("city")) {
      const match = line.match(/(?:ville|city)\s*[:=]?\s*(.+)/i);
      if (match) ville = match[1].trim();
    }

    // Extract phone
    if (
      lowerLine.includes("tel") ||
      lowerLine.includes("téléphone") ||
      lowerLine.includes("phone")
    ) {
      const match = line.match(/(?:tel|téléphone|phone)\s*[:=]?\s*(.+)/i);
      if (match) telephone = match[1].trim();
    }

    // Extract email
    if (lowerLine.includes("email") || lowerLine.includes("@")) {
      const match = line.match(/(?:email)\s*[:=]?\s*(.+)/i);
      if (match) email = match[1].trim();
    }

    // Extract product information (look for patterns like "Chêne 22x100 3 pièces")
    const productMatch = line.match(
      /([a-zA-Zàâäéèêëïîôùûüÿç\s]+)\s+(\d+)x(\d+)\s*(\d+)\s*(?:pièces|pcs|pieces)?/i,
    );
    if (productMatch) {
      products.push({
        designation: productMatch[1].trim(),
        ligne_key: productMatch[2],
        col_key: productMatch[3],
        quantity: parseInt(productMatch[4]),
        price: 0, // Will need to be set by user or looked up
        id_modele: 1,
      });
    }
  });

  // If no products found, try alternative patterns
  if (products.length === 0) {
    lines.forEach((line) => {
      // Look for quantity and product name
      const qtyMatch = line.match(/(\d+)\s*(?:x|×)\s*(.+)/i);
      if (qtyMatch) {
        products.push({
          designation: qtyMatch[2].trim(),
          quantity: parseInt(qtyMatch[1]),
          price: 0,
          id_modele: 1,
        });
      }
    });
  }

  return {
    clientName: clientName || "Client OCR",
    ville: ville || "",
    telephone: telephone || "",
    email: email || "",
    products: products.length > 0 ? products : [],
  };
}

async function generateDevis(commandeData) {
  await ensureSchema();

  const devisReference = await generateReference("DEV");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ins] = await conn.query(
      `INSERT INTO bon_commande (
         reference, nom_client, ville, telephone, email, adresse, remarque,
         total_ht, total_tva, total_ttc, statut, source, created_by, workflow_step
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        devisReference,
        commandeData.nom_client,
        commandeData.ville || "",
        commandeData.telephone || "",
        commandeData.email || "",
        commandeData.adresse || "",
        commandeData.remarque || "",
        commandeData.total_ht || 0,
        commandeData.total_tva || 0,
        commandeData.total_ttc || 0,
        "devis",
        "app",
        commandeData.created_by || null,
        "commercial",
      ],
    );
    const newId = ins.insertId;

    if (commandeData.articles && commandeData.articles.length > 0) {
      for (const article of commandeData.articles) {
        await conn.query(
          `INSERT INTO bon_commande_ligne (id_bc, id_modele, id_produit, ligne_key, col_key, quantite, prix_unitaire, designation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newId,
            article.id_modele || null,
            article.id_produit || null,
            article.ligne_key || "",
            article.col_key || "",
            article.quantite || 0,
            article.prix_unitaire || 0,
            article.designation || "",
          ],
        );
      }
    }

    await conn.commit();
    return await findByReference(devisReference);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function convertDevisToCommande(devisReference) {
  await ensureSchema();
  const ref = normalizeReference(devisReference);
  if (!ref) throw new Error("Référence invalide");

  const [rows] = await pool.query(
    "SELECT * FROM bon_commande WHERE reference = ? LIMIT 1",
    [ref],
  );

  if (!rows || !rows.length) {
    throw new Error("Devis introuvable");
  }

  const devis = rows[0];

  if (devis.statut !== "devis") {
    throw new Error("Ce n'est pas un devis");
  }

  const commandeReference = await generateReference();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ins] = await conn.query(
      `UPDATE bon_commande 
       SET reference = ?, statut = ?, workflow_step = 'commercial'
       WHERE id_bc = ?`,
      [commandeReference, "en_attente", devis.id_bc],
    );

    await conn.commit();
    return await findByReference(commandeReference);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function getClientDataForExport(clientName) {
  await ensureSchema();

  const [history] = await pool.query(
    `SELECT reference, total_ht, total_ttc, statut, created_at 
     FROM bon_commande 
     WHERE nom_client = ? 
     ORDER BY created_at DESC`,
    [clientName],
  );

  const [stats] = await pool.query(
    `SELECT 
       COUNT(*) as total_orders,
       SUM(total_ht) as total_spent,
       AVG(total_ht) as avg_order_value
     FROM bon_commande 
     WHERE nom_client = ?`,
    [clientName],
  );

  return {
    clientName,
    history: history || [],
    stats: stats[0] || { total_orders: 0, total_spent: 0, avg_order_value: 0 },
  };
}

async function ensureStockMovementsSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product VARCHAR(255) NOT NULL,
      pieces INT DEFAULT 0,
      volume DECIMAL(10, 3) DEFAULT 0,
      length DECIMAL(10, 2) DEFAULT 0,
      width DECIMAL(10, 2) DEFAULT 0,
      wood_type VARCHAR(100),
      quality VARCHAR(100),
      movement_type ENUM('entry', 'exit') NOT NULL,
      source VARCHAR(100) DEFAULT 'manual',
      reference_id VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by INT,
      notes TEXT
    )
  `);
}

async function addStockMovement(movementData) {
  await ensureStockMovementsSchema();

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [ins] = await conn.query(
      `INSERT INTO stock_movements (
         product, pieces, volume, length, width, wood_type, quality,
         movement_type, source, reference_id, created_by, notes
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        movementData.product,
        movementData.pieces || 0,
        movementData.volume || 0,
        movementData.length || 0,
        movementData.width || 0,
        movementData.woodType || null,
        movementData.quality || null,
        movementData.movement_type || "entry",
        movementData.source || "ai",
        movementData.reference_id || null,
        movementData.created_by || null,
        movementData.notes || null,
      ],
    );

    await conn.commit();
    return { id: ins.insertId, ...movementData };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function getStockMovements(filters = {}) {
  await ensureStockMovementsSchema();

  let query = "SELECT * FROM stock_movements WHERE 1=1";
  const params = [];

  if (filters.product) {
    query += " AND product = ?";
    params.push(filters.product);
  }

  if (filters.movement_type) {
    query += " AND movement_type = ?";
    params.push(filters.movement_type);
  }

  if (filters.startDate) {
    query += " AND created_at >= ?";
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += " AND created_at <= ?";
    params.push(filters.endDate);
  }

  query += " ORDER BY created_at DESC";

  if (filters.limit) {
    query += " LIMIT ?";
    params.push(filters.limit);
  }

  const [rows] = await pool.query(query, params);
  return rows;
}

module.exports = {
  ensureSchema,
  buildCatalog,
  createCommande,
  findByReference,
  listRecent,
  getPreviousOrders,
  getOrderStats,
  getNotifications,
  getClientHistory,
  getClientStats,
  updateOrderStatus,
  advanceWorkflowStep,
  getWorkflowHistory,
  lockOrder,
  unlockOrder,
  updateOrderWithVersion,
  duplicateOrder,
  processOCR,
  generateDevis,
  convertDevisToCommande,
  getClientDataForExport,
  ensureStockMovementsSchema,
  addStockMovement,
  getStockMovements,
};
