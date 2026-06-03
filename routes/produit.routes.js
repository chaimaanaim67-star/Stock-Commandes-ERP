const express = require("express");
const router = express.Router();
const produitController = require("../controllers/produit.controller");
const auth = require("../middleware/auth.middleware"); 

// --- 1. Stock industriel (table stock MySQL) ---
// Had l-route hwa li kiy-servi d-data dyal l-Pivot Table
// On l'appelle /stock-industriel ou /detailed-stock
router.get("/stock-industriel", auth, produitController.getDetailedStock);


// --- 2. ROUTES POUR LA BASE LOCALE (MYSQL) ---

// Récupérer tous les produits locaux
router.get("/", auth, produitController.getAll);

// Récupérer un produit local par son ID
router.get("/:id", auth, produitController.getById);

// Créer un produit local
router.post("/", auth, produitController.create);

// Modifier un produit local
router.put("/:id", auth, produitController.update);

// Supprimer un produit local
router.delete("/:id", auth, produitController.delete);

module.exports = router;