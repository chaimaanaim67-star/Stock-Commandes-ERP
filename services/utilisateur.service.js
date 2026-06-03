const utilisateur = require('../models/utilisateur');
const adminService = require('./admin.service');
const jwt = require('jsonwebtoken');

class utilisateurService {
    
    static async authenticate(username, password, meta = {}) {
        try {
            const user = await utilisateur.login(username, password);

            if (!user) {
                throw new Error('Identifiant ou mot de passe incorrect, ou compte désactivé.');
            }

            const token = jwt.sign(
                { 
                    id: user.id,
                    username: user.username,
                    role: user.role, 
                    token_version: user.token_version || 0,
                    must_change_password: user.must_change_password || false,
                    permissions: user.permissions || [],
                },
                process.env.JWT_SECRET || 'votre_cle_secrete',
                { expiresIn: '24h' }
            );

            const ip = meta.ip || '';
            await adminService.touchPresence(user.id, ip, meta.userAgent || '');
            await adminService.writeAudit({
                id_ut: user.id,
                username: user.username,
                action: 'LOGIN',
                details: `Connexion réussie (${user.role})`,
                ip,
            });

            return { user, token };

        } catch (error) {
            console.error("Erreur dans utilisateurService:", error.message);
            throw error;
        }
    }

    static async handleUserAction(action, data, userRole) {
        try {
            return await utilisateur.manageUtilisateur(action, data, userRole);
        } catch (error) {
            console.error("Erreur Action Service:", error.message);
            throw error;
        }
    }
}

module.exports = utilisateurService;