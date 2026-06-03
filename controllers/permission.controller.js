const PermissionService = require('../services/permission.service');

exports.getAllPermissions = async (req, res) => {
    try {
        const permissions = await PermissionService.getAll();
        res.status(200).json(permissions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getPermissionById = async (req, res) => {
    try {
        const permission = await PermissionService.getById(req.params.id);
        res.status(200).json(permission);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};

exports.createPermission = async (req, res) => {
    try {
        // req.user jay mn authMiddleware
        const result = await PermissionService.create(req.body, req.user.id);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updatePermission = async (req, res) => {
    try {
        const result = await PermissionService.update(req.params.id, req.body, req.user.id);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deletePermission = async (req, res) => {
    try {
        const result = await PermissionService.delete(req.params.id);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};