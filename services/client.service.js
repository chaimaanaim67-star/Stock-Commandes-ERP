const client = require('../models/client');

class clientService {

    async listAll(role) {
        return await client.manageClient('getAll', null, role);
    }

    async findById(id, role) {
        return await client.manageClient('getById', null, role, id);
    }

    async add(data, role) {
        return await client.manageClient('create', data, role);
    }

    async edit(id, data, role) {
        return await client.manageClient('update', data, role, id);
    }

    async remove(id, role) {
        return await client.manageClient('delete', null, role, id);
    }
}

module.exports = new clientService();