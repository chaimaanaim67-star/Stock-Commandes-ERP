const PModeleSelectionService =
    require('../services/PModeleSelection.service');

// =====================================================
// GET
// =====================================================

exports.getSelections = async (req, res) => {

    try {

        const { id_modele } = req.params;

        const data =
            await PModeleSelectionService.getSelections(
                id_modele
            );

        res.status(200).json(data);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

// =====================================================
// ADD
// =====================================================

exports.addSelection = async (req, res) => {

    try {

        const id =
            await PModeleSelectionService.addSelection(
                req.body
            );

        res.status(201).json({
            message: 'Sélection ajoutée.',
            id_selection: id
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

// =====================================================
// DELETE
// =====================================================

exports.deleteSelection = async (req, res) => {

    try {

        const { id_selection } = req.params;

        await PModeleSelectionService.deleteSelection(
            id_selection
        );

        res.status(200).json({
            message: 'Sélection supprimée.'
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

// =====================================================
// REPLACE
// =====================================================

exports.replaceSelections = async (req, res) => {

    try {

        const { id_modele } = req.params;

        const { selections } = req.body;

        await PModeleSelectionService.replaceSelections(
            id_modele,
            selections
        );

        res.status(200).json({
            message: 'Sélections enregistrées.'
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};