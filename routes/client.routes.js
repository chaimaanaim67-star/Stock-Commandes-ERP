const express = require('express');
const router = express.Router();
const produitController = require('../controllers/produit.controller');
const { protect } = require('../middleware/auth.middleware'); 

router.use(protect);

router.get('/', produitController.getAll);           
router.get('/:id', produitController.getById);      
router.post('/', produitController.create);        
router.put('/:id', produitController.update);       
router.delete('/:id', produitController.delete);    

module.exports = router;
