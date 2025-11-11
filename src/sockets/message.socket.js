const messageService = require('../services/message.service');
const logger = require('../utils/logger');
const { verify } = require('../utils/token');

/**
 * Register message-related socket event handlers
 * @param {Object} socket - Socket.io socket instance
 * @param {Object} io - Socket.io server instance
 */
function registerMessageHandlers(socket, io) {
  // Authenticate socket connection
    // socket.on('authenticate', async (token) => {
    //   try {
    //     const decoded = verify(token);
    //     socket.userId = decoded.id;
    //     socket.join(`user:${decoded.id}`); // Join user's personal room
    //     socket.emit('authenticated', { success: true, userId: decoded.id });
        
    //     // Emit event for presence tracking
    //     socket.emit('user_authenticated', decoded.id);
        
    //     logger.info('Socket authenticated:', { socketId: socket.id, userId: decoded.id });
    //   } catch (error) {
    //     socket.emit('authentication_error', { message: 'Invalid token' });
    //     logger.error('Socket authentication failed:', error.message);
    //   }
    // });

    // Join a chat room creating the separate room for each chat
    socket.on('join_chat', (chatId) => {
      if (!socket.userId) {
        return socket.emit('error', { message: 'Not authenticated' });
      }
      
      socket.join(`chat:${chatId}`);
      logger.info('User joined chat:', { userId: socket.userId, chatId });
      socket.emit('joined_chat', { chatId });
    });

    // Leave a chat room
    socket.on('leave_chat', (chatId) => {
      socket.leave(`chat:${chatId}`);
      logger.info('User left chat:', { userId: socket.userId, chatId });
    });

    // Send message via socket
    socket.on('send_message', async (data) => {
      try {
        if (!socket.userId) {
          return socket.emit('error', { message: 'Not authenticated' });
        }

        const { chat_id, content, message_type, reply_to } = data;

        if (!chat_id || !content) {
          return socket.emit('message_error', { message: 'chat_id and content are required' });
        }

        // Save message to database
        const message = await messageService.sendMessage(socket.userId, {
          chat_id,
          content,
          message_type: message_type || 'text',
          reply_to
        });

        // Send confirmation to sender
        socket.emit('message_sent', {
          tempId: data.tempId, // Client-side temporary ID for message tracking
          message
        });

        // ========================================
        // NEW: WhatsApp-like delivery - Send to all chat members via their personal rooms
        // This works even if they haven't opened/joined the chat
        // ========================================
        const db = require('../models');
        const { Op } = require('sequelize');
        
        // Get all chat members except sender
        const chatMembers = await db.ChatMember.findAll({
          where: {
            chat_id,
            user_id: { [Op.ne]: socket.userId }
          },
          attributes: ['user_id']
        });

        // Deliver message to each recipient
        let deliveredCount = 0;
        let queuedCount = 0;

        for (const member of chatMembers) {
          const recipientUserId = member.user_id;
          
          // Check if user is online using the helper function from presence
          if (io.isUserOnline && io.isUserOnline(recipientUserId)) {
            // User is ONLINE - deliver immediately to their personal room
            io.to(`user:${recipientUserId}`).emit('new_message', message);
            
            // Update message status to 'delivered'
            await messageService.updateMessageStatus(
              recipientUserId,
              message.id,
              'delivered'
            );
            
            // Notify sender that message was delivered
            io.to(`user:${socket.userId}`).emit('message_status_updated', {
              message_id: message.id,
              status: 'delivered',
              user_id: recipientUserId,
              delivered_at: new Date()
            });
            
            deliveredCount++;
            logger.info(`Message ${message.id} delivered to online user ${recipientUserId}`);
          } else {
            // User is OFFLINE - message stays in 'sent' status
            // Will be delivered when user comes online (via pending message delivery)
            queuedCount++;
            logger.info(`User ${recipientUserId} offline. Message ${message.id} queued for later delivery.`);
          }
        }

        // Also broadcast to chat room for backward compatibility
        // (in case some users still use join_chat)
        socket.to(`chat:${chat_id}`).emit('new_message', message);

        // Notify sender about delivery status
        socket.emit('message_delivery_info', {
          message_id: message.id,
          delivered: deliveredCount,
          queued: queuedCount,
          total: chatMembers.length
        });

        logger.info('Message sent:', {
          messageId: message.id,
          chatId: chat_id,
          senderId: socket.userId,
          deliveredToOnline: deliveredCount,
          queuedForOffline: queuedCount,
          totalRecipients: chatMembers.length
        });
      } catch (error) {
        logger.error('Error sending message:', error.message);
        socket.emit('message_error', {
          tempId: data.tempId,
          message: error.message
        });
      }
    });

    // Typing indicator - Deliver to personal rooms of chat members
    socket.on('typing', async (data) => {
      if (!socket.userId) return;

      const { chat_id, is_typing } = data;
      
      try {
        const db = require('../models');
        const { Op } = require('sequelize');
        
        // Get all chat members except the sender
        const chatMembers = await db.ChatMember.findAll({
          where: {
            chat_id,
            user_id: { [Op.ne]: socket.userId }
          },
          attributes: ['user_id']
        });

        // Deliver typing indicator to each member's personal room
        chatMembers.forEach(member => {
          io.to(`user:${member.user_id}`).emit('user_typing', {
            chat_id,
            user_id: socket.userId,
            is_typing
          });
        });

        logger.info(`Typing indicator sent to ${chatMembers.length} members in chat ${chat_id}`);
      } catch (error) {
        logger.error('Error sending typing indicator:', error.message);
      }
    });

    // Message delivered
    socket.on('message_delivered', async (data) => {
      try {
        if (!socket.userId) return;

        const { message_id } = data;
        
        await messageService.updateMessageStatus(
          socket.userId,
          message_id,
          'delivered'
        );

        // Get the message to find the sender and chat
        const db = require('../models');
        const message = await db.Message.findByPk(message_id);
        
        if (message) {
          // Notify the sender
          io.to(`user:${message.sender_id}`).emit('message_status_updated', {
            message_id,
            status: 'delivered',
            user_id: socket.userId
          });
        }
      } catch (error) {
        logger.error('Error updating delivered status:', error.message);
      }
    });

    // Message read
    socket.on('message_read', async (data) => {
      try {
        if (!socket.userId) return;

        const { message_id, chat_id } = data;
        
        await messageService.updateMessageStatus(
          socket.userId,
          message_id,
          'read'
        );

        // Get the message to find the sender
        const db = require('../models');
        const message = await db.Message.findByPk(message_id);
        
        if (message) {
          // Notify the sender
          io.to(`user:${message.sender_id}`).emit('message_status_updated', {
            message_id,
            status: 'read',
            user_id: socket.userId
          });

          // Broadcast to chat room for group read receipts
          socket.to(`chat:${chat_id}`).emit('message_read_by', {
            message_id,
            user_id: socket.userId,
            chat_id
          });

          // Emit event back to the user who marked message as read
          // This helps update their own chat list
          io.to(`user:${socket.userId}`).emit('message_read', {
            message_id,
            chat_id,
            user_id: socket.userId
          });
        }
      } catch (error) {
        logger.error('Error updating read status:', error.message);
      }
    });

    // Bulk mark messages as read
    socket.on('bulk_mark_read', async (data) => {
      try {
        if (!socket.userId) return;

        const { chat_id, message_ids } = data;

        if (!Array.isArray(message_ids) || message_ids.length === 0) {
          return;
        }

        logger.info(`📖 Received bulk_mark_read: User ${socket.userId}, Chat ${chat_id}, MessageIDs: ${JSON.stringify(message_ids)}`);

        const result = await messageService.bulkUpdateMessageStatus(
          socket.userId,
          chat_id,
          message_ids,
          'read'
        );

        logger.info(`Bulk mark read result: Updated ${result.updated}, Created ${result.created}`);

        // Check current unread count after update
        const unreadCount = await messageService.getChatUnreadCount(socket.userId, chat_id);
        logger.info(`📊 Unread count after bulk mark read: ${unreadCount} for user ${socket.userId} in chat ${chat_id}`);

        // Get unique sender IDs for these messages
        const db = require('../models');
        const messages = await db.Message.findAll({
          where: { id: message_ids },
          attributes: ['id', 'sender_id']
        });

        const senderIds = [...new Set(messages.map(m => m.sender_id))];

        // Notify all senders
        senderIds.forEach(senderId => {
          io.to(`user:${senderId}`).emit('messages_read_bulk', {
            message_ids,
            user_id: socket.userId,
            chat_id
          });
        });

        // Emit event back to the user who marked messages as read
        // This helps update their own chat list
        io.to(`user:${socket.userId}`).emit('messages_read', {
          chat_id,
          message_ids,
          user_id: socket.userId
        });

        logger.info(`User ${socket.userId} marked ${message_ids.length} messages as read in chat ${chat_id}`);
      } catch (error) {
        logger.error('Error bulk marking read:', error.message);
      }
    });

    // Delete message
    socket.on('delete_message', async (data) => {
      try {
        if (!socket.userId) return;

        const { message_id, chat_id } = data;

        const message = await messageService.deleteMessage(socket.userId, message_id);

        // Notify all users in the chat
        io.to(`chat:${chat_id}`).emit('message_deleted', {
          message_id,
          message
        });
      } catch (error) {
        logger.error('Error deleting message:', error.message);
        socket.emit('delete_error', { message: error.message });
      }
    });

    // Note: Disconnect is handled by presence.socket.js
    // No need for duplicate disconnect handler here
}

module.exports = { registerMessageHandlers };
