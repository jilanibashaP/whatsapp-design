const { Op } = require('sequelize');
const db = require('../models');

/**
 * Send a message to a chat
 */
const sendMessage = async (userId, { chat_id, content, message_type = 'text', reply_to = null }) => {
  // Verify user is a member of the chat
  const membership = await db.ChatMember.findOne({
    where: { chat_id, user_id: userId }
  });

  if (!membership) {
    throw new Error('User is not a member of this chat');
  }

  // Create the message
  const message = await db.Message.create({
    chat_id,
    sender_id: userId,
    content,
    message_type,
    reply_to,
    status: 'sent'
  });

  // Get all chat members except sender for message status tracking
  const chatMembers = await db.ChatMember.findAll({
    where: {
      chat_id,
      user_id: { [Op.ne]: userId }
    },
    attributes: ['user_id']
  });

  // Create message status entries for all recipients
  const statusEntries = chatMembers.map(member => ({
    message_id: message.id,
    user_id: member.user_id,
    status: 'sent'
  }));

  if (statusEntries.length > 0) {
    await db.MessageStatus.bulkCreate(statusEntries);
  }

  // Fetch complete message with associations
  const completeMessage = await db.Message.findByPk(message.id, {
    include: [
      {
        model: db.User,
        as: 'User',
        attributes: ['id', 'name', 'profile_pic']
      },
      {
        model: db.Message,
        as: 'ReplyTo',
        attributes: ['id', 'content', 'sender_id'],
        include: [{
          model: db.User,
          as: 'User',
          attributes: ['id', 'name']
        }]
      }
    ]
  });

  return completeMessage;
};

/**
 * Get messages for a specific chat with pagination
 */
const getMessages = async (userId, chatId, { limit = 50, offset = 0, before_id = null }) => {
  // Verify user is a member of the chat
  const membership = await db.ChatMember.findOne({
    where: { chat_id: chatId, user_id: userId }
  });

  if (!membership) {
    throw new Error('User is not a member of this chat');
  }

  const whereClause = { chat_id: chatId };
  
  // If before_id is provided, get messages before that ID
  if (before_id) {
    whereClause.id = { [Op.lt]: before_id };
  }

  const messages = await db.Message.findAll({
    where: whereClause,
    include: [
      {
        model: db.User,
        as: 'User',
        attributes: ['id', 'name', 'profile_pic']
      },
      {
        model: db.Message,
        as: 'ReplyTo',
        attributes: ['id', 'content', 'sender_id', 'message_type'],
        include: [{
          model: db.User,
          as: 'User',
          attributes: ['id', 'name']
        }]
      },
      {
        model: db.MessageStatus,
        attributes: ['user_id', 'status', 'updated_at']
      }
    ],
    order: [['id', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  return messages.reverse(); // Return in chronological order
};

/**
 * Update message status (delivered/read)
 */
const updateMessageStatus = async (userId, messageId, status) => {
  const message = await db.Message.findByPk(messageId);
  
  if (!message) {
    throw new Error('Message not found');
  }

  // Verify user is a member of the chat
  const membership = await db.ChatMember.findOne({
    where: { chat_id: message.chat_id, user_id: userId }
  });

  if (!membership) {
    throw new Error('User is not a member of this chat');
  }

  // Update message status for this user
  const [messageStatus, created] = await db.MessageStatus.findOrCreate({
    where: { message_id: messageId, user_id: userId },
    defaults: { status, updated_at: new Date() }
  });

  if (!created) {
    await messageStatus.update({
      status,
      updated_at: new Date()
    });
  }

  return messageStatus;
};

/**
 * Update multiple messages status (bulk operation)
 */
const bulkUpdateMessageStatus = async (userId, chatId, messageIds, status) => {
  // Verify user is a member of the chat
  const membership = await db.ChatMember.findOne({
    where: { chat_id: chatId, user_id: userId }
  });

  if (!membership) {
    throw new Error('User is not a member of this chat');
  }

  // Update all message statuses
  const result = await db.MessageStatus.update(
    { status, updated_at: new Date() },
    {
      where: {
        message_id: { [Op.in]: messageIds },
        user_id: userId
      }
    }
  );

  return result;
};

/**
 * Delete a message (soft delete by updating content)
 */
const deleteMessage = async (userId, messageId) => {
  const message = await db.Message.findByPk(messageId);
  
  if (!message) {
    throw new Error('Message not found');
  }

  // Only sender can delete their message
  if (message.sender_id !== userId) {
    throw new Error('You can only delete your own messages');
  }

  // Update message content to indicate deletion
  await message.update({
    content: 'This message was deleted',
    message_type: 'text'
  });

  return message;
};

/**
 * Get unread message count for a user across all chats
 */
const getUnreadCount = async (userId) => {
  const count = await db.MessageStatus.count({
    where: {
      user_id: userId,
      status: { [Op.in]: ['sent', 'delivered'] }
    }
  });

  return count;
};

/**
 * Get unread message count for a specific chat
 */
const getChatUnreadCount = async (userId, chatId) => {
  const count = await db.MessageStatus.count({
    include: [{
      model: db.Message,
      where: { chat_id: chatId },
      attributes: []
    }],
    where: {
      user_id: userId,
      status: { [Op.in]: ['sent', 'delivered'] }
    }
  });

  return count;
};

/**
 * Search messages in a chat
 */
const searchMessages = async (userId, chatId, searchQuery) => {
  // Verify user is a member of the chat
  const membership = await db.ChatMember.findOne({
    where: { chat_id: chatId, user_id: userId }
  });

  if (!membership) {
    throw new Error('User is not a member of this chat');
  }

  const messages = await db.Message.findAll({
    where: {
      chat_id: chatId,
      content: {
        [Op.like]: `%${searchQuery}%`
      }
    },
    include: [
      {
        model: db.User,
        as: 'User',
        attributes: ['id', 'name', 'profile_pic']
      }
    ],
    order: [['sent_at', 'DESC']],
    limit: 50
  });

  return messages;
};

module.exports = {
  sendMessage,
  getMessages,
  updateMessageStatus,
  bulkUpdateMessageStatus,
  deleteMessage,
  getUnreadCount,
  getChatUnreadCount,
  searchMessages
};
