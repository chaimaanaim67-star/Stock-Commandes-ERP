const { verifyToken } = require('../utils/jwt');
const Utilisateur = require('../models/utilisateur');

async function authMiddleware(req, res, next) {
    try {
        let token = null;

        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer')) {
            token = authHeader.split(' ')[1];
        }

        if (!token && req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: missing token' });
        }

        const decoded = verifyToken(token);
        const row = await Utilisateur.getTokenVersion(decoded.id);

        if (!row) {
            return res.status(401).json({ error: 'Unauthorized: user not found' });
        }
        if (row.actif === 0) {
            return res.status(403).json({ error: 'Compte désactivé' });
        }
        if (Number(decoded.token_version || 0) !== Number(row.token_version || 0)) {
            return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
    }
}

module.exports = authMiddleware;
