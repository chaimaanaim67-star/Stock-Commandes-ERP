const express = require('express');
const router = express.Router();
const pModeleController = require('../controllers/PModele.controller');



// 1. Liste des modèles (MySQL)
router.get('/all', pModeleController.getAllModeles); 

// 2. Njibu la configuration d'une famille (Lignes/Colonnes) - Mn MySQL
router.get('/config/:id_modele', pModeleController.getModeleConfig);

// 3. Valeurs DISTINCT d'une colonne stock (MySQL)
// Exemple: /api/p_modele/distinct?columnName=ESSENCE
router.get('/distinct', pModeleController.getDistinctVarianteValues);

// 4. Ajouter un paramètre à la config - MySQL
router.post('/add', pModeleController.addParamToModele);

// 5. Supprimer un paramètre de la config - MySQL
router.delete('/delete/:id_p_modele', pModeleController.deleteParamFromConfig);

// 6. Remplacer toute la configuration (zones Filtres / Lignes / Colonnes / Valeurs)
router.put('/config/:id_modele', pModeleController.replaceModeleConfig);
 router.get(
  '/modele/:id_modele',
  pModeleController.getByModeleId
); 
module.exports = router;