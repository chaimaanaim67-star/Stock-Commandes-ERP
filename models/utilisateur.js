const db = require('../db');
const { comparePassword, hashPassword } = require('../utils/hachmotdepasse');
const adminService = require('../services/admin.service');
const { getUtilisateurPkColumn, rowUserId } = require('../utils/utilisateurSchema');
const PasswordPolicy = require('../utils/passwordPolicy');

function isAdminRole(userRole) {
    const r = String(userRole || '').trim().toLowerCase();
    return ['admin', 'it'].includes(r);
}

class Utilisateur {
    static async login(username, password) {
        try {
            await adminService.ensureSchema();
            const pk = await getUtilisateurPkColumn();

            const [rows] = await db.query(
                'SELECT * FROM utilisateur WHERE username = ?',
                [username]
            );

            if (rows.length === 0) {
                console.error(`❌ Utilisateur [${username}] introuvable.`);
                return null;
            }

            const userData = rows[0];
            const userId = rowUserId(userData);

            if (userData.actif === 0 || userData.actif === false) {
                console.error(`❌ Compte désactivé: ${username}`);
                return null;
            }

            const isPasswordValid = await comparePassword(password, userData.password);

            if (!isPasswordValid) {
                console.error(`❌ Mot de passe incorrect pour: ${username}`);
                return null;
            }

            console.log(`✅ Login réussi pour: ${username}`);

            try {
                await db.query(
                    `UPDATE utilisateur SET last_login = NOW() WHERE \`${pk}\` = ?`,
                    [userId]
                );
            } catch (e) {
                console.warn('last_login non mis à jour:', e.message);
            }

            return {
                id: userId,
                username: userData.username,
                role: userData.role,
                email: userData.email || '',
                token_version: userData.token_version || 0,
                must_change_password: Number(userData.must_change_password || 0) === 1,
            };
        } catch (error) {
            console.error('❌ Erreur dans Utilisateur.login:', error.message);
            throw error;
        }
    }

    static async getAll() {
        try {
            await adminService.ensureSchema();
            const pk = await getUtilisateurPkColumn();
            const [rows] = await db.query(`
                SELECT \`${pk}\` AS id, username, username AS nom, role,
                       COALESCE(email, '') AS email,
                       COALESCE(actif, 1) AS actif,
                       COALESCE(must_change_password, 0) AS must_change_password,
                       last_login, created_at,
                       COALESCE(token_version, 0) AS token_version
                FROM utilisateur
                ORDER BY username ASC
            `);
            return rows;
        } catch (error) {
            console.error('Database Error:', error.message);
            throw error;
        }
    }

    static async getById(id) {
        try {
            const pk = await getUtilisateurPkColumn();
            const [rows] = await db.query(
                `SELECT * FROM utilisateur WHERE \`${pk}\` = ?`,
                [id]
            );
            if (rows.length === 0) return null;
            return rows[0];
        } catch (error) {
            console.error('Database Error:', error.message);
            throw error;
        }
    }

    static async create({ username, password, role, email = '' }) {
        try {
            await adminService.ensureSchema();
            
            // Validate password policy
            const passwordValidation = PasswordPolicy.validate(password);
            if (!passwordValidation.valid) {
                throw new Error(passwordValidation.errors.join(', '));
            }
            
            const hashedPassword = await hashPassword(password);
            const [result] = await db.query(
                `INSERT INTO utilisateur (username, password, role, email, actif)
                 VALUES (?, ?, ?, ?, 1)`,
                [username, hashedPassword, role, email || null]
            );
            return { id: result.insertId, username, role, email };
        } catch (error) {
            console.error('Database Error:', error.message);
            throw error;
        }
    }

    static async update(id, { username, password, role, email, actif, forcePasswordReset }) {
        try {
            await adminService.ensureSchema();
            const pk = await getUtilisateurPkColumn();
            const fields = [];
            const values = [];

            if (username != null) {
                fields.push('username = ?');
                values.push(username);
            }
            if (role != null) {
                fields.push('role = ?');
                values.push(role);
            }
            if (email != null) {
                fields.push('email = ?');
                values.push(email || null);
            }
            if (actif != null) {
                fields.push('actif = ?');
                values.push(actif ? 1 : 0);
                if (!actif) {
                    fields.push('token_version = token_version + 1');
                }
            }
            if (password && String(password).length >= 4) {
                // Validate password policy
                const passwordValidation = PasswordPolicy.validate(password);
                if (!passwordValidation.valid) {
                    throw new Error(passwordValidation.errors.join(', '));
                }
                
                const hashedPassword = await hashPassword(password);
                fields.push('password = ?');
                values.push(hashedPassword);
                fields.push('token_version = token_version + 1');
                if (forcePasswordReset !== true) {
                    fields.push('must_change_password = 0');
                }
            }

            if (forcePasswordReset === true) {
                fields.push('must_change_password = 1');
            }

            if (fields.length === 0) {
                return { message: 'Aucune modification' };
            }

            values.push(id);
            await db.query(
                `UPDATE utilisateur SET ${fields.join(', ')} WHERE \`${pk}\` = ?`,
                values
            );
            return { message: 'Utilisateur mis à jour', id };
        } catch (error) {
            console.error('Database Error:', error.message);
            throw error;
        }
    }

    static async delete(id) {
        try {
            const pk = await getUtilisateurPkColumn();
            await db.query(`DELETE FROM utilisateur WHERE \`${pk}\` = ?`, [id]);
            return { message: 'Compte supprimé' };
        } catch (error) {
            console.error('Database Error:', error.message);
            throw error;
        }
    }

    static async getTokenVersion(id) {
        const pk = await getUtilisateurPkColumn();
        const [rows] = await db.query(
            `SELECT COALESCE(actif, 1) AS actif, COALESCE(token_version, 0) AS token_version
             FROM utilisateur WHERE \`${pk}\` = ?`,
            [id]
        );
        if (!rows.length) return null;
        return rows[0];
    }

    static async manageUtilisateur(action, data, userRole) {
        if (!isAdminRole(userRole)) {
            throw new Error('Action réservée aux administrateurs (Admin / IT).');
        }

        switch (action) {
            case 'getAll':
                return this.getAll();
            case 'create': {
                const { username, password, role, email } = data || {};
                if (!username || !password || !role) {
                    throw new Error('Nom, mot de passe et rôle sont obligatoires.');
                }
                return this.create({ username, password, role, email });
            }
            case 'update': {
                const id = data?.id;
                if (!id) throw new Error('ID utilisateur requis.');
                return this.update(id, data);
            }
            case 'delete': {
                const id = data?.id;
                if (!id) throw new Error('ID utilisateur requis.');
                return this.delete(id);
            }
            default:
                throw new Error(`Action inconnue: ${action}`);
        }
    }
}

module.exports = Utilisateur;
