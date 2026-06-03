const UtilisateurService = require("../services/utilisateur.service");
  
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await UtilisateurService.authenticate(username, password, {
      ip: req.ip || req.headers['x-forwarded-for'] || '',
      userAgent: req.headers['user-agent'] || '',
    });

    if (result && result.user) {
      res.status(200).json({
        token: result.token,
        role: result.user.role, // "user" machi "utilisateur"
        username: result.user.username
      });
    } else {
      res.status(500).json({ message: "Format de réponse invalide du service" });
    }

  } catch (error) {
    res.status(401).json({ message: error.message || "Identifiant ou mot de passe incorrect" });
  }
};


exports.getAllUsers = async (req, res) => {
  try {
    const users = await UtilisateurService.handleUserAction(
      "getAll",
      null,
      req.user.role,
    );
    res.status(200).json(users);
  } catch (error) {
    res.status(403).json({ error: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const created = await UtilisateurService.handleUserAction(
      "create",
      req.body,
      req.user.role,
    );
    const adminService = require('../services/admin.service');
    await adminService.writeAudit({
      id_ut: req.user?.id,
      username: req.user?.username || 'admin',
      action: 'USER_CREATE',
      details: `Création utilisateur ${created?.username || ''} (${created?.role || ''})`,
      ip: req.ip || '',
    });
    res.status(201).json({ ...created, message: "Utilisateur créé" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const result = await UtilisateurService.handleUserAction(
      "update",
      { id: req.params.id, ...req.body },
      req.user.role,
    );
    const adminService = require('../services/admin.service');
    await adminService.writeAudit({
      id_ut: req.user?.id,
      username: req.user?.username || 'admin',
      action: 'USER_UPDATE',
      details: `Modification utilisateur #${req.params.id}`,
      ip: req.ip || '',
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const result = await UtilisateurService.handleUserAction(
      "delete",
      { id: req.params.id },
      req.user.role,
    );
    const adminService = require('../services/admin.service');
    await adminService.writeAudit({
      id_ut: req.user?.id,
      username: req.user?.username || 'admin',
      action: 'USER_DELETE',
      details: `Suppression utilisateur #${req.params.id}`,
      ip: req.ip || '',
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};