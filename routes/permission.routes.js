const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permission.Controller');
const authMiddleware = require('../middleware/auth.middleware');

// Toutes les routes ici nécessitent d'être connecté
router.use(authMiddleware);

// Seuls Admin et IT peuvent gérer les permissions
const checkRole = (roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: "Accès refusé. Droits insuffisants." });
    }
};

router.get('/', checkRole(['Admin', 'IT']), permissionController.getAllPermissions);
router.get('/:id', checkRole(['Admin', 'IT']), permissionController.getPermissionById);
router.post('/', checkRole(['Admin', 'IT']), permissionController.createPermission);
router.put('/:id', checkRole(['Admin', 'IT']), permissionController.updatePermission);
router.delete('/:id', checkRole(['Admin', 'IT']), permissionController.deletePermission);

module.exports = router;