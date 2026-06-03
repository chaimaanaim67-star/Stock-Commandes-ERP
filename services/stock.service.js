const { pool } = require('../db');
const { formatStockRows } = require('../utils/stockFormat');
const { fieldValue } = require('../utils/produitFields');

const EXCLUDE_COLS = new Set(['id_produit']);

class StockService {
    static async _allowedColumns() {
        const [rows] = await pool.query(
            `SELECT COLUMN_NAME AS name
             FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'produit'
             ORDER BY ORDINAL_POSITION`
        );
        return rows.map((r) => r.name).filter((c) => !EXCLUDE_COLS.has(c));
    }

    static async getAll() {
        const [rows] = await pool.query('SELECT * FROM produit ORDER BY id_produit ASC');
        const formatted = formatStockRows(rows);
        return { ...formatted, total: rows.length };
    }

    static async getFamilles() {
        const [rows] = await pool.query(
            `SELECT DISTINCT designation AS nom_pro FROM produit
             WHERE designation IS NOT NULL AND TRIM(designation) <> ''
             ORDER BY designation`
        );
        const formatted = formatStockRows(rows);
        return { ...formatted, total: rows.length };
    }

    static async getColonnes() {
        const columns = await this._allowedColumns();
        return { columns };
    }

    static async getDistinct(columnName) {
        const allowed = await this._allowedColumns();
        const col = String(columnName || '').trim();
        if (!allowed.includes(col)) {
            throw new Error(`Colonne non autorisée: ${col}`);
        }
        const [rows] = await pool.query(
            `SELECT DISTINCT \`${col}\` AS v FROM produit WHERE \`${col}\` IS NOT NULL ORDER BY v`
        );
        return rows.map((r) => r.v);
    }

    static async getDetailed(famille) {
        let sql = 'SELECT * FROM produit';
        const params = [];
        if (famille) {
            sql += ' WHERE designation = ?';
            params.push(famille);
        }
        const [rows] = await pool.query(sql, params);
        return rows;
    }

    /** Pivot + commercial — table produit */
    static async getPivotSource() {
        const [rows] = await pool.query('SELECT * FROM produit');
        return rows;
    }

    static resolveField(row, variante) {
        return fieldValue(row, variante);
    }

    static async getById(id_produit) {
        const [rows] = await pool.query('SELECT * FROM produit WHERE id_produit = ?', [id_produit]);
        return rows[0] || null;
    }

    static getAllowedColumns() {
        return this._allowedColumns();
    }
}

module.exports = StockService;
