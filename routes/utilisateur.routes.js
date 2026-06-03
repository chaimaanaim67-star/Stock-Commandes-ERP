const express = require('express');
const router = express.Router();
const utilisateurController = require('../controllers/utilisateur.controller');
const authMiddleware = require('../middleware/auth.middleware'); 

// Route publique (Login)
router.post('/login', utilisateurController.login);

// Routes protégées (Admin/IT seulement)
router.get('/', authMiddleware, utilisateurController.getAllUsers);
router.post('/create', authMiddleware, utilisateurController.createUser);
router.put('/:id', authMiddleware, utilisateurController.updateUser);
router.delete('/:id', authMiddleware, utilisateurController.deleteUser);

module.exports = router;