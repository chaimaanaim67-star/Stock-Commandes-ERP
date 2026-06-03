const express = require('express');
const router = express.Router();
const mouvementController = require('../controllers/mouvement.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', mouvementController.getAll);
router.get('/:id', mouvementController.getById);
router.post('/', mouvementController.create);
router.put('/:id', mouvementController.update);
router.delete('/:id', mouvementController.delete);

module.exports = router;
