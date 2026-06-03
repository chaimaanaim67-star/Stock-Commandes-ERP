const directeurBI = require('../services/directeurBI.service');

class DirecteurController {
  static async getDashboard(req, res) {
    try {
      const role = String(req.user?.role || '').toLowerCase();
      if (!['directeur', 'admin', 'it'].includes(role)) {
        return res.status(403).json({ error: 'Accès réservé à la direction.' });
      }
      const data = await directeurBI.getFullDashboard();
      res.json(data);
    } catch (e) {
      console.error('Directeur BI:', e);
      res.status(500).json({ error: e.message || 'Erreur agrégation BI' });
    }
  }
}

module.exports = DirecteurController;
