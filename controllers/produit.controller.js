const produitService = require('../services/produit.service');

class produitController {
  
  /**
   * JEDID: getDetailedStock
   * Hada hwa li ghadi i-rjje3 d-data m-formatiya bach t-khdem f Pivot Table (Ismawood)
   */
  static async getDetailedStock(req, res, next) {
    try {
      const { famille } = req.query;
      const data = await produitService.getDetailedStock(famille);

      // Mapping dyal l-colonnes bach d-data t-welli Objects n9iyyin
      const columns = [
        "depot", "num_colis", "nom_pro", "typ_lig", "num_lot", "dat_stock", "qte", 
        "cod_pro", "nb_colis", "m3", "m2", "ml", "EPA", "LAR", "LON", "CIR", 
        "DIA", "section", "dimensionElL", "PYO", "MRQ", "QAL", "ESS", "EMB", 
        "SEC", "FNT", "TYP", "PLC", "JNT", "FAC", "CFA", "dimensionLlE", "val", "stat"
      ];

      // Transform mn format [ [val1, val2], ... ] l- format [ {depot: val1, m3: val2}, ... ]
      const formattedData = data.map(row => {
        let obj = {};
        columns.forEach((col, i) => {
          obj[col] = row[i];
        });
        return obj;
      });

      res.status(200).json(formattedData);
    } catch (error) {
      console.error("❌ Controller getDetailedStock Error:", error.message);
      next(error);
    }
  }

  /**
   * GET ALL: produits locaux MySQL
   */
  static async getAll(req, res, next) {
    try {
      const produits = await produitService.getAll();
      res.status(200).json(produits);
    } catch (error) {
      console.error("❌ Controller GetAll Error:", error.message);
      next(error);
    }
  }

  /**
   * GET BY ID: Récupère un produit spécifique
   * Produit MySQL + ligne stock associée si présente.
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const produit = await produitService.getById(id);
      res.status(200).json(produit);
    } catch (error) {
      console.error(`❌ Controller GetById Error (ID: ${req.params.id}):`, error.message);
      next(error);
    }
  }

  /**
   * CREATE: Crée un produit dans MySQL.
   */
  static async create(req, res, next) {
    try {
      const created = await produitService.create(req.body);
      res.status(201).json(created);
    } catch (error) {
      console.error("❌ Controller Create Error:", error.message);
      next(error);
    }
  }

  /**
   * UPDATE: Modifie les informations dans les deux bases de données.
   */
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const updated = await produitService.update(id, req.body);
      res.status(200).json(updated);
    } catch (error) {
      console.error(`❌ Controller Update Error (ID: ${req.params.id}):`, error.message);
      next(error);
    }
  }

  /**
   * DELETE: Supprime le produit de MySQL.
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await produitService.delete(id);
      res.status(200).json(result);
    } catch (error) {
      console.error(`❌ Controller Delete Error (ID: ${req.params.id}):`, error.message);
      next(error);
    }
  }
}

module.exports = produitController;