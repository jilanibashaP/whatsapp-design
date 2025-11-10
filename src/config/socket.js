const { Server } = require('socket.io');
const { SOCKET_EVENTS } = require('../constants');
const logger = require('../utils/logger');
const { registerPresenceHandlers, isUserOnline, getActiveUsersCount, handleUserAuthenticated } = require('../sockets/presence.socket');
const { registerMessageHandlers } = require('../sockets/message.socket');

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

    // Register presence event handlers
    registerPresenceHandlers(socket, io);

    // Register message event handlers
    registerMessageHandlers(socket, io);

    // Client should authenticate by sending 'user_authenticated' event with userId
    // Example from client: socket.emit('user_authenticated', userId)
    logger.info('Waiting for user authentication...');
  });

  // Add helper functions to io instance
  io.isUserOnline = isUserOnline;
  io.getActiveUsersCount = getActiveUsersCount;
}

function getIo() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

module.exports = { initSocket, getIo };
