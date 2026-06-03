const db = require('../db');
require('dotenv').config();

class Modele {

    /** Colonne réelle MySQL : nom_produit (exposée en API comme nom_modele). */
    static mapRow(row) {
        if (!row) return null;
        return {
            id_modele: row.id_modele ?? row.ID_MODELE,
            nom_modele: String(
                row.nom_modele ?? row.nom_produit ?? row.NOM_PRODUIT ?? ''
            ).trim(),
            unite: String(row.unite ?? row.UNITE ?? '').trim() || 'm³'
        };
    }

    /**
     * Liste des modèles (MySQL)
     */
    static async getAll() {
        try {
            const [result] = await db.query(
                `SELECT id_modele, nom_produit AS nom_modele, unite
                 FROM modele ORDER BY id_modele ASC`
            );

            return (result || []).map((row) => Modele.mapRow(row));
        } catch (error) {
            console.error('❌ Erreur Modele.getAll:', error);
            throw new Error('Impossible de récupérer les modèles.');
        }
    }

    static async getById(id) {
        try {
            const [rows] = await db.query(
                `SELECT id_modele, nom_produit AS nom_modele, unite
                 FROM modele WHERE id_modele = ?`,
                [id]
            );

            if (!rows?.length) return null;

            return Modele.mapRow(rows[0]);
        } catch (error) {
            console.error('❌ Erreur Modele.getById:', error);
            throw new Error('Erreur lors de la récupération du modèle.');
        }
    }

    static async create(nom_modele, unite = 'm³') {
        try {
            const [result] = await db.query(
                `INSERT INTO modele (nom_produit, unite) VALUES (?, ?)`,
                [nom_modele, unite || 'm³']
            );

            return {
                id_modele: result.insertId,
                nom_modele,
                unite: unite || 'm³'
            };
        } catch (error) {
            console.error('❌ Erreur Modele.create:', error);
            throw new Error('Erreur de création du modèle.');
        }
    }

    static async update(id_modele, nom_modele, unite = 'm³') {
        try {
            const [result] = await db.query(
                `UPDATE modele SET nom_produit = ?, unite = ? WHERE id_modele = ?`,
                [nom_modele, unite || 'm³', id_modele]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('❌ Erreur Modele.update:', error);
            throw new Error('Erreur de mise à jour du modèle.');
        }
    }

    static async delete(id_modele) {
        try {
            await db.query(
                `DELETE FROM p_modele_selection WHERE id_modele = ?`,
                [id_modele]
            ).catch(() => {});

            await db.query(
                `DELETE FROM p_modele WHERE id_modele = ?`,
                [id_modele]
            );

            const [result] = await db.query(
                `DELETE FROM modele WHERE id_modele = ?`,
                [id_modele]
            );
            return result.affectedRows > 0;
        } catch (error) {
            console.error('❌ Erreur Modele.delete:', error);
            throw new Error('Erreur de suppression du modèle (contrainte ou modèle introuvable).');
        }
    }
}

module.exports = Modele;
