const { Server } = require('socket.io');

let io;

const buildCorsOptions = () => ({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true,
});

const initSocket = (httpServer, options = {}) => {
  if (!httpServer) {
    throw new Error('HTTP server instance is required for Socket.io');
  }

  io = new Server(httpServer, {
    cors: buildCorsOptions(),
    ...options,
  });

  io.on('connection', (socket) => {
    socket.on('identify', (userId) => {
      if (!userId) {
        return;
      }

      socket.data.userId = String(userId);
      socket.join(socket.data.userId);
    });

    socket.on('chat:message', (payload) => {
      const toUserId = payload?.toUserId;
      const message = payload?.message;

      if (!toUserId || !message) {
        return;
      }

      io.to(String(toUserId)).emit('chat:message', {
        fromUserId: socket.data.userId || null,
        message,
        createdAt: new Date().toISOString(),
      });
    });
  });

  return io;
};

const getSocket = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }

  return io;
};

module.exports = {
  initSocket,
  getSocket,
};
