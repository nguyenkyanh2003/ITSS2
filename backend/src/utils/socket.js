const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { buildCorsOptions } = require('./cors');

let io;

const initSocket = (httpServer, options = {}) => {
  if (!httpServer) {
    throw new Error('HTTP server instance is required for Socket.io');
  }

  io = new Server(httpServer, {
    cors: {
      ...buildCorsOptions(),
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
    ...options,
  });

  // Verify JWT on every socket connection — client must pass token in handshake auth
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || '').replace(/^Bearer\s+/i, '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = String(decoded.id);
      return next();
    } catch {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // Join a room named after the verified user ID so messages can be targeted
    socket.join(socket.data.userId);

    socket.on('chat:message', (payload) => {
      const toUserId = payload?.toUserId;
      const message = payload?.message;

      if (!toUserId || !message) {
        return;
      }

      io.to(String(toUserId)).emit('chat:message', {
        fromUserId: socket.data.userId,
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
