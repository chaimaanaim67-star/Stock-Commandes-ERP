// routes/modele.routes.js
const express = require('express');
const router = express.Router();
const modeleController = require('../controllers/modele.controller');

// Line 6 ghaliban hiya hadi. T-akkdi mn smiya:
router.get('/dynamic-stock/:id_modele', modeleController.getDynamicPivotStock);

router.get('/all', modeleController.getAllModeles);
router.get('/:id_modele', modeleController.getModeleById);

router.post('/', modeleController.createModele);
router.put('/:id_modele', modeleController.updateModele);
router.delete('/:id_modele', modeleController.deleteModele);

module.exports = router;