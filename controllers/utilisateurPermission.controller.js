const utPermService = require('../services/utilisateur_permission.service');

exports.getPermissionsByUser = async (req, res) => {
    try {
        const permissions = await UtPermService.getUserPermissions(req.params.userId);
        res.status(200).json(permissions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.assignOrUpdatePermission = async (req, res) => {
    try {
        const result = await UtPermService.assignPermission(req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.revokePermission = async (req, res) => {
    try {
        const { userId, permId } = req.params;
        const result = await UtPermService.revokePermission(userId, permId);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};