const adminService = require('../services/admin.service');
const PasswordPolicy = require('../utils/passwordPolicy');
const TwoFactorAuth = require('../utils/twoFactorAuth');
const Utilisateur = require('../models/utilisateur');

function isAdminRole(role) {
  return ['admin', 'it'].includes(String(role || '').toLowerCase());
}

exports.getOverview = async (req, res) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const data = await adminService.getOverview();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getPresence = async (req, res) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const rows = await adminService.listPresence();
    res.status(200).json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const rows = await adminService.listAuditLogs(req.query.limit);
    res.status(200).json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.heartbeat = async (req, res) => {
  try {
    const id = req.user?.id;
    if (!id) return res.status(401).json({ error: 'Non authentifié' });
    await adminService.touchPresence(
      id,
      req.ip || req.headers['x-forwarded-for'] || '',
      req.headers['user-agent'] || ''
    );
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.forceLogout = async (req, res) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID invalide' });
    const result = await adminService.forceLogoutUser(id, req.user?.username || 'admin');
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.clearCache = async (req, res) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const result = await adminService.clearAppCache();
    await adminService.writeAudit({
      id_ut: req.user?.id,
      username: req.user?.username || 'admin',
      action: 'CACHE_CLEAR',
      details: 'Cache applicatif vidé manuellement',
      ip: req.ip || '',
    });
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getRolePermissions = async (req, res) => {
  res.status(200).json({
    roles: [
      {
        role: 'Commercial',
        pages: ['Ventes / Commercial', 'Clients'],
        description: 'Accès ventes et catalogue commercial uniquement.',
      },
      {
        role: 'stock',
        pages: ['État de stock', 'Mouvements'],
        description: 'Indicateurs et mouvements de stock.',
      },
      {
        role: 'Directeur',
        pages: ['Analyses', 'Rapports', 'Vue globale BI'],
        description: 'Tableaux de bord et exports direction.',
      },
      {
        role: 'Admin',
        pages: ['Toutes les pages', 'Gestion utilisateurs'],
        description: 'Administration complète plateforme.',
      },
    ],
  });
};

exports.getAnalytics = async (req, res) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const data = await adminService.getAnalyticsData();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.getSystemHealth = async (req, res) => {
  try {
    if (!isAdminRole(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const data = await adminService.getSystemHealth();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.checkPasswordStrength = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Mot de passe requis' });
    }

    const validation = PasswordPolicy.validate(password);
    const strength = PasswordPolicy.getPasswordStrength(password);

    res.status(200).json({
      valid: validation.valid,
      errors: validation.errors,
      strength,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.generatePassword = async (req, res) => {
  try {
    const { length = 16 } = req.body;
    const password = PasswordPolicy.generatePassword(length);
    const strength = PasswordPolicy.getPasswordStrength(password);

    res.status(200).json({
      password,
      strength,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.setupTwoFactor = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { secret, otpauth_url } = TwoFactorAuth.generateSecret(req.user?.username || 'user');
    const qrCode = await TwoFactorAuth.generateQRCode(otpauth_url);
    const backupCodes = TwoFactorAuth.generateBackupCodes();

    // Hash backup codes for storage
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => TwoFactorAuth.hashBackupCode(code))
    );

    // Store the secret temporarily (not enabled yet until verified)
    await Utilisateur.update(userId, {
      two_fa_secret: secret,
      two_fa_backup_codes: JSON.stringify(hashedBackupCodes),
    });

    res.status(200).json({
      secret,
      qrCode,
      backupCodes,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.verifyAndEnableTwoFactor = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token requis' });

    const user = await Utilisateur.getById(userId);
    if (!user || !user.two_fa_secret) {
      return res.status(400).json({ error: '2FA non configuré' });
    }

    const isValid = TwoFactorAuth.verifyToken(user.two_fa_secret, token);
    if (!isValid) {
      return res.status(400).json({ error: 'Token invalide' });
    }

    // Enable 2FA
    await Utilisateur.update(userId, { two_fa_enabled: 1 });

    await adminService.writeAudit({
      id_ut: userId,
      username: req.user?.username || 'user',
      action: '2FA_ENABLED',
      details: '2FA activé pour le compte',
      ip: req.ip || '',
    });

    res.status(200).json({ message: '2FA activé avec succès' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.disableTwoFactor = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Mot de passe requis' });

    // Verify password before disabling 2FA
    const user = await Utilisateur.getById(userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const { comparePassword } = require('../utils/hachmotdepasse');
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Mot de passe incorrect' });
    }

    // Disable 2FA
    await Utilisateur.update(userId, {
      two_fa_enabled: 0,
      two_fa_secret: null,
      two_fa_backup_codes: null,
    });

    await adminService.writeAudit({
      id_ut: userId,
      username: req.user?.username || 'user',
      action: '2FA_DISABLED',
      details: '2FA désactivé pour le compte',
      ip: req.ip || '',
    });

    res.status(200).json({ message: '2FA désactivé avec succès' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
