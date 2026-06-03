const PModele = require('../models/PModele');
const StockService = require('./stock.service');
const { fieldValue } = require('../utils/produitFields');
const { buildPivotKeyFromParts } = require('../utils/pivotKeys');

class ModeleService {

    static async getPivotStockData(id_modele) {
        try {
            const config = await PModele.getByModeleId(id_modele);
            if (!config || config.length === 0) {
                throw new Error('Aucune configuration trouvée pour ce modèle.');
            }

            const stockData = await StockService.getPivotSource();

            const pos = (p) => String(p || '').trim().toLowerCase();
            const isRow = (p) => ['l', 'ligne', 'row', 'rows'].includes(pos(p));
            const isCol = (p) => ['c', 'colonne', 'column', 'columns'].includes(pos(p));
            const rowSpecs = config.filter((c) => isRow(c.position)).sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));
            const colSpecs = config.filter((c) => isCol(c.position)).sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0));

            const pivotTable = {
                headers: {
                    rows: rowSpecs.map(s => s.variante),
                    cols: []
                },
                body: {},
                rowTotals: {},
                grandTotal: 0
            };

            const uniqueCols = new Set();

            stockData.forEach(item => {
                const rowKey = buildPivotKeyFromParts(
                    rowSpecs.map((s) => fieldValue(item, s.variante))
                );

                const colKey = buildPivotKeyFromParts(
                    colSpecs.map((s) => fieldValue(item, s.variante))
                );

                uniqueCols.add(colKey);

                if (!pivotTable.body[rowKey]) {
                    pivotTable.body[rowKey] = {};
                    pivotTable.rowTotals[rowKey] = 0;
                }

                if (!pivotTable.body[rowKey][colKey]) {
                    pivotTable.body[rowKey][colKey] = 0;
                }

                const m3 = parseFloat(fieldValue(item, 'm3') || item.m3 || 0);
                pivotTable.body[rowKey][colKey] += m3;
                pivotTable.rowTotals[rowKey] += m3;
                pivotTable.grandTotal += m3;
            });

            pivotTable.headers.cols = Array.from(uniqueCols).sort();

            return pivotTable;

        } catch (error) {
            console.error('❌ Erreur Service Pivot:', error.message);
            throw error;
        }
    }

    static async updateConfiguration(id_modele, params) {
        try {
            for (const p of params) {
                await PModele.addParam(id_modele, p.variante, p.position, p.ordre);
            }
            return { message: 'Configuration mise à jour avec succès.' };
        } catch (error) {
            throw new Error('Erreur mise à jour config: ' + error.message);
        }
    }
}

module.exports = ModeleService;
