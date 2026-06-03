const { Server } = require("socket.io");
const { verifyToken } = require("../utils/jwt");

let io;

const initWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error"));
    }

    try {
      const decoded = verifyToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join stock room for real-time stock updates
    socket.join("stock-updates");

    // Join commercial room for real-time commercial updates
    socket.join("commercial-updates");

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
};

// Broadcast stock update to all connected clients
const broadcastStockUpdate = (data) => {
  if (io) {
    io.to("stock-updates").emit("stock-update", data);
  }
};

// Broadcast commercial update to all connected clients
const broadcastCommercialUpdate = (data) => {
  if (io) {
    io.to("commercial-updates").emit("commercial-update", data);
  }
};

// Broadcast notification to specific user
const sendNotification = (userId, notification) => {
  if (io) {
    io.to(`user-${userId}`).emit("notification", notification);
  }
};

module.exports = {
  initWebSocket,
  getIO,
  broadcastStockUpdate,
  broadcastCommercialUpdate,
  sendNotification,
};
