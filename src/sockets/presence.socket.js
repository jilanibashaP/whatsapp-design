const presenceService = require('../services/presence.service');
const logger = require('../utils/logger');

// Track active user connections: userId -> Set of socketIds
const userConnections = new Map();

/**
 * Handle user authentication and mark them online
 * Exported so it can be called directly when auto-authenticating
 */
const handleUserAuthenticated = async (socket, io, userId) => {
  console.log("User authenticated for presence:", userId);
  console.log("connections before authenticate:=====>", userConnections);
  try {
    socket.userId = userId;

    // Track connection
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add(socket.id);

    // Update status to online (is_online = true)
    await presenceService.updateUserStatus(userId, true);

    // Notify all contacts that user is online
    const contacts = await presenceService.getUserContacts(userId);
    contacts.forEach(contactId => {
      io.to(`user:${contactId}`).emit('presence_updated', {
        user_id: userId,
        is_online: true,
        last_seen: new Date()
      });
    });
    console.log("connections after authenticate:=====>", userConnections);
    logger.info('User came online:', { userId });
  } catch (error) {
    logger.error('Error updating user presence:', error.message);
  }
};

/**
 * Register presence event handlers on a socket
 */
const registerPresenceHandlers = (socket, io) => {
  // When user is authenticated, mark them as online
  socket.on('user_authenticated', async (userId) => {
    await handleUserAuthenticated(socket, io, userId);
  });

  // Get presence info for multiple users (e.g., for chat list, contact list)
  socket.on('get_presence', async (userIds) => {
    try {
      if (!socket.userId) return;

      const presenceInfo = await presenceService.getBulkUserStatus(userIds);
      socket.emit('presence_info', presenceInfo);
    } catch (error) {
      logger.error('Error getting presence:', error.message);
    }
  });

  // Manual disconnect/logout handler
  socket.on('user_disconnect', async () => {
    console.log(`Manual disconnect triggered by user: ${socket.userId}, socket: ${socket.id}`);
    await handleDisconnect(socket, io);
  });

  // Automatic disconnect handler (when connection is lost)
  socket.on('disconnect', async (reason) => {
    console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    await handleDisconnect(socket, io);
  });
};

/**
 * Handle user disconnect (both manual and automatic)
 */
const handleDisconnect = async (socket, io) => {
  try {
    console.log("connections before disconnect:=====>", userConnections);
    if (!socket.userId) {
      console.log("No userId found on socket, skipping disconnect handling");
      return;
    }

    // Remove this socket from user's connections
    const connections = userConnections.get(socket.userId);
    if (connections) {
      connections.delete(socket.id);
      console.log(`Removed socket ${socket.id} from user ${socket.userId}, remaining connections: ${connections.size}`);

      // If user has no more active connections, mark as offline
      if (connections.size === 0) {
        const lastSeen = new Date();
        await presenceService.updateUserStatus(socket.userId, false, lastSeen);

        // Notify contacts
        const contacts = await presenceService.getUserContacts(socket.userId);
        contacts.forEach(contactId => {
          io.to(`user:${contactId}`).emit('presence_updated', {
            user_id: socket.userId,
            is_online: false,
            last_seen: lastSeen
          });
        });

        // Clean up
        userConnections.delete(socket.userId);

        console.log(`✅ User ${socket.userId} marked offline and notified contacts`);
        logger.info('User went offline:', { userId: socket.userId });
      }
    } else {
      console.log(`No connections found for user ${socket.userId}`);
    }
    console.log("connections after disconnect:=====>", userConnections);
  } catch (error) {
    console.error('Error handling disconnect:', error);
    logger.error('Error handling disconnect:', error.message);
  }
};

// Helper function to check if user is online
const isUserOnline = (userId) => {
  const connections = userConnections.get(userId);
  return connections && connections.size > 0;
};

// Helper function to get active users count
const getActiveUsersCount = () => {
  return userConnections.size;
};

module.exports = {
  registerPresenceHandlers,
  handleUserAuthenticated,
  isUserOnline,
  getActiveUsersCount
};
