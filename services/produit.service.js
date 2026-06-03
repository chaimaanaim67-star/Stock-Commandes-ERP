const produit = require('../models/produit');

class produitService {

    static async getDetailedStock(famille) {
        return produit.getDetailedStockProgress(famille);
    }

    static async getAll() {
        const rawData = await produit.getAll();
        return rawData.map((item) => ({
            id_produit: item.id_produit,
            depot: item.depot,
            colis: item.num_colis,
            num_colis: item.num_colis,
            produit: item.designation,
            designation: item.designation,
            lot: item.num_lot_reception,
            codePro: item.num_produit,
            quantite: item.quantite,
            nbColis: item.nbr_colis,
            volume_m3: item.m3,
            surface_m2: item.m2,
            lineaire_ml: item.ml,
            epaisseur: item.epaisseur,
            largeur: item.largeur,
            longueur: item.longueur,
            essence: item.essence,
            marque: item.marque,
            qualite: item.qualite,
            dateStock: item.date_stock,
            reference: item.num_colis,
        }));
    }

    static async getById(id) {
        return produit.getById(id);
    }

    static async create(data) {
        return produit.create(data);
    }

    static async update(id, data) {
        return produit.update(id, data);
    }

    static async delete(id) {
        return produit.delete(id);
    }
}

module.exports = produitService;
