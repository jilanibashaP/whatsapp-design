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

        // Broadcast to all users in the chat room (except sender)
        // This enables real-time messaging - instantly pushes the message to all connected users
        // in this chat room via WebSocket, except the sender (who already has it)
        socket.to(`chat:${chat_id}`).emit('new_message', message);

        logger.info('Message sent:', {
          messageId: message.id,
          chatId: chat_id,
          senderId: socket.userId
        });
      } catch (error) {
        logger.error('Error sending message:', error.message);
        socket.emit('message_error', {
          tempId: data.tempId,
          message: error.message
        });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      if (!socket.userId) return;

      const { chat_id, is_typing } = data;
      socket.to(`chat:${chat_id}`).emit('user_typing', {
        chat_id,
        user_id: socket.userId,
        is_typing
      });
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

        await messageService.bulkUpdateMessageStatus(
          socket.userId,
          chat_id,
          message_ids,
          'read'
        );

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

    // Disconnect
    socket.on('disconnect', (reason) => {
      logger.info('Message socket disconnected:', {
        socketId: socket.id,
        userId: socket.userId,
        reason
      });
    });
}

module.exports = { registerMessageHandlers };
