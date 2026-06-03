const db = require('../db');

class PModeleSelection {

    // =====================================================
    // GET BY MODELE
    // =====================================================

    static async getByModele(id_modele) {

        const [rows] = await db.query(
            `
            SELECT
                id_selection,
                id_modele,
                variante,
                zone_type,
                valeur
            FROM p_modele_selection
            WHERE id_modele = ?
            ORDER BY id_selection ASC
            `,
            [id_modele]
        );

        return rows;
    }

    // =====================================================
    // ADD
    // =====================================================

    static async add(
        id_modele,
        variante,
        zone_type,
        valeur
    ) {

        const [result] = await db.query(
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
                variante,
                zone_type,
                valeur
            ]
        );

        return result.insertId;
    }

    // =====================================================
    // DELETE BY ID
    // =====================================================

    static async delete(id_selection) {

        await db.query(
            `
            DELETE FROM p_modele_selection
            WHERE id_selection = ?
            `,
            [id_selection]
        );

    }

    // =====================================================
    // DELETE BY MODELE
    // =====================================================

    static async deleteByModele(id_modele) {

        await db.query(
            `
            DELETE FROM p_modele_selection
            WHERE id_modele = ?
            `,
            [id_modele]
        );

    }

    // =====================================================
    // REPLACE ALL
    // =====================================================

    static async replaceSelections(
        id_modele,
        selections = {}
    ) {

        await this.deleteByModele(id_modele);

        const zones = [
            'filters',
            'rows',
            'columns'
        ];

        for (const zone of zones) {

            const fields = selections[zone];

            if (!fields) continue;

            for (const [variante, values] of Object.entries(fields)) {

                if (!Array.isArray(values)) continue;

                for (const valeur of values) {

                    await this.add(
                        id_modele,
                        variante,
                        zone,
                        valeur
                    );

                }

            }

        }

    }

}

module.exports = PModeleSelection;