const db = require('../db');
const StockService = require('../services/stock.service');

class PModele {

    /**
     * Liste des modèles (MySQL)
     */
    static async getAll() {
        try {
            const [rows] = await db.query(
                `SELECT id_modele, nom_produit AS nom_modele FROM modele ORDER BY id_modele ASC`
            );
            return rows || [];
        } catch (error) {
            console.error('❌ Erreur MySQL (getAll modeles):', error.message);
            throw new Error('Impossible de charger les modèles.');
        }
    }

    /**
     * Valeurs distinctes d'une colonne stock (pivot / filtres)
     */
    static async getDistinctValues(columnName) {
        return StockService.getDistinct(columnName);
    }

    /**
     * =====================================================
     * 2. GET CONFIG BY MODELE ID (MYSQL)
     * =====================================================
     */
    static async getByModeleId(id_modele) {

        try {

            const [rows] = await db.query(
                `
                SELECT 
                    id_p_modele,
                    id_modele,
                    variante,
                    position,
                    ordre
                FROM p_modele
                WHERE id_modele = ?
                ORDER BY ordre ASC
                `,
                [id_modele]
            );

            return (rows || []).map((row) => ({

                id_p_modele:
                    row.id_p_modele,

                id_modele:
                    row.id_modele,

                variante:
                    String(row.variante || '').trim(),

                position:
                    String(row.position || '').trim(),

                ordre:
                    Number(row.ordre || 0)

            }));

        } catch (error) {

            console.error(
                '❌ Erreur MySQL (getByModeleId):',
                error.message
            );

            throw new Error(
                'Impossible de charger la configuration du modèle.'
            );
        }
    }

    /**
     * =====================================================
     * 3. ADD PARAM
     * =====================================================
     */
    static async addParam(
        id_modele,
        variante,
        position,
        ordre = 1
    ) {

        try {

            const [result] = await db.query(
                `
                INSERT INTO p_modele
                (
                    id_modele,
                    variante,
                    position,
                    ordre
                )
                VALUES (?, ?, ?, ?)
                `,
                [
                    id_modele,
                    variante,
                    position,
                    ordre
                ]
            );

            return result.insertId;

        } catch (error) {

            console.error(
                '❌ Erreur MySQL (addParam):',
                error.message
            );

            throw error;
        }
    }

    /**
     * =====================================================
     * 4. DELETE PARAM
     * =====================================================
     */
    static async deleteParam(id_p_modele) {

        try {

            await db.query(
                `
                DELETE FROM p_modele
                WHERE id_p_modele = ?
                `,
                [id_p_modele]
            );

        } catch (error) {

            console.error(
                '❌ Erreur MySQL (deleteParam):',
                error.message
            );

            throw error;
        }
    }

    /**
     * =====================================================
     * 5. DELETE CONFIG BY MODELE ID
     * =====================================================
     */
    static async deleteByModeleId(id_modele) {

        try {

            await db.query(
                `
                DELETE FROM p_modele
                WHERE id_modele = ?
                `,
                [id_modele]
            );

        } catch (error) {

            console.error(
                '❌ Erreur MySQL (deleteByModeleId):',
                error.message
            );

            throw error;
        }
    }

    /**
     * =====================================================
     * 6. REPLACE CONFIG
     * =====================================================
     */
    static async replaceConfig(
        id_modele,
        details = []
    ) {

        try {

            await this.deleteByModeleId(id_modele);

            for (const item of details) {

                if (
                    !item?.variante ||
                    !item?.position
                ) {
                    continue;
                }

                await this.addParam(
                    id_modele,
                    String(item.variante).trim(),
                    String(item.position).trim(),
                    Number(item.ordre) || 1
                );
            }

            return true;

        } catch (error) {

            console.error(
                '❌ Erreur MySQL (replaceConfig):',
                error.message
            );

            throw error;
        }
    }

    /**
     * =====================================================
     * 7. NORMALIZE ZONE TYPE
     * =====================================================
     */
    static normalizeZoneType(zoneType) {

        const z = String(zoneType || '')
            .toLowerCase()
            .trim();

        if (
            ['filtre', 'filter', 'filters']
                .includes(z)
        ) {
            return 'filters';
        }

        if (['l', 'ligne', 'row', 'rows'].includes(z)) {
            return 'rows';
        }

        if (['c', 'colonne', 'column', 'columns'].includes(z)) {
            return 'columns';
        }

        if (['f', 'filtre', 'filter'].includes(z)) {
            return 'filters';
        }

        if (['v', 'valeur', 'value', 'values'].includes(z)) {
            return 'values';
        }

        return z;
    }

    /**
     * =====================================================
     * 8. EMPTY SELECTIONS
     * =====================================================
     */
    static emptySelections() {

        return {
            filters: {},
            rows: {},
            columns: {}
        };
    }

    /**
     * =====================================================
     * 9. CREATE TABLE IF NOT EXISTS
     * =====================================================
     */
    static async ensureSelectionTable() {

        try {

            await db.query(
                `
                CREATE TABLE IF NOT EXISTS p_modele_selection (

                    id_selection INT AUTO_INCREMENT PRIMARY KEY,

                    id_modele INT NOT NULL,

                    variante VARCHAR(255) NOT NULL,

                    zone_type VARCHAR(32) NOT NULL,

                    valeur TEXT NOT NULL,

                    INDEX idx_modele (id_modele)

                )
                `
            );

        } catch (error) {

            console.error(
                '❌ Erreur MySQL (ensureSelectionTable):',
                error.message
            );

            throw error;
        }
    }

    /**
     * =====================================================
     * 10. GET SELECTIONS
     * =====================================================
     */
    static async getSelectionsByModeleId(id_modele) {

        try {

            await this.ensureSelectionTable();

            const [rows] = await db.query(
                `
                SELECT
                    variante,
                    zone_type,
                    valeur
                FROM p_modele_selection
                WHERE id_modele = ?
                ORDER BY id_selection ASC
                `,
                [id_modele]
            );

            const selections =
                this.emptySelections();

            (rows || []).forEach((row) => {

                const zone =
                    this.normalizeZoneType(
                        row.zone_type
                    );

                const variante =
                    String(row.variante || '')
                        .trim();

                const valeur =
                    row.valeur;

                if (
                    !zone ||
                    !variante ||
                    !selections[zone]
                ) {
                    return;
                }

                if (
                    !selections[zone][variante]
                ) {
                    selections[zone][variante] = [];
                }

                selections[zone][variante]
                    .push(valeur);
            });

            return selections;

        } catch (error) {

            console.error(
                '❌ Erreur MySQL (getSelectionsByModeleId):',
                error.message
            );

            throw new Error(
                'Impossible de charger les sélections du modèle.'
            );
        }
    }

    /**
     * =====================================================
     * 11. REPLACE SELECTIONS
     * =====================================================
     */
    static async replaceSelections(
        id_modele,
        selections = {}
    ) {

        try {

            await this.ensureSelectionTable();

            await db.query(
                `
                DELETE FROM p_modele_selection
                WHERE id_modele = ?
                `,
                [id_modele]
            );

            const zones = [
                'filters',
                'rows',
                'columns'
            ];

            for (const zone of zones) {

                const fields =
                    selections[zone];

                if (
                    !fields ||
                    typeof fields !== 'object'
                ) {
                    continue;
                }

                for (
                    const [variante, values]
                    of Object.entries(fields)
                ) {

                    if (
                        !variante ||
                        !Array.isArray(values)
                    ) {
                        continue;
                    }

                    for (const valeur of values) {

                        if (
                            valeur === undefined ||
                            valeur === null ||
                            valeur === ''
                        ) {
                            continue;
                        }

                        await db.query(
                            `
                            INSERT INTO p_modele_selection
                            (
                                id_modele,
                                variante,
                                zone_type,
                                valeur
                            )
                            VALUES (?, ?, ?, ?)
                            `,
                            [
                                id_modele,
                                String(variante).trim(),
                                zone,
                                String(valeur)
                            ]
                        );
                    }
                }
            }

            return true;

        } catch (error) {

            console.error(
                '❌ Erreur MySQL (replaceSelections):',
                error.message
            );

            throw error;
        }
    }
}

module.exports = PModele;