const mouvement = require('../models/mouvement');

class mouvementController {

    /**
     * GET ALL: Récupérer l'historique des mouvements (Traçabilité MySQL)
     */
    static async getAll(req, res, next) {
        try {
            const userRole = req.user?.role;
            const mouvements = await mouvement.manageMouvement('getAll', null, userRole);
            res.status(200).json(mouvements);
        } catch (error) {
            console.error("❌ Controller GetAll Error:", error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * GET BY ID: Détails d'un mouvement spécifique
     */
    static async getById(req, res, next) {
        try {
            const { id } = req.params;
            const userRole = req.user?.role;

            const row = await mouvement.manageMouvement('getById', null, userRole, id);
            res.status(200).json(row);
        } catch (error) {
            console.error(`❌ Controller GetById Error (ID: ${req.params.id}):`, error.message);
            res.status(404).json({ success: false, error: error.message });
        }
    }

    /**
     * CREATE: Enregistrement mouvement + mise à jour stock MySQL
     */
    static async create(req, res, next) {
        try {
            const userRole = req.user?.role;
            const data = req.body;

            // Le Model gère mouvement + stock MySQL
            const result = await mouvement.manageMouvement('create', data, userRole);
            res.status(201).json({ success: true, data: result });
        } catch (error) {
            console.error("❌ Controller Create Error:", error.message);
            // Gestion de l'accès refusé ou erreur technique
            const status = error.message.includes('Accès refusé') ? 403 : 400;
            res.status(status).json({ success: false, error: error.message });
        }
    }

    static async update(req, res, next) {
        try {
            const userRole = req.user?.role;
            const { id } = req.params;
            const data = req.body;
            const result = await mouvement.manageMouvement('update', data, userRole, id);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            console.error('❌ Controller Update Error:', error.message);
            const status = error.message.includes('Accès refusé') ? 403 : 400;
            res.status(status).json({ success: false, error: error.message });
        }
    }

    /**
     * DELETE: Suppression d'un mouvement (Uniquement Admin/IT pour la sécurité)
     */
    static async delete(req, res, next) {
        try {
            const { id } = req.params;
            const userRole = req.user?.role;

            const result = await mouvement.manageMouvement('delete', null, userRole, id);
            res.status(200).json({ success: true, message: result.message });
        } catch (error) {
            console.error(`❌ Controller Delete Error (ID: ${req.params.id}):`, error.message);
            res.status(403).json({ success: false, error: error.message });
        }
    }
}

module.exports = mouvementController;