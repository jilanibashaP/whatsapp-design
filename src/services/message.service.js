const { Op } = require('sequelize');
const db = require('../models');

/**
 * Send a message to a chat
 */
const sendMessage = async (userId, { chat_id, content, message_type = 'text', reply_to = null, caption = null }) => {
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
    caption,
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

  // Transform messages to include status for the requesting user
  const transformedMessages = messages.map(msg => {
    const msgJson = msg.toJSON();
    
    // If user is the sender, determine status based on recipient statuses
    if (msgJson.sender_id === userId) {
      // For sender: show the "worst" status among all recipients
      const statuses = msgJson.MessageStatuses || [];
      if (statuses.length === 0) {
        msgJson.status = 'sent';
      } else {
        // Status priority: sent < delivered < read
        const hasUndelivered = statuses.some(s => s.status === 'sent');
        const hasUnread = statuses.some(s => s.status === 'delivered');
        const allRead = statuses.every(s => s.status === 'read');
        
        if (allRead) {
          msgJson.status = 'read';
        } else if (hasUndelivered) {
          msgJson.status = 'sent';
        } else if (hasUnread) {
          msgJson.status = 'delivered';
        } else {
          msgJson.status = 'sent';
        }
      }
    } else {
      // For recipient: show their own status
      const userStatus = msgJson.MessageStatuses?.find(s => s.user_id === userId);
      msgJson.status = userStatus?.status || 'sent';
    }
    
    return msgJson;
  });

  return transformedMessages.reverse(); // Return in chronological order
};

/**
 * Update message status (delivered/read)
 * NOTE: Never downgrade status (read -> delivered, delivered -> sent)
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

  // Status hierarchy: sent < delivered < read
  const statusHierarchy = { sent: 1, delivered: 2, read: 3 };

  // Update message status for this user
  const [messageStatus, created] = await db.MessageStatus.findOrCreate({
    where: { message_id: messageId, user_id: userId },
    defaults: { status, updated_at: new Date() }
  });

  if (!created) {
    // Only update if new status is higher in hierarchy (prevent downgrade)
    const currentLevel = statusHierarchy[messageStatus.status] || 0;
    const newLevel = statusHierarchy[status] || 0;
    
    if (newLevel > currentLevel) {
      await messageStatus.update({
        status,
        updated_at: new Date()
      });
    } else {
      console.log(`[DEBUG] Skipping status update for message ${messageId}: current=${messageStatus.status}, attempted=${status} (no downgrade)`);
    }
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

  console.log(`[DEBUG] bulkUpdateMessageStatus: userId=${userId}, chatId=${chatId}, messageIds=${JSON.stringify(messageIds)}, status=${status}`);

  // Get ALL message status entries for this user in this chat
  const allMessageStatuses = await db.MessageStatus.findAll({
    where: {
      user_id: userId
    },
    include: [{
      model: db.Message,
      where: { chat_id: chatId },
      attributes: ['id', 'sender_id']
    }],
    attributes: ['message_id', 'status']
  });

  console.log(`[DEBUG] Total MessageStatus entries for user ${userId} in chat ${chatId}:`, allMessageStatuses.length);
  console.log(`[DEBUG] MessageStatus details:`, allMessageStatuses.map(ms => ({
    message_id: ms.message_id,
    status: ms.status
  })));

  // Get existing message status entries
  const existingStatuses = await db.MessageStatus.findAll({
    where: {
      message_id: { [Op.in]: messageIds },
      user_id: userId
    },
    attributes: ['message_id']
  });

  const existingMessageIds = existingStatuses.map(s => s.message_id);
  const missingMessageIds = messageIds.filter(id => !existingMessageIds.includes(id));

  console.log(`[DEBUG] Existing MessageStatus entries:`, existingMessageIds);
  console.log(`[DEBUG] Missing MessageStatus entries:`, missingMessageIds);

  // Update existing statuses
  if (existingMessageIds.length > 0) {
    await db.MessageStatus.update(
      { status, updated_at: new Date() },
      {
        where: {
          message_id: { [Op.in]: existingMessageIds },
          user_id: userId
        }
      }
    );
  }

  // Create missing statuses
  if (missingMessageIds.length > 0) {
    const newStatuses = missingMessageIds.map(messageId => ({
      message_id: messageId,
      user_id: userId,
      status,
      updated_at: new Date()
    }));
    await db.MessageStatus.bulkCreate(newStatuses);
  }

  return {
    updated: existingMessageIds.length,
    created: missingMessageIds.length
  };
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

/**
 * Get all undelivered messages for a user
 * Called when user comes online to deliver pending messages
 */
const getUndeliveredMessages = async (userId) => {
  const messages = await db.Message.findAll({
    include: [
      {
        model: db.MessageStatus,
        where: {
          user_id: userId,
          status: 'sent' // Only undelivered messages
        },
        required: true
      },
      {
        model: db.User,
        as: 'User',
        attributes: ['id', 'name', 'profile_pic']
      },
      {
        model: db.Message,
        as: 'ReplyTo',
        attributes: ['id', 'content', 'sender_id'],
        required: false,
        include: [{
          model: db.User,
          as: 'User',
          attributes: ['id', 'name']
        }]
      },
      {
        model: db.Chat,
        attributes: ['id', 'is_group', 'group_name']
      }
    ],
    where: {
      sender_id: { [Op.ne]: userId } // Don't include user's own messages
    },
    order: [['sent_at', 'ASC']], // Deliver oldest first
    limit: 100 // Limit to prevent overload
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
  searchMessages,
  getUndeliveredMessages
};
