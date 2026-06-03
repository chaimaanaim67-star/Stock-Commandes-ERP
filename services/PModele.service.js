const PModele = require('../models/PModele');

class PModeleService {
    /**
     * 1. Liste des modèles (MySQL)
     */
    static async getAllModeles() {
        try {
            const modeles = await PModele.getAll();
            if (!modeles || modeles.length === 0) {
                return [];
            }
            return modeles.map(m => ({
                id_modele: m.id_modele,
                nom_modele: (m.nom_modele || '').trim()
            }));
        } catch (error) {
            throw new Error("Erreur Service (getAll): " + error.message);
        }
    }

    /**
     * 2. Njibu l-config dyal un modèle mn MySQL
     * Kat-rjje3 l-variantes m-organiséyin (L/C) bach n-rasmou l-tableau
     */
    static async getConfiguration(id_modele) {
        try {
            const config = await PModele.getByModeleId(id_modele);
            if (!config || config.length === 0) {
                return [];
            }
            return config;
        } catch (error) {
            throw new Error("Erreur Service (Config): " + error.message);
        }
    }

    /**
     * 3. Ajouter un paramètre (Variante) f MySQL
     * Hna k-n-طبقو l-logic dyal 'L' (Ligne) o 'C' (Colonne)
     */
    static async addNewParam(data) {
        try {
            const { id_modele, variante, position, ordre } = data;
            
            // Validation: l-position khass t-koun dima 'L' aw 'C'
            const validPositions = ['L', 'C'];
            if (!position || !validPositions.includes(position.toUpperCase())) {
                throw new Error("La position doit être soit 'L' (Ligne) soit 'C' (Colonne).");
            }

            return await PModele.addParam(
                id_modele, 
                variante, 
                position.toUpperCase(), 
                ordre || 1
            );
        } catch (error) {
            throw new Error("Erreur Service (AddParam): " + error.message);
        }
    }

    /**
     * 4. Valeurs DISTINCT (table stock MySQL)
     * Bach n-3mrou l-headers dyal l-tableau dynamique (ESS, MRQ...)
     */
    static async getUniqueValues(columnName) {
        try {
            const values = await PModele.getDistinctValues(columnName);
            
            if (!values || !Array.isArray(values)) return [];

            // Nettoyage dyal d-data: n-7iyedo null, n-7iyedo les espaces, o n-rttbohom
            return [...new Set(values)] // 7iyed l-m3awdin
                .filter(v => v !== null && v !== undefined && String(v).trim() !== '')
                .map(v => String(v).trim())
                .sort((a, b) => a.localeCompare(b)); // Tri alphabétique
        } catch (error) {
            throw new Error("Erreur Service (UniqueValues): " + error.message);
        }
    }

    /**
     * 5. Supprimer un paramètre mn MySQL
     */
    static async removeParam(id_p_modele) {
        try {
            return await PModele.deleteParam(id_p_modele);
        } catch (error) {
            throw new Error("Erreur Service (Delete): " + error.message);
        }
    }
}

module.exports = PModeleService;