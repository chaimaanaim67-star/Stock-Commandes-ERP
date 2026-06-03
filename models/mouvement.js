const { pool } = require('../db');

function normalizeRole(userRole) {
    const r = String(userRole || '').trim().toLowerCase();
    const map = {
        admin: 'Admin',
        it: 'IT',
        stock: 'Magasinier',
        magasinier: 'Magasinier',
        commerciale: 'Commercial',
        commercial: 'Commercial',
        directeur: 'Directeur',
    };
    return map[r] || userRole;
}

function isEntreeType(type_mouvement) {
    return String(type_mouvement || '').toLowerCase().includes('entr');
}

class mouvement {

    /** Variation m³ stock produit (+ entrée, − sortie). reverse = annuler un mouvement. */
    static async applyStockDelta(connection, id_produit, type_mouvement, quantite, reverse = false) {
        const q = parseFloat(quantite);
        if (!(q > 0)) throw new Error('Quantité (m³) invalide');

        const isEntree = isEntreeType(type_mouvement);
        let delta = isEntree ? q : -q;
        if (reverse) delta = -delta;

        const [rows] = await connection.query(
            'SELECT COALESCE(m3, 0) AS m3 FROM produit WHERE id_produit = ? FOR UPDATE',
            [id_produit]
        );
        if (!rows.length) throw new Error('Produit introuvable');

        const current = parseFloat(rows[0].m3) || 0;
        const next = Math.round((current + delta) * 10000) / 10000;
        if (next < -1e-6) {
            throw new Error(
                `Stock insuffisant : disponible ${current.toFixed(4)} m³, demandé ${q.toFixed(4)} m³`
            );
        }

        const safe = Math.max(0, next);
        await connection.query(
            'UPDATE produit SET m3 = ?, quantite = ? WHERE id_produit = ?',
            [safe, safe, id_produit]
        );
        return safe;
    }

    static async resolveProduitId(connection, { id_produit, num_colis }) {
        let pid = id_produit;
        let colis = num_colis;

        if (pid && !colis) {
            const [p] = await connection.query(
                'SELECT num_colis FROM produit WHERE id_produit = ?',
                [pid]
            );
            if (p.length) colis = p[0].num_colis;
        }

        if (!pid && colis) {
            const [p] = await connection.query(
                'SELECT id_produit FROM produit WHERE num_colis = ? LIMIT 1',
                [colis]
            );
            if (p.length) pid = p[0].id_produit;
        }

        if (!pid) {
            throw new Error('Produit obligatoire (sélection ou N° colis)');
        }
        return { id_produit: pid, num_colis: colis };
    }

    static async manageMouvement(action, data, userRole, id_mouvement = null) {
        const role = normalizeRole(userRole);
        const authorizedRoles = ['Admin', 'IT', 'Magasinier', 'Commercial', 'Directeur'];

        if (!authorizedRoles.includes(role)) {
            throw new Error('Accès refusé : Droits insuffisants');
        }

        switch (action) {
            case 'getAll':
                return await this.getAll();
            case 'getById':
                return await this.getById(id_mouvement);
            case 'create':
                if (['Directeur'].includes(role)) {
                    throw new Error('Action non autorisée pour votre profil');
                }
                return await this.create(data);
            case 'update':
                if (['Directeur'].includes(role)) {
                    throw new Error('Action non autorisée pour votre profil');
                }
                return await this.update(id_mouvement, data);
            case 'delete':
                if (!['Admin', 'IT'].includes(role)) {
                    throw new Error('Suppression interdite pour garantir la traçabilité');
                }
                return await this.delete(id_mouvement);
            default:
                throw new Error('Action non reconnue');
        }
    }

    static async getAll() {
        const query = `
            SELECT m.*,
                   p.designation AS produit_nom,
                   p.num_colis,
                   p.essence AS produit_essence,
                   p.marque AS produit_marque,
                   p.qualite AS produit_qualite,
                   p.m3 AS produit_m3_stock,
                   c.nom_client
            FROM mouvement m
            LEFT JOIN produit p ON m.id_produit = p.id_produit
            LEFT JOIN client c ON m.id_client = c.id_client
            ORDER BY m.date_mouvement DESC`;
        const [rows] = await pool.query(query);
        return rows;
    }

    /**
     * Sortie stock dans une transaction existante (ex. vente commercial / bon de commande).
     */
    static async createSortieInTransaction(connection, { id_produit, quantite, commentaire, id_client = null }) {
        const q = parseFloat(quantite);
        if (!id_produit || !(q > 0)) {
            throw new Error('Produit et quantité (m³) obligatoires pour la sortie');
        }
        const [result] = await connection.query(
            `INSERT INTO mouvement (id_produit, id_client, type_mouvement, quantite, commentaire)
             VALUES (?, ?, 'Sortie', ?, ?)`,
            [id_produit, id_client || null, q, commentaire || null]
        );
        await this.applyStockDelta(connection, id_produit, 'Sortie', q, false);
        return result.insertId;
    }

    static async create(data) {
        let { id_produit, id_client, type_mouvement, quantite, commentaire, num_colis } = data;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            if (!type_mouvement || quantite == null) {
                throw new Error('Type et quantité obligatoires');
            }

            const resolved = await this.resolveProduitId(connection, { id_produit, num_colis });
            id_produit = resolved.id_produit;

            const [result] = await connection.query(
                `INSERT INTO mouvement (id_produit, id_client, type_mouvement, quantite, commentaire)
                 VALUES (?, ?, ?, ?, ?)`,
                [id_produit, id_client || null, type_mouvement, quantite, commentaire || null]
            );

            await this.applyStockDelta(connection, id_produit, type_mouvement, quantite, false);

            await connection.commit();
            return {
                id: result.insertId,
                id_mouvement: result.insertId,
                message: 'Mouvement enregistré — stock m³ mis à jour',
            };
        } catch (error) {
            await connection.rollback();
            throw new Error('Transaction Error: ' + error.message);
        } finally {
            connection.release();
        }
    }

    static async update(id, data) {
        const { id_produit, id_client, type_mouvement, quantite, commentaire } = data;
        if (!id_produit || !type_mouvement || quantite == null) {
            throw new Error('Champs obligatoires manquants');
        }

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const old = await this.getById(id);

            await connection.query(
                `UPDATE mouvement SET id_produit = ?, id_client = ?, type_mouvement = ?, quantite = ?, commentaire = ?
                 WHERE id_mouvement = ?`,
                [id_produit, id_client || null, type_mouvement, quantite, commentaire || null, id]
            );

            await this.applyStockDelta(
                connection,
                old.id_produit,
                old.type_mouvement,
                old.quantite,
                true
            );
            await this.applyStockDelta(connection, id_produit, type_mouvement, quantite, false);

            await connection.commit();
            return { message: 'Mouvement mis à jour — stock recalculé' };
        } catch (error) {
            await connection.rollback();
            throw new Error('Transaction Error: ' + error.message);
        } finally {
            connection.release();
        }
    }

    static async getById(id) {
        const [rows] = await pool.query('SELECT * FROM mouvement WHERE id_mouvement = ?', [id]);
        if (!rows.length) throw new Error('Mouvement introuvable');
        return rows[0];
    }

    static async delete(id) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const old = await this.getById(id);
            await this.applyStockDelta(
                connection,
                old.id_produit,
                old.type_mouvement,
                old.quantite,
                true
            );
            await connection.query('DELETE FROM mouvement WHERE id_mouvement = ?', [id]);
            await connection.commit();
            return { message: 'Mouvement supprimé — stock m³ restauré' };
        } catch (error) {
            await connection.rollback();
            throw new Error('Transaction Error: ' + error.message);
        } finally {
            connection.release();
        }
    }
}

module.exports = mouvement;
