const presenceService = require('../services/presence.service');
const logger = require('../utils/logger');

// Track active user connections: userId -> Set of socketIds
const userConnections = new Map();

/**
 * Socket handler for user presence/online status
 */
module.exports = (io) => {
  io.on('connection', (socket) => {
    
    // When user is authenticated, mark them as online
    socket.on('user_authenticated', async (userId) => {
      try {
        socket.userId = userId;
        
        // Track connection
        if (!userConnections.has(userId)) {
          userConnections.set(userId, new Set());
        }
        userConnections.get(userId).add(socket.id);
        
        // Update status to online
        await presenceService.updateUserStatus(userId, 'online');
        
        // Notify all contacts that user is online
        const contacts = await presenceService.getUserContacts(userId);
        contacts.forEach(contactId => {
          io.to(`user:${contactId}`).emit('presence_updated', {
            user_id: userId,
            status: 'online',
            last_seen: new Date()
          });
        });
        
        logger.info('User came online:', { userId });
      } catch (error) {
        logger.error('Error updating user presence:', error.message);
      }
    });
    
    // Manual status update (online, away, busy, offline)
    socket.on('update_status', async (status) => {
      try {
        if (!socket.userId) return;
        
        await presenceService.updateUserStatus(socket.userId, status);
        
        // Notify contacts
        const contacts = await presenceService.getUserContacts(socket.userId);
        contacts.forEach(contactId => {
          io.to(`user:${contactId}`).emit('presence_updated', {
            user_id: socket.userId,
            status: status,
            last_seen: new Date()
          });
        });
        
        logger.info('User status updated:', { userId: socket.userId, status });
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
        if (!socket.userId) return;
        
        // Remove this socket from user's connections
        const connections = userConnections.get(socket.userId);
        if (connections) {
          connections.delete(socket.id);
          
          // If user has no more active connections, mark as offline
          if (connections.size === 0) {
            const lastSeen = new Date();
            await presenceService.updateUserStatus(socket.userId, 'offline', lastSeen);
            
            // Notify contacts
            const contacts = await presenceService.getUserContacts(socket.userId);
            contacts.forEach(contactId => {
              io.to(`user:${contactId}`).emit('presence_updated', {
                user_id: socket.userId,
                status: 'offline',
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
  });
  
  // Helper function to check if user is online
  io.isUserOnline = (userId) => {
    const connections = userConnections.get(userId);
    return connections && connections.size > 0;
  };
  
  // Helper function to get active users count
  io.getActiveUsersCount = () => {
    return userConnections.size;
  };
};
