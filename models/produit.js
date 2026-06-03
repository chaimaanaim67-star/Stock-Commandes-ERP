const { pool } = require('../db');

class produit {

    static async getDetailedStockProgress(famille) {
        try {
            let sql = 'SELECT * FROM produit';
            const params = [];
            if (famille) {
                sql += ' WHERE designation = ?';
                params.push(famille);
            }
            const [rows] = await pool.query(sql, params);
            return rows;
        } catch (error) {
            throw new Error('Database Error: ' + error.message);
        }
    }

    static async getAll() {
        const [rows] = await pool.query('SELECT * FROM produit ORDER BY id_produit ASC');
        return rows;
    }

    static async getById(id) {
        const [rows] = await pool.query('SELECT * FROM produit WHERE id_produit = ?', [id]);
        if (!rows.length) throw new Error('Produit introuvable');
        return rows[0];
    }

    static async create(data) {
        if (!data.num_colis) {
            throw new Error('num_colis obligatoire');
        }
        const query = `INSERT INTO produit (
            essence, num_produit, designation, epaisseur, largeur, longueur,
            dimension_ell, finition, marque, qualite, num_colis, num_lot_reception,
            ml, m2, m3, quantite, volume_piece, date_stock, depot, surface,
            contre_face, dimension_lle, format_emballage, face, jointage,
            nbr_colis, type_placage, pays_origine, sechage, section, type_sciage, type
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

        const values = [
            data.essence || null, data.num_produit || null, data.designation || null,
            data.epaisseur || null, data.largeur || null, data.longueur || null,
            data.dimension_ell || null, data.finition || null, data.marque || null,
            data.qualite || null, data.num_colis, data.num_lot_reception || null,
            data.ml || 0, data.m2 || 0, data.m3 || 0, data.quantite ?? 0,
            data.volume_piece || 0, data.date_stock || new Date(), data.depot || null,
            data.surface || null, data.contre_face || null, data.dimension_lle || null,
            data.format_emballage || null, data.face || null, data.jointage || null,
            data.nbr_colis || 0, data.type_placage || null, data.pays_origine || null,
            data.sechage || null, data.section || null, data.type_sciage || null, data.type || null
        ];

        const [result] = await pool.query(query, values);
        return { id: result.insertId, id_produit: result.insertId, message: 'Produit créé' };
    }

    static async update(id, data) {
        await pool.query(
            `UPDATE produit SET
                essence = COALESCE(?, essence),
                num_produit = COALESCE(?, num_produit),
                designation = COALESCE(?, designation),
                quantite = COALESCE(?, quantite),
                num_colis = COALESCE(?, num_colis),
                m3 = COALESCE(?, m3)
             WHERE id_produit = ?`,
            [
                data.essence ?? null,
                data.num_produit ?? null,
                data.designation ?? null,
                data.quantite ?? null,
                data.num_colis ?? null,
                data.m3 ?? null,
                id
            ]
        );
        return { message: 'Produit mis à jour' };
    }

    static async delete(id) {
        await this.getById(id);
        await pool.query('DELETE FROM produit WHERE id_produit = ?', [id]);
        return { message: 'Produit supprimé' };
    }
}

module.exports = produit;
