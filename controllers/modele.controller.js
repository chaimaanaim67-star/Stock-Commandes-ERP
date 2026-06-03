const PModele = require('../models/PModele'); 
const Modele = require('../models/modele');   
const ModeleService = require('../services/modele.service'); // Zidi hada darouri!

/**
 * 1. Njibu l-data dyal l-stock pivoté (Lignes/Colonnes)
 * HADI HIYA LI KANT NAQSA O KAT-DIR L-ERROR
 */
exports.getDynamicPivotStock = async (req, res) => {
    try {
        const { id_modele } = req.params;
        // K-n-3ayto l-Service li fih l-logic d l-Pivot
        const pivotData = await ModeleService.getPivotStockData(id_modele);
        res.status(200).json(pivotData);
    } catch (error) {
        console.error("❌ Erreur getDynamicPivotStock:", error.message);
        res.status(500).json({ message: "Erreur lors du calcul du pivot", error: error.message });
    }
};

/**
 * 2. Liste des modèles (MySQL)
 */
exports.getAllModeles = async (req, res) => {
    try {
        const families = await Modele.getAll();
        res.status(200).json(families || []);
    } catch (error) {
        console.error("❌ Erreur getAllModeles:", error.message);
        res.status(500).json({ message: "Erreur familles", error: error.message });
    }
};

/** Créer un modèle (MySQL) */
exports.createModele = async (req, res) => {
    try {
        const { nom_modele, unite } = req.body;
        if (!nom_modele || !String(nom_modele).trim()) {
            return res.status(400).json({ message: "Le nom du modèle est obligatoire." });
        }
        const created = await Modele.create(String(nom_modele).trim(), unite || 'm³');
        res.status(201).json(created);
    } catch (error) {
        res.status(500).json({ message: error.message || "Erreur création" });
    }
};

/** Détail d'un modèle */
exports.getModeleById = async (req, res) => {
    try {
        const { id_modele } = req.params;
        const m = await Modele.getById(id_modele);
        if (!m) return res.status(404).json({ message: "Modèle introuvable." });
        res.status(200).json(m);
    } catch (error) {
        res.status(500).json({ message: error.message || "Erreur lecture" });
    }
};

/** Mettre à jour un modèle */
exports.updateModele = async (req, res) => {
    try {
        const { id_modele } = req.params;
        const { nom_modele, unite } = req.body;
        if (!nom_modele || !String(nom_modele).trim()) {
            return res.status(400).json({ message: "Le nom du modèle est obligatoire." });
        }
        const ok = await Modele.update(Number(id_modele), String(nom_modele).trim(), unite || 'm³');
        if (!ok) return res.status(404).json({ message: "Modèle introuvable." });
        res.status(200).json({ message: "Modèle mis à jour.", id_modele: Number(id_modele) });
    } catch (error) {
        res.status(500).json({ message: error.message || "Erreur mise à jour" });
    }
};

/** Supprimer un modèle */
exports.deleteModele = async (req, res) => {
    try {
        const { id_modele } = req.params;
        const ok = await Modele.delete(Number(id_modele));
        if (!ok) return res.status(404).json({ message: "Modèle introuvable." });
        res.status(200).json({ message: "Modèle supprimé." });
    } catch (error) {
        res.status(500).json({ message: error.message || "Erreur suppression" });
    }
};

/**
 * 3. Njibu la configuration dyal un modèle (MySQL)
 */
exports.getModeleConfig = async (req, res) => {
    try {
        const { id_modele } = req.params;
        const config = await PModele.getByModeleId(id_modele);
        res.status(200).json(config || []);
    } catch (error) {
        res.status(500).json({ message: "Erreur config", error: error.message });
    }
};

/**
 * 4. Valeurs DISTINCT colonne stock (MySQL)
 */
exports.getDistinctVarianteValues = async (req, res) => {
    try {
        const { columnName } = req.query; 
        if (!columnName) return res.status(400).json({ message: "Nom colonne requis" });

        const values = await PModele.getDistinctValues(columnName);
        const cleanValues = values.filter(v => v != null).map(v => v.toString().trim());
        res.status(200).json(cleanValues);
    } catch (error) {
        res.status(500).json({ message: "Erreur values", error: error.message });
    }
};

/**
 * 5. Ajouter une variante
 */
exports.addParamToModele = async (req, res) => {
    try {
        const { id_modele, variante, position, ordre } = req.body;
        const id_param = await PModele.addParam(id_modele, variante, position, ordre || 1);
        res.status(201).json({ message: "Ajouté !", id_p_modele: id_param });
    } catch (error) {
        res.status(500).json({ message: "Erreur ajout", error: error.message });
    }
};

/**
 * 6. Supprimer un paramètre
 */
exports.deleteParamFromConfig = async (req, res) => {
    try {
        const { id_p_modele } = req.params;
        await PModele.deleteParam(id_p_modele);
        res.status(200).json({ message: "Supprimé." });
    } catch (error) {
        res.status(500).json({ message: "Erreur suppression", error: error.message });
    }
};