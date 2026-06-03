const PModele = require('../models/PModele');

/**
 * 1. Récupérer tous les modèles (MySQL)
 * Kat-jib l-list dyal les familles bach i-bano l-boutonnat
 */


exports.getByModeleId = async (req, res) => {

  try {

    const { id_modele } = req.params;

    const data = await PModele.getByModeleId(id_modele);

    res.json(data);

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: err.message
    });

  }

};
exports.getAllModeles = async (req, res) => {
    try {
        const modeles = await PModele.getAll(); 
        
        if (!modeles) {
            return res.status(200).json([]);
        }

        res.status(200).json(modeles);
    } catch (error) {
        console.error('❌ Erreur getAllModeles:', error);
        res.status(500).json({
            message: 'Erreur lors de la récupération des modèles',
            error: error.message 
        });
    }
};

/**
 * 2. Ajouter une variante (Ghaliban f MySQL)
 * Fach t-zidi chi config jdida l-interface dyalk
 */
exports.addParamToModele = async (req, res) => {
    try {
        const { id_modele, variante, position, ordre } = req.body;

        if (!id_modele || !variante || !position) {
            return res.status(400).json({ message: "S'il vous plaît, remplissez tous les champs obligatoires." });
        }

        const id_param = await PModele.addParam(id_modele, variante, position, ordre || 1);
        
        res.status(201).json({
            message: "Paramètre ajouté avec succès dans la config !",
            id_p_modele: id_param
        });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de l'ajout du paramètre", error: error.message });
    }
};

/**
 * 3. Récupérer la configuration d'un modèle (MySQL)
 */
exports.getModeleConfig = async (req, res) => {
    try {
        const { id_modele } = req.params;
        const [details, selections] = await Promise.all([
            PModele.getByModeleId(id_modele),
            PModele.getSelectionsByModeleId(id_modele)
        ]);

        res.status(200).json({
            details: details || [],
            selections: selections || PModele.emptySelections()
        });
    } catch (error) {
        res.status(500).json({ message: "Erreur serveur config", error: error.message });
    }
};

/**
 * 4. Supprimer un paramètre
 */
exports.deleteParamFromConfig = async (req, res) => {
    try {
        const { id_p_modele } = req.params;
        await PModele.deleteParam(id_p_modele);
        
        res.status(200).json({ message: "Paramètre supprimé avec succès." });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la suppression", error: error.message });
    }
};

/** Remplacer toute la configuration pivot d'un modèle */
exports.replaceModeleConfig = async (req, res) => {
    try {
        const { id_modele } = req.params;
        const { details, selections } = req.body;

        if (!id_modele) {
            return res.status(400).json({ message: 'id_modele requis.' });
        }

        const id = Number(id_modele);

        const detailsArray = Array.isArray(details) ? details : [];
        const selectionsObj =
            selections && typeof selections === 'object'
                ? selections
                : PModele.emptySelections();

        const hasSelections = ['filters', 'rows', 'columns'].some((zone) => {
            const fields = selectionsObj[zone];
            return (
                fields &&
                typeof fields === 'object' &&
                Object.keys(fields).length > 0
            );
        });

        // Ne pas effacer p_modele si le front envoie details=[] par erreur (race auto-save)
        if (detailsArray.length > 0) {
            await PModele.replaceConfig(id, detailsArray);
        } else if (!hasSelections) {
            await PModele.replaceConfig(id, []);
        }

        await PModele.replaceSelections(
            id,
            selections && typeof selections === 'object'
                ? selections
                : PModele.emptySelections()
        );

        res.status(200).json({
            message: 'Configuration enregistrée.',
            id_modele: id
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur enregistrement configuration', error: error.message });
    }
};

/**
 * 5. Valeurs DISTINCT depuis la table stock (MySQL)
 * Kat-jib l-valeurs bhal (ESSENCE: BOIS ROUGE, CHENE...)
 */
exports.getDistinctVarianteValues = async (req, res) => {
    try {
        const { columnName } = req.query; 
        if (!columnName) {
            return res.status(400).json({ message: "Le nom de la colonne est requis." });
        }

        const values = await PModele.getDistinctValues(columnName);
        
        res.status(200).json(values);
    } catch (error) {
        console.error('❌ Erreur Distinct Values:', error);
        res.status(500).json({
            message: 'Erreur lors de la récupération des valeurs stock',
            error: error.message 
        });
    }
};