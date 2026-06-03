const express = require('express');
const router = express.Router();
const utPermController = require('../controllers/utilisateurPermission.controller');
const authMiddleware = require('../middleware/auth.middleware');

// Middleware pour vérifier si c'est un Admin ou IT
const isAdmin = (req, res, next) => {
    if (['Admin', 'IT'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: "Action réservée aux administrateurs" });
    }
};

router.use(authMiddleware);
router.use(isAdmin);

// Routes
router.get('/user/:userId', utPermController.getPermissionsByUser);
router.post('/assign', utPermController.assignOrUpdatePermission);
router.delete('/revoke/:userId/:permId', utPermController.revokePermission);

module.exports = router;