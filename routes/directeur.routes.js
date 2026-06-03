const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const DirecteurController = require('../controllers/directeur.controller');

router.use(authMiddleware);

router.get('/bi', DirecteurController.getDashboard);

module.exports = router;
