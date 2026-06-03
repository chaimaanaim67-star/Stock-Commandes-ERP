const db = require('../db');

class Permission {
    // 1. Récupérer tout (Table: permission)
    static async getAllPermission() {
        try {
            const [rows] = await db.query('SELECT * FROM permission ORDER BY id_permission DESC');
            return rows;
        } catch (error) {
            throw new Error('Erreur base de données (getAll): ' + error.message);
        }
    }

    // 2. Trouver par ID
    static async getPermissionById(id_permission) {
        try {
            const [rows] = await db.query('SELECT * FROM permission WHERE id_permission = ? LIMIT 1', [id_permission]);
            return rows[0] || null;
        } catch (error) {
            throw new Error('Erreur base de données (getById): ' + error.message);
        }
    }

    // 3. Trouver par Nom
    static async getPermissionByCode(nom) {
        try {
            const [rows] = await db.query('SELECT * FROM permission WHERE nom_permission = ? LIMIT 1', [nom]);
            return rows[0] || null;
        } catch (error) {
            throw new Error('Erreur base de données (getByCode): ' + error.message);
        }
    }

    // 4. Ajouter
    static async createPermission({ nom, description = null }) {
        try {
            const existing = await this.getPermissionByCode(nom);
            if (existing) throw new Error('Ce nom de permission existe déjà');

            const [result] = await db.query(
                'INSERT INTO permission (nom_permission, description) VALUES (?, ?)',
                [nom, description]
            );

            return { id_permission: result.insertId, nom_permission: nom, description };
        } catch (error) {
            throw new Error('Erreur lors de la création: ' + error.message);
        }
    }

    // 5. Update
    static async updatePermission(id_permission, { nom, description }) {
        try {
            const [result] = await db.query(
                'UPDATE permission SET nom_permission = ?, description = ? WHERE id_permission = ?',
                [nom, description, id_permission]
            );
            return { message: 'Permission mise à jour' };
        } catch (error) {
            throw new Error('Erreur lors de la mise à jour: ' + error.message);
        }
    }

    // 6. Delete
    static async deletePermission(id_permission) {
        try {
            await db.query('DELETE FROM permission WHERE id_permission = ?', [id_permission]);
            return { message: 'Permission supprimée' };
        } catch (error) {
            throw new Error('Erreur lors de la suppression: ' + error.message);
        }
    }
}

module.exports = Permission;