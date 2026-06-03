const PModeleSelection =
    require('../models/PModeleSelection');

class PModeleSelectionService {

    // =====================================================
    // GET
    // =====================================================

    static async getSelections(id_modele) {

        return await PModeleSelection.getByModele(
            id_modele
        );

    }

    // =====================================================
    // ADD
    // =====================================================

    static async addSelection(data) {

        const {
            id_modele,
            variante,
            zone_type,
            valeur
        } = data;

        if (
            !id_modele ||
            !variante ||
            !zone_type ||
            !valeur
        ) {

            throw new Error(
                'Tous les champs sont obligatoires.'
            );

        }

        return await PModeleSelection.add(
            id_modele,
            variante,
            zone_type,
            valeur
        );

    }

    // =====================================================
    // DELETE
    // =====================================================

    static async deleteSelection(id_selection) {

        return await PModeleSelection.delete(
            id_selection
        );

    }

    // =====================================================
    // REPLACE
    // =====================================================

    static async replaceSelections(
        id_modele,
        selections
    ) {

        return await PModeleSelection.replaceSelections(
            id_modele,
            selections
        );

    }

}

module.exports = PModeleSelectionService;