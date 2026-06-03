const utilisateurPermission = require('../models/utilisateur_permission');

class utPermService {
    // Get all permissions for a specific user
    static async getUserPermissions(userId) {
        return await utilisateurPermission.getAllutilisateurpermission(userId);
    }

    // Assign or update a permission to a user
    static async assignPermission(data) {
        // Validation simple
        if (!data.id_ut || !data.id_perm) {
            throw new Error('ID utilisateur et ID permission sont requis');
        }
        return await utilisateurPermission.upsertutilisateurpermission(data);
    }

    // Remove a permission from a user
    static async revokePermission(userId, permId) {
        return await utilisateurPermission.deleteUtilisateurPermission({ 
            id_ut: userId, 
            id_perm: permId 
        });
    }

    // Check if user has specific permission (utile pour le backend logic)
    static async checkAccess(userId, code) {
        return await utilisateurPermission.haspermission(userId, code);
    }
}

module.exports = utPermService;