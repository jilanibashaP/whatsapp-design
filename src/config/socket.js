const { Server } = require('socket.io');
const { SOCKET_EVENTS } = require('../constants');
const logger = require('../utils/logger');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: '*' },
    connectTimeout: 45000, // 45 second timeout
    pingTimeout: 30000,    // 30 second ping timeout
    pingInterval: 10000    // ping every 10 seconds
  });

  io.on('connection', (socket) => {
    logger.info('Socket connected:', socket.id);

    // Message event
    socket.on(SOCKET_EVENTS.MESSAGE, (payload) => {
      logger.info('Message received:', { socketId: socket.id });
      socket.broadcast.emit(SOCKET_EVENTS.MESSAGE, payload);
    });

    // Ping event
    socket.on(SOCKET_EVENTS.PING, () => {
      logger.info('Ping received:', { socketId: socket.id });
    });

    // Error event
    socket.on('error', (error) => {
      logger.error('Socket error:', {
        id: socket.id,
        error: error.message
      });
    });

    // Disconnection event
    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected:', {
        id: socket.id,
        reason
      });
    });
  });
}

function getIo() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIo };
