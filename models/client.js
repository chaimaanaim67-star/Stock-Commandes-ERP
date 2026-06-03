const db = require('../db');

class client {
    constructor(id_client, code_client, nom_client, email, adresse, ville, date_creation) {
        this.id_client = id_client;
        this.code_client = code_client;
        this.nom_client = nom_client;
        this.email = email;
        this.adresse = adresse;
        this.ville = ville;
        this.date_creation = date_creation;
    }

    // Gestion de Role (Nefss l-mantiq dial Produit)
    static async manageClient(action, data, userRole, id_client = null) {
        // L-Commercial hta hwa 3ndou l-7eq i-chouf o i-zid les clients
        const authorizedRoles = ['Admin', 'IT', 'Commercial', 'Directeur'];
        
        if (!authorizedRoles.includes(userRole)) {
            throw new Error('Accès refusé : Vous n’avez pas les permissions nécessaires');
        }

        switch (action) {
            case 'getAll':
                return await this.getAll();

            case 'getById':
                if (!id_client) throw new Error('ID Client manquant');
                return await this.getById(id_client);

            case 'create':
                return await this.create(data);

            case 'update':
                if (!id_client) throw new Error('ID Client manquant');
                return await this.update(id_client, data);

            case 'delete':
                // Ghir l-Admin o IT li i-9drou i-ms7ou client
                if (!['Admin', 'IT'].includes(userRole)) {
                    throw new Error('Suppression non autorisée pour votre rôle');
                }
                return await this.delete(id_client);

            default:
                throw new Error('Action non reconnue');
        }
    }

    // --- CRUD METHODS ---

    static async getAll() {
        try {
            const [rows] = await db.query('SELECT * FROM client ORDER BY date_creation DESC');
            return rows;
        } catch (error) {
            throw new Error('Database Error: ' + error.message);
        }
    }

    static async getById(id) {
        try {
            const [rows] = await db.query('SELECT * FROM client WHERE id_client = ?', [id]);
            if (rows.length === 0) throw new Error('Client introuvable');
            return rows[0];
        } catch (error) {
            throw new Error('Database Error: ' + error.message);
        }
    }

    static async create(data) {
        const { code_client, nom_client, email, adresse, ville } = data;
        try {
            if (!code_client || !nom_client) {
                throw new Error('Code client et Nom client sont obligatoires');
            }

            const query = `INSERT INTO client (code_client, nom_client, email, adresse, ville) 
                           VALUES (?, ?, ?, ?, ?)`;
            const values = [code_client, nom_client, email || null, adresse || null, ville || null];

            const [result] = await db.query(query, values);
            return { id: result.insertId, message: 'Client créé avec succès' };
        } catch (error) {
            throw new Error('Database Error: ' + error.message);
        }
    }

   static async update(id, data) {
    try {
        // 1. Kan-jibou l-client l-qdim bach n-3erfou l-code_client dyalo
        const oldClient = await this.getById(id);

        // 2. Kan-sta3mlou l-data jdida ila kayna, sinon l-qdima
        const query = `
            UPDATE client 
            SET code_client = ?, nom_client = ?, email = ?, adresse = ?, ville = ? 
            WHERE id_client = ?`;
        
        const values = [
            data.code_client || oldClient.code_client,
            data.nom_client || oldClient.nom_client,
            data.email || oldClient.email,
            data.adresse || oldClient.adresse,
            data.ville || oldClient.ville,
            id
        ];

        await db.query(query, values);
        return { message: 'Client mis à jour' };
    } catch (error) {
        throw new Error('Database Error: ' + error.message);
    }
}

    static async delete(id) {
        try {
            await this.getById(id);
            await db.query('DELETE FROM client WHERE id_client = ?', [id]);
            return { message: 'Client supprimé avec succès' };
        } catch (error) {
            throw new Error('Database Error: ' + error.message);
        }
    }
}

module.exports = client;