const express = require('express');
const StockService = require('../services/stock.service');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const data = await StockService.getAll();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Erreur stock MySQL', error: error.message });
    }
});

router.get('/list-familles', async (req, res) => {
    try {
        const data = await StockService.getFamilles();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Erreur filtrage famille', error: error.message });
    }
});

router.get('/colonnes', async (req, res) => {
    try {
        const data = await StockService.getColonnes();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Erreur colonnes stock', error: error.message });
    }
});

module.exports = router;
