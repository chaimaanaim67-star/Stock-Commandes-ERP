const clientService = require('../services/client.service');

exports.getAll = async (req, res) => {
    try {
        const clients = await clientService.listAll(req.user.role);
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getOne = async (req, res) => {
    try {
        const client = await clientService.findById(req.params.id, req.user.role);
        res.json(client);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const result = await clientService.add(req.body, req.user.role);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const result = await clientService.edit(req.params.id, req.body, req.user.role);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const result = await clientService.remove(req.params.id, req.user.role);
        res.json(result);
    } catch (error) {
        res.status(403).json({ error: error.message });
    }
};