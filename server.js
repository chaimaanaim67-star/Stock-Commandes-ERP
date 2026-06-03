const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const utilisateurRoutes = require('./routes/utilisateur.routes');
const permissionRoutes = require('./routes/permission.routes');
const userPermRoutes = require('./routes/utilisateurPermission.routes');
const produitRoutes = require('./routes/produit.routes');
const PModeleRoutes = require('./routes/PModele.routes');
const modeleRoutes = require('./routes/modele.routes');
const mouvementRoutes = require('./routes/mouvement.routes');
const commercialRoutes = require('./routes/commercial.routes');
const directeurRoutes = require('./routes/directeur.routes');
const adminRoutes = require('./routes/admin.routes');
const stockRoutes = require('./routes/stock.routes');
const authMiddleware = require('./middleware/auth.middleware');
const { CommercialController, StockController } = require('./controllers/commercial.controller');
const { initWebSocket, broadcastStockUpdate, broadcastCommercialUpdate } = require('./websocket/socketServer');

const app = express();
const server = http.createServer(app);
const io = initWebSocket(server);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/users', utilisateurRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/user-permissions', userPermRoutes);
app.use('/api/produit', produitRoutes);
app.use('/api/p_modele', PModeleRoutes);
app.use('/api/modele', modeleRoutes);
app.use('/api/modeles', modeleRoutes);
app.use('/mouvements', mouvementRoutes);
app.use('/api/mouvements', mouvementRoutes);
app.use('/api/commercial', commercialRoutes);
app.use('/api/directeur', directeurRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stock', stockRoutes);
app.post('/api/commandes', authMiddleware, CommercialController.postCommande);

app.get('/', (req, res) => {
    res.send('🚀 Serveur Ismawood (MySQL) opérationnel !');
});

app.use((req, res) => {
    res.status(404).json({ message: 'Route non trouvée.' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('🔌 Client connecté:', socket.id);

    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`📡 Socket ${socket.id} rejoint la room: ${room}`);
    });

    socket.on('leave-room', (room) => {
        socket.leave(room);
        console.log(`📡 Socket ${socket.id} a quitté la room: ${room}`);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Client déconnecté:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`
    🚀===================================================🚀
       SERVEUR ISMAWOOD LANCÉ : http://localhost:${PORT}
       SOURCE : MySQL — table produit (pivot, stock, commercial)
       SOCKET.IO : Activé
    🚀===================================================🚀
    `);
});
