const { pool } = require('../db');
const PModele = require('../models/PModele');
const StockService = require('./stock.service');
const Mouvement = require('../models/mouvement');
const { fieldValue } = require('../utils/produitFields');
const { buildPivotKeyFromParts } = require('../utils/pivotKeys');

function buildSaleCommentaire(reference, nomClient, designation) {
  const parts = [`Bon ${reference}`, nomClient, designation].filter(Boolean);
  return `[Vente] ${parts.join(' — ')}`;
}

function pivotSpecsFromConfig(config) {
  const pos = (p) => String(p || '').trim().toLowerCase();
  const isRow = (p) => ['l', 'ligne', 'row', 'rows'].includes(pos(p));
  const isCol = (p) => ['c', 'colonne', 'column', 'columns'].includes(pos(p));
  const rowSpecs = config
    .filter((c) => isRow(c.position))
    .sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));
  const colSpecs = config
    .filter((c) => isCol(c.position))
    .sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));
  return { rowSpecs, colSpecs };
}

async function getProduitsInPivotCell(id_modele, ligne_key, col_key) {
  const config = await PModele.getByModeleId(id_modele);
  if (!config?.length) return [];
  const { rowSpecs, colSpecs } = pivotSpecsFromConfig(config);
  const stockData = await StockService.getPivotSource();
  const out = [];

  for (const item of stockData) {
    const rk = buildPivotKeyFromParts(rowSpecs.map((s) => fieldValue(item, s.variante)));
    const ck = buildPivotKeyFromParts(colSpecs.map((s) => fieldValue(item, s.variante)));
    if (rk !== ligne_key || ck !== col_key) continue;
    const m3 = parseFloat(fieldValue(item, 'm3') || item.m3 || 0) || 0;
    if (m3 <= 0) continue;
    out.push({
      id_produit: item.id_produit,
      m3,
      designation: fieldValue(item, 'designation') || item.designation || '',
    });
  }

  return out.sort((a, b) => a.id_produit - b.id_produit);
}

/**
 * Sortie stock + mouvement « Vente » pour une ligne de bon de commande.
 */
async function applySaleForLine(connection, row, { reference, nom_client }) {
  const q = parseFloat(row.quantite) || 0;
  if (!(q > 0)) return;

  const commentaire = buildSaleCommentaire(
    reference,
    nom_client,
    row.designation || ''
  );

  if (row.id_produit) {
    await Mouvement.createSortieInTransaction(connection, {
      id_produit: row.id_produit,
      quantite: q,
      commentaire,
    });
    return;
  }

  const produits = await getProduitsInPivotCell(
    row.id_modele,
    row.ligne_key,
    row.col_key
  );
  let remaining = q;
  for (const p of produits) {
    if (remaining <= 1e-6) break;
    const take = Math.min(p.m3, remaining);
    if (take <= 0) continue;
    await Mouvement.createSortieInTransaction(connection, {
      id_produit: p.id_produit,
      quantite: take,
      commentaire: `${commentaire} (répartition stock)`,
    });
    remaining = Math.round((remaining - take) * 10000) / 10000;
  }

  if (remaining > 1e-6) {
    throw new Error(
      `Stock physique insuffisant pour « ${row.designation || row.ligne_key} » : manque ${remaining.toFixed(4)} m³`
    );
  }
}

async function validatePhysicalStock(rows) {
  for (const row of rows) {
    const q = parseFloat(row.quantite) || 0;
    if (row.id_produit) {
      const [p] = await pool.query(
        'SELECT COALESCE(m3, 0) AS m3 FROM produit WHERE id_produit = ?',
        [row.id_produit]
      );
      const disp = parseFloat(p[0]?.m3) || 0;
      if (q > disp + 1e-6) {
        throw new Error(
          `Stock insuffisant pour « ${row.designation || 'produit #' + row.id_produit} » : demandé ${q.toFixed(4)} m³, disponible ${disp.toFixed(4)} m³`
        );
      }
    } else {
      const produits = await getProduitsInPivotCell(
        row.id_modele,
        row.ligne_key,
        row.col_key
      );
      const total = produits.reduce((s, p) => s + p.m3, 0);
      if (q > total + 1e-6) {
        throw new Error(
          `Stock insuffisant pour « ${row.designation || row.ligne_key} » : demandé ${q.toFixed(4)} m³, disponible ${total.toFixed(4)} m³`
        );
      }
    }
  }
}

module.exports = {
  buildSaleCommentaire,
  getProduitsInPivotCell,
  applySaleForLine,
  validatePhysicalStock,
};
