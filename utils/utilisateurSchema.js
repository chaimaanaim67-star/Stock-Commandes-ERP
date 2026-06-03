const db = require('../db');

let cachedPkColumn = null;

/**
 * Détecte la clé primaire de `utilisateur` (id ou id_ut selon les installations).
 */
async function getUtilisateurPkColumn() {
  if (cachedPkColumn) return cachedPkColumn;

  const [rows] = await db.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'utilisateur'
       AND COLUMN_KEY = 'PRI'
     LIMIT 1`
  );

  if (rows?.length) {
    cachedPkColumn = rows[0].COLUMN_NAME;
    return cachedPkColumn;
  }

  const [cols] = await db.query(`SHOW COLUMNS FROM utilisateur`);
  const names = (cols || []).map((c) => c.Field);
  if (names.includes('id')) cachedPkColumn = 'id';
  else if (names.includes('id_ut')) cachedPkColumn = 'id_ut';
  else throw new Error('Clé primaire introuvable sur la table utilisateur');

  return cachedPkColumn;
}

/** ID utilisateur depuis une ligne SELECT * */
function rowUserId(row) {
  if (!row) return null;
  return row.id_ut ?? row.id ?? row.ID ?? null;
}

module.exports = { getUtilisateurPkColumn, rowUserId };
