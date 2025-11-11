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

    // ========================================
    // IMPORTANT: Join user's personal room
    // This allows server to send messages directly to this user
    // even if they haven't opened specific chats
    // ========================================
    socket.join(`user:${userId}`);
    logger.info(`User ${userId} joined personal room: user:${userId}`);

    // Track connection
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add(socket.id);

    // Update status to online (is_online = true)
    await presenceService.updateUserStatus(userId, true);

    // ========================================
    // NEW: Deliver pending messages
    // When user comes online, send all queued messages
    // ========================================
    try {
      const messageService = require('../services/message.service');
      
      // Get all undelivered messages
      const undeliveredMessages = await messageService.getUndeliveredMessages(userId);
      
      if (undeliveredMessages.length > 0) {
        logger.info(`User ${userId} has ${undeliveredMessages.length} pending messages`);
        
        // Deliver each message
        for (const message of undeliveredMessages) {
          // Emit message to the user
          socket.emit('new_message', {
            id: message.id,
            chat_id: message.chat_id,
            sender_id: message.sender_id,
            content: message.content,
            message_type: message.message_type,
            sent_at: message.sent_at,
            reply_to: message.reply_to,
            User: message.User,
            ReplyTo: message.ReplyTo,
            Chat: message.Chat,
            isPending: true // Flag to indicate this was a queued message
          });
          
          // Update status to delivered
          await messageService.updateMessageStatus(userId, message.id, 'delivered');
          
          // Notify sender that message was delivered
          io.to(`user:${message.sender_id}`).emit('message_status_updated', {
            message_id: message.id,
            status: 'delivered',
            user_id: userId,
            delivered_at: new Date()
          });
          
          logger.info(`Message ${message.id} delivered to user ${userId} (was queued)`);
        }
        
        // Notify user about pending message delivery
        socket.emit('pending_messages_delivered', {
          count: undeliveredMessages.length
        });
        
        logger.info(`✅ Delivered ${undeliveredMessages.length} pending messages to user ${userId}`);
      }
    } catch (error) {
      logger.error(`Error delivering pending messages to user ${userId}:`, error);
    }

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
