const db = require('../db');

class utilisateurPermission {
    constructor(id_ut, id_perm, autorise, created_at) {
        this.id_ut = id_ut;
        this.id_perm = id_perm;
        this.autorise = autorise;
        this.created_at = created_at;
    }

    // ---------------------------------------------------------
    // READ: Récupérer toutes les permissions d'un utilisateur
    // ---------------------------------------------------------
    static async getAllutilisateurpermission(id_ut) {
        try {
            // Jointure entre la table de liaison et la table permissions
            const [rows] = await db.query(`
                SELECT 
                    p.id_permission as id_perm, 
                    p.nom_permission as code, 
                    p.description, 
                    up.autorise, 
                    up.created_at as created_at
                FROM permission p
                JOIN utilisateur_permission up ON p.id_permission = up.id_perm
                WHERE up.id_ut = ?`, 
                [id_ut]
            );
            return rows;
        } catch (error) {
            throw new Error('Database Error (getAll): ' + error.message);
        }
    }
   
    // ---------------------------------------------------------
    // VERIFY: Vérifier si l'utilisateur possède un code spécifique (ex: 'ADMIN_VIEW')
    // ---------------------------------------------------------
    static async haspermission(id_ut, code) {
        try {
            const [rows] = await db.query(`
                SELECT up.id_ut 
                FROM utilisateur_permission up
                JOIN permission p ON up.id_perm = p.id_permission
                WHERE up.id_ut = ? AND p.nom_permission = ? AND up.autorise = TRUE`,
                [id_ut, code]
            );
            return rows.length > 0;
        } catch (error) {
            throw new Error('Database Error (haspermission): ' + error.message);
        }
    }
   
    // ---------------------------------------------------------
    // UPSERT: Créer ou mettre à jour l'autorisation
    // ---------------------------------------------------------
    static async upsertutilisateurpermission({ id_ut, id_perm, autorise = true }) {
        try {
            // Utilise la clé primaire (id_ut, id_perm) pour éviter les doublons
            const [result] = await db.query(`
                INSERT INTO utilisateur_permission (id_ut, id_perm, autorise) 
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE autorise = VALUES(autorise)`,
                [id_ut, id_perm, autorise]
            );
            return { message: 'Permission mise à jour avec succès', id_ut, id_perm };
        } catch (error) {
            throw new Error('Database Error (upsert): ' + error.message);
        }
    }

    // ---------------------------------------------------------
    // DELETE: Retirer une permission à un utilisateur
    // ---------------------------------------------------------
    static async deleteUtilisateurPermission({ id_ut, id_perm }) {
        try {
            const [result] = await db.query(
                'DELETE FROM utilisateur_permission WHERE id_ut = ? AND id_perm = ?',
                [id_ut, id_perm]
            );
            
            if (result.affectedRows === 0) {
                throw new Error('Liaison introuvable');
            }
            
            return { message: 'Liaison supprimée' };
        } catch (error) {
            throw new Error('Database Error (delete): ' + error.message);
        }
    }
}

module.exports = utilisateurPermission;