/** Nettoyage chaînes (ex-encodage Progress) + format { columns, rows } pour le frontend. */

function cleanCellValue(val) {
    if (typeof val !== 'string') return val;
    return val
        .replace(/\uFFFD/g, '')
        .replace(/\bHTRE\b/g, 'HÊTRE')
        .replace(/AvivéÊ/g, 'Avivé')
        .replace(/Aviv/g, 'Avivé')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatStockRows(rows = []) {
    if (!rows.length) {
        return { columns: [], rows: [] };
    }
    const columns = Object.keys(rows[0]);
    const formattedRows = rows.map((row) =>
        columns.map((col) => cleanCellValue(row[col]))
    );
    return { columns, rows: formattedRows };
}

module.exports = { cleanCellValue, formatStockRows };
