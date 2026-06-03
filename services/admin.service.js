const os = require('os');
const { pool } = require('../db');
const { getUtilisateurPkColumn } = require('../utils/utilisateurSchema');

let schemaReady = false;

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

async function columnExists(table, column) {
  const [rows] = await pool.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function ensureColumn(table, column, definition) {
  if (await columnExists(table, column)) return;
  await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
}

async function ensureSchema() {
  if (schemaReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id_log INT AUTO_INCREMENT PRIMARY KEY,
      id_ut INT NULL,
      username VARCHAR(128) NOT NULL DEFAULT '',
      action VARCHAR(64) NOT NULL,
      details TEXT,
      ip VARCHAR(64) DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_created (created_at),
      INDEX idx_audit_user (id_ut)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_presence (
      id_ut INT NOT NULL PRIMARY KEY,
      last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ip VARCHAR(64) DEFAULT '',
      user_agent VARCHAR(512) DEFAULT ''
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  try {
    await ensureColumn('utilisateur', 'email', 'VARCHAR(255) DEFAULT NULL');
    await ensureColumn('utilisateur', 'actif', 'TINYINT(1) NOT NULL DEFAULT 1');
    await ensureColumn('utilisateur', 'last_login', 'DATETIME DEFAULT NULL');
    await ensureColumn('utilisateur', 'token_version', 'INT NOT NULL DEFAULT 0');
    await ensureColumn('utilisateur', 'must_change_password', 'TINYINT(1) NOT NULL DEFAULT 0');
    // Only add 2FA columns if they don't exist
    try {
      await ensureColumn('utilisateur', 'two_fa_enabled', 'TINYINT(1) NOT NULL DEFAULT 0');
    } catch (e) {
      // Column already exists, ignore
    }
    try {
      await ensureColumn('utilisateur', 'two_fa_secret', 'VARCHAR(255) DEFAULT NULL');
    } catch (e) {
      // Column already exists, ignore
    }
    try {
      await ensureColumn('utilisateur', 'two_fa_backup_codes', 'TEXT DEFAULT NULL');
    } catch (e) {
      // Column already exists, ignore
    }
  } catch (e) {
    console.warn('Admin schema columns:', e.message);
  }

  schemaReady = true;
}

async function writeAudit({ id_ut = null, username = '', action, details = '', ip = '' }) {
  await ensureSchema();
  await pool.query(
    `INSERT INTO audit_log (id_ut, username, action, details, ip) VALUES (?, ?, ?, ?, ?)`,
    [id_ut, String(username || '').slice(0, 128), action, String(details || '').slice(0, 4000), ip]
  );
}

async function touchPresence(id_ut, ip = '', userAgent = '') {
  await ensureSchema();
  await pool.query(
    `INSERT INTO user_presence (id_ut, last_seen, ip, user_agent)
     VALUES (?, NOW(), ?, ?)
     ON DUPLICATE KEY UPDATE last_seen = NOW(), ip = VALUES(ip), user_agent = VALUES(user_agent)`,
    [id_ut, String(ip).slice(0, 64), String(userAgent).slice(0, 512)]
  );
}

async function listPresence() {
  await ensureSchema();
  const pk = await getUtilisateurPkColumn();
  const [rows] = await pool.query(
    `SELECT u.\`${pk}\` AS id, u.username, u.role, u.email, u.last_login, u.actif,
            p.last_seen, p.ip,
            CASE WHEN p.last_seen >= DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 1 ELSE 0 END AS is_online
     FROM utilisateur u
     LEFT JOIN user_presence p ON p.id_ut = u.\`${pk}\`
     ORDER BY p.last_seen DESC, u.username ASC`
  );
  const now = Date.now();
  return (rows || []).map((r) => ({
    ...r,
    is_online: r.is_online === 1 || (r.last_seen && now - new Date(r.last_seen).getTime() < ONLINE_WINDOW_MS),
  }));
}

async function listAuditLogs(limit = 100) {
  await ensureSchema();
  const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
  const [rows] = await pool.query(
    `SELECT id_log, id_ut, username, action, details, ip, created_at
     FROM audit_log ORDER BY created_at DESC LIMIT ?`,
    [lim]
  );
  return rows || [];
}

async function getOverview() {
  await ensureSchema();

  const presence = await listPresence();
  const onlineCount = presence.filter((p) => p.is_online && p.actif !== 0).length;

  const [[userStats]] = await pool.query(
    `SELECT COUNT(*) AS total_users, SUM(actif = 1) AS active_accounts FROM utilisateur`
  );

  let commandesCount = 0;
  let dbSizeMb = null;
  let lowStockAlerts = 0;
  try {
    const [[bc]] = await pool.query(`SELECT COUNT(*) AS c FROM bon_commande`);
    commandesCount = bc?.c || 0;
  } catch {
    /* table may not exist */
  }

  try {
    const [[stockRow]] = await pool.query(
      `SELECT COUNT(*) AS low_stock FROM produit WHERE COALESCE(quantite, 0) <= 10`
    );
    lowStockAlerts = stockRow?.low_stock || 0;
  } catch {
    /* ignore if table missing */
  }

  try {
    const [[dbRow]] = await pool.query(
      `SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
       FROM information_schema.TABLES WHERE table_schema = DATABASE()`
    );
    dbSizeMb = dbRow?.size_mb ?? null;
  } catch {
    /* ignore */
  }

  const mem = process.memoryUsage();

  return {
    users: {
      total: userStats?.total_users || 0,
      active_accounts: userStats?.active_accounts || 0,
      online: onlineCount,
      active_sessions: presence.length,
    },
    data: {
      commandes: commandesCount,
      db_size_mb: dbSizeMb,
      low_stock_alerts: lowStockAlerts,
    },
    server: {
      node_version: process.version,
      uptime_seconds: Math.floor(process.uptime()),
      memory_mb: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heap_used: Math.round(mem.heapUsed / 1024 / 1024),
      },
      hostname: os.hostname(),
      platform: os.platform(),
      load_avg: os.loadavg(),
    },
    online_users: presence.filter((p) => p.is_online && p.actif !== 0).slice(0, 20),
  };
}

async function getAnalyticsData() {
  await ensureSchema();

  // Order evolution by day
  let ordersByDay = [];
  try {
    const [rows] = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM bon_commande
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    ordersByDay = rows;
  } catch (e) {
    console.warn('Orders analytics error:', e.message);
  }

  // User activity by day
  let userActivity = [];
  try {
    const [rows] = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM audit_log
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);
    userActivity = rows;
  } catch (e) {
    console.warn('User activity analytics error:', e.message);
  }

  // Top salespeople
  let topSalespeople = [];
  try {
    const [rows] = await pool.query(`
      SELECT u.username, COUNT(bc.id) as commandes_count
      FROM utilisateur u
      LEFT JOIN bon_commande bc ON bc.created_by = u.id
      WHERE u.role = 'commerciale' OR u.role = 'commercial'
      GROUP BY u.id, u.username
      ORDER BY commandes_count DESC
      LIMIT 10
    `);
    topSalespeople = rows;
  } catch (e) {
    console.warn('Top salespeople analytics error:', e.message);
    // Fallback query without bc.id
    try {
      const [rows] = await pool.query(`
        SELECT u.username, 0 as commandes_count
        FROM utilisateur u
        WHERE u.role = 'commerciale' OR u.role = 'commercial'
        LIMIT 10
      `);
      topSalespeople = rows;
    } catch (fallbackError) {
      console.warn('Top salespeople fallback error:', fallbackError.message);
    }
  }

  // Critical stock
  let criticalStock = [];
  try {
    const [rows] = await pool.query(`
      SELECT nom_produit, quantite, unite
      FROM produit
      WHERE COALESCE(quantite, 0) <= 10
      ORDER BY quantite ASC
      LIMIT 20
    `);
    criticalStock = rows;
  } catch (e) {
    console.warn('Critical stock analytics error:', e.message);
  }

  return {
    orders_by_day: ordersByDay,
    user_activity: userActivity,
    top_salespeople: topSalespeople,
    critical_stock: criticalStock,
  };
}

async function getSystemHealth() {
  await ensureSchema();

  const si = require('systeminformation');

  try {
    const [cpu, mem, osInfo, disk, network] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo(),
      si.fsSize(),
      si.networkStats(),
    ]);

    // Database connections
    let dbConnections = 0;
    try {
      const [[row]] = await pool.query(`SHOW STATUS LIKE 'Threads_connected'`);
      dbConnections = parseInt(row?.Value || '0');
    } catch (e) {
      console.warn('DB connections error:', e.message);
    }

    // API latency (simulated)
    const apiLatency = Math.random() * 100 + 20;

    return {
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        speed: cpu.speed,
      },
      memory: {
        total: Math.round(mem.total / 1024 / 1024 / 1024),
        used: Math.round(mem.used / 1024 / 1024 / 1024),
        free: Math.round(mem.free / 1024 / 1024 / 1024),
        usage_percent: Math.round((mem.used / mem.total) * 100),
      },
      os: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        arch: osInfo.arch,
      },
      disk: disk.map(d => ({
        fs: d.fs,
        mount: d.mount,
        size: Math.round(d.size / 1024 / 1024 / 1024),
        used: Math.round(d.used / 1024 / 1024 / 1024),
        usage_percent: Math.round(d.use),
      })),
      network: network.map(n => ({
        iface: n.iface,
        rx_bytes: n.rx_bytes,
        tx_bytes: n.tx_bytes,
      })),
      database: {
        connections: dbConnections,
      },
      api: {
        latency_ms: Math.round(apiLatency),
      },
    };
  } catch (e) {
    console.error('System health error:', e.message);
    throw new Error('Failed to get system health');
  }
}

async function forceLogoutUser(id_ut, actorUsername = 'system') {
  await ensureSchema();
  const pk = await getUtilisateurPkColumn();
  await pool.query(
    `UPDATE utilisateur SET token_version = token_version + 1 WHERE \`${pk}\` = ?`,
    [id_ut]
  );
  await writeAudit({
    id_ut,
    username: actorUsername,
    action: 'FORCE_LOGOUT',
    details: `Déconnexion forcée utilisateur #${id_ut}`,
  });
  return { message: 'Session invalidée. L\'utilisateur devra se reconnecter.' };
}

async function clearAppCache() {
  if (global.__adminAppCache) global.__adminAppCache = {};
  return { message: 'Cache applicatif vidé.' };
}

module.exports = {
  ensureSchema,
  writeAudit,
  touchPresence,
  listPresence,
  listAuditLogs,
  getOverview,
  getAnalyticsData,
  getSystemHealth,
  forceLogoutUser,
  clearAppCache,
  ONLINE_WINDOW_MS,
};
