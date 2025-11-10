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
    
    // Manual status update (toggle online/offline)
    socket.on('update_status', async (isOnline) => {
      try {
        if (!socket.userId) return;
        
        await presenceService.updateUserStatus(socket.userId, isOnline);
        
        // Notify contacts
        const contacts = await presenceService.getUserContacts(socket.userId);
        contacts.forEach(contactId => {
          io.to(`user:${contactId}`).emit('presence_updated', {
            user_id: socket.userId,
            is_online: isOnline,
            last_seen: new Date()
          });
        });
        
        logger.info('User status updated:', { userId: socket.userId, isOnline });
      } catch (error) {
        logger.error('Error updating status:', error.message);
      }
    });
    
    // Get presence info for multiple users
    socket.on('get_presence', async (userIds) => {
      try {
        if (!socket.userId) return;
        
        const presenceInfo = await presenceService.getBulkUserStatus(userIds);
        socket.emit('presence_info', presenceInfo);
      } catch (error) {
        logger.error('Error getting presence:', error.message);
      }
    });
    
    // Legacy presence event (for backward compatibility)
    socket.on('presence', (payload) => {
      socket.broadcast.emit('presence', payload);
    });
    
    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      try {
        console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
        console.log("connections before disconnect:=====>", userConnections);
        if (!socket.userId) return;
        
        // Remove this socket from user's connections
        const connections = userConnections.get(socket.userId);
        if (connections) {
          connections.delete(socket.id);
          
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
            
            logger.info('User went offline:', { userId: socket.userId });
          }
        }
      } catch (error) {
        logger.error('Error handling disconnect:', error.message);
      }
    });
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
