const PermissionService = require('../services/permission.service');

function authorize(permissionCode) {
    return async (req, res, next) => {
        try {
            // req.user from authmiddleware
            if(!req.user || !req.user.id) {
                return res.status(401).json({ error: 'Utilisateur non authentifié' });
            }

            const hasPermission = await PermissionService.hasPermission(req.user.id, permissionCode);

            if(!hasPermission) {
                return res.status(403).json({
                    error: `Accès refusé : permission "${permissionCode}" requise`
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

function authorizeAny(permissionCodes) {
    return async (req, res, next) => {
        try {
            if(!req.user || !req.user.id) {
                return res.status(401).json({ error: 'Utilisateur non authentifié' });
            }

            // Check if user has any of the required permissions
            const hasAnyPermission = await Promise.any(
                permissionCodes.map(code => PermissionService.hasPermission(req.user.id, code))
            ).catch(() => false);

            if(!hasAnyPermission) {
                return res.status(403).json({
                    error: `Accès refusé : une des permissions suivantes requise : ${permissionCodes.join(', ')}`
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

function authorizeAll(permissionCodes) {
    return async (req, res, next) => {
        try {
            if(!req.user || !req.user.id) {
                return res.status(401).json({ error: 'Utilisateur non authentifié' });
            }

            // Check if user has all required permissions
            const permissionChecks = await Promise.all(
                permissionCodes.map(code => PermissionService.hasPermission(req.user.id, code))
            );

            const hasAllPermissions = permissionChecks.every(hasPermission => hasPermission === true);

            if(!hasAllPermissions) {
                return res.status(403).json({
                    error: `Accès refusé : toutes les permissions suivantes requises : ${permissionCodes.join(', ')}`
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = { authorize, authorizeAny, authorizeAll };