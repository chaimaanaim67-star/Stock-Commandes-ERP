const mouvement = require('../models/mouvement');

class mouvementService {
    /**
     * Liste tous les mouvements en fonction du rôle 
     */
    async listAll(role) {
        try {
            return await mouvement.manageMouvement('getAll', null, role);
        } catch (error) {
            throw new Error("Service Error (listAll): " + error.message);
        }
    }

    /**
     * Trouve un mouvement par son ID
     */
    async findById(id, role) {
        try {
            return await mouvement.manageMouvement('getById', null, role, id);
        } catch (error) {
            throw new Error("Service Error (findById): " + error.message);
        }
    }

    /**
     * Ajoute un mouvement (Entrée/Sortie) et synchronise avec SYSPROGRESS
     * @param {Object} data - Doit contenir id_produit, num_colis, quantite, type_mouvement
     */
    async add(data, role) {
        try {
            // Transaction mouvement + mise à jour stock MySQL
            return await mouvement.manageMouvement('create', data, role);
        } catch (error) {
            // Kat-ferqi bin erreur d'accès o erreur technique
            if (error.message.includes('Accès refusé')) {
                throw error;
            }
            throw new Error("Service Error (add): " + error.message);
        }
    }

    /**
     * Supprime un mouvement (uniquement pour Admin/IT)
     */
    async remove(id, role) {
        try {
            return await mouvement.manageMouvement('delete', null, role, id);
        } catch (error) {
            throw new Error("Service Error (remove): " + error.message);
        }
    }
}

// Export d'une instance pour garder le même style que ton code initial
module.exports = new mouvementService();