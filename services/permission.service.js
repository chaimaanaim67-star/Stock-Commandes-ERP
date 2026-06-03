const Permission = require('../models/Permission');
const { PERMISSIONS, ROLE_PERMISSIONS } = require('../config/permissions');
const { pool } = require('../db');

class PermissionService {
    static async getAll() {
        return await Permission.getAllPermission();
    }

    static async getById(id) {
        const permission = await Permission.getPermissionById(id);
        if (!permission) throw new Error('Permission introuvable');
        return permission;
    }

    static async create(data, adminId) {
        // Ajout de l'ID de l'admin qui a créé la permission
        return await Permission.createPermission({ ...data, cree_par: adminId });
    }

    static async update(id, data, adminId) {
        return await Permission.updatePermission(id, { ...data, modifie_par: adminId });
    }

    static async delete(id) {
        return await Permission.deletePermission(id);
    }

    /**
     * Check if a user has a specific permission
     */
    static async hasPermission(userId, permissionCode) {
        try {
            // Get user's role
            const [userRows] = await pool.query(
                'SELECT role FROM utilisateur WHERE id = ?',
                [userId]
            );
            
            if (!userRows.length) return false;
            
            const userRole = userRows[0].role;
            
            // Admin has all permissions
            if (userRole === 'admin' || userRole === 'it') return true;
            
            // Check role-based permissions
            const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
            if (rolePermissions.includes(permissionCode)) return true;
            
            // Check user-specific permissions (from utilisateur_permission table)
            const [userPermRows] = await pool.query(
                `SELECT up.*, p.nom_permission 
                 FROM utilisateur_permission up
                 JOIN permission p ON up.id_permission = p.id_permission
                 WHERE up.id_utilisateur = ? AND p.nom_permission = ?`,
                [userId, permissionCode]
            );
            
            return userPermRows.length > 0;
        } catch (error) {
            console.error('Permission check error:', error);
            return false;
        }
    }

    /**
     * Get all permissions for a user
     */
    static async getUserPermissions(userId) {
        try {
            const [userRows] = await pool.query(
                'SELECT role FROM utilisateur WHERE id = ?',
                [userId]
            );
            
            if (!userRows.length) return [];
            
            const userRole = userRows[0].role;
            let permissions = new Set();
            
            // Add role-based permissions
            const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
            rolePermissions.forEach(p => permissions.add(p));
            
            // Add user-specific permissions
            const [userPermRows] = await pool.query(
                `SELECT p.nom_permission 
                 FROM utilisateur_permission up
                 JOIN permission p ON up.id_permission = p.id_permission
                 WHERE up.id_utilisateur = ?`,
                [userId]
            );
            
            userPermRows.forEach(row => permissions.add(row.nom_permission));
            
            return Array.from(permissions);
        } catch (error) {
            console.error('Get user permissions error:', error);
            return [];
        }
    }

    /**
     * Assign a permission to a user
     */
    static async assignPermissionToUser(userId, permissionId) {
        try {
            const [result] = await pool.query(
                'INSERT INTO utilisateur_permission (id_utilisateur, id_permission) VALUES (?, ?)',
                [userId, permissionId]
            );
            return { success: true, id: result.insertId };
        } catch (error) {
            console.error('Assign permission error:', error);
            throw new Error('Failed to assign permission');
        }
    }

    /**
     * Remove a permission from a user
     */
    static async removePermissionFromUser(userId, permissionId) {
        try {
            await pool.query(
                'DELETE FROM utilisateur_permission WHERE id_utilisateur = ? AND id_permission = ?',
                [userId, permissionId]
            );
            return { success: true };
        } catch (error) {
            console.error('Remove permission error:', error);
            throw new Error('Failed to remove permission');
        }
    }

    /**
     * Initialize default permissions in database
     */
    static async initializeDefaultPermissions() {
        try {
            for (const [key, code] of Object.entries(PERMISSIONS)) {
                const existing = await Permission.getPermissionByCode(code);
                if (!existing) {
                    await Permission.createPermission({
                        nom: code,
                        description: `${key.replace(/_/g, ' ')} permission`,
                    });
                }
            }
            return { success: true, message: 'Default permissions initialized' };
        } catch (error) {
            console.error('Initialize permissions error:', error);
            throw new Error('Failed to initialize permissions');
        }
    }
}

module.exports = PermissionService;