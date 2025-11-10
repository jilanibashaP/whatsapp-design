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

    // IMPORTANT: For testing/development, userId is hardcoded to 3
    // In production, client should send authentication token
    // For now, auto-authenticate with hardcoded user ID
    const userId = 12;
    
    // Directly call the authentication handler to mark user online
    process.nextTick(async () => {
      await handleUserAuthenticated(socket, io, userId);
    });
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
