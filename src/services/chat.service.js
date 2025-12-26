const { Op } = require('sequelize');
const db = require('../models');

const createGroupChat = async (userId, { name, icon = null, members, group_description = null }) => {
  const chat = await db.Chat.create({
    is_group: true,
    group_name: name,
    group_icon: icon,
    group_description: group_description,
    created_by: userId
  });

  // Add creator as admin and members to the chat
  const allMembers = [...new Set([...members, userId])];
  const memberEntries = allMembers.map(memberId => ({
    chat_id: chat.id,
    user_id: memberId,
    role: memberId === userId ? 'admin' : 'member'
  }));

  await db.ChatMember.bulkCreate(memberEntries);
  return chat;
};

const createOrGetPrivateChat = async (userId, otherUserId) => {
  // Validate that both users exist and are verified
  const [currentUser, otherUser] = await Promise.all([
    db.User.findOne({
      where: { id: userId, is_verified: true },
      attributes: ['id', 'name', 'phone_number']
    }),
    db.User.findOne({
      where: { id: otherUserId, is_verified: true },
      attributes: ['id', 'name', 'phone_number']
    })
  ]);

  if (!currentUser) {
    throw new Error('Your account is not verified');
  }

  if (!otherUser) {
    throw new Error('This user is not on Synapse yet. They need to register first.');
  }

  // Check if a private chat already exists between these users
  // Get all private chats where either user is a member
  const existingChats = await db.Chat.findAll({
    where: {
      is_group: false
    },
    include: [{
      model: db.ChatMember,
      where: {
        user_id: { [Op.in]: [userId, otherUserId] }
      },
      attributes: ['user_id', 'chat_id']
    }],
    attributes: ['id', 'is_group', 'created_by', 'created_at']
  });

  // Find a chat where both users are members
  for (const chat of existingChats) {
    const memberIds = chat.ChatMembers.map(member => member.user_id);
    const hasUser1 = memberIds.includes(userId);
    const hasUser2 = memberIds.includes(otherUserId);
    
    if (hasUser1 && hasUser2 && memberIds.length === 2) {
      return chat;
    }
  }

  // Create new private chat if none exists
  const chat = await db.Chat.create({
    is_group: false,
    created_by: userId
  });

  // also Add both users to the ChatMember table
  await db.ChatMember.bulkCreate([
    { chat_id: chat.id, user_id: userId },
    { chat_id: chat.id, user_id: otherUserId }
  ]);

  return chat;
};



// getUserChats retrieves all chats (both private and group) that a specific user is a member of.
// Includes last message and unread count for each chat
const getUserChats = async (userId) => {
  const chats = await db.Chat.findAll({
    include: [
      {
        model: db.ChatMember,
        where: { user_id: userId },
        attributes: [] // Exclude from results - only used for filtering
      },
      {
        model: db.User,
        as: 'Users',
        attributes: ['id', 'name', 'profile_pic'],
        through: {
          // Include membership details for ALL members
          attributes: ['role', 'joined_at']
        }
      },
      {
        model: db.Message,
        as: 'Messages',
        limit: 1,
        order: [['sent_at', 'DESC']],
        attributes: ['id', 'content', 'sent_at', 'sender_id', 'message_type', 'status'],
        separate: true, // Important: fetch separately to get the latest message per chat
        include: [
          {
            model: db.MessageStatus,
            as: 'MessageStatuses',
            where: { user_id: userId },
            required: false,
            attributes: ['status', 'updated_at']
          }
        ]
      }
    ],
    order: [['created_at', 'DESC']]
  });

  // Process each chat to add lastMessage and unreadCount
  const chatsWithMetadata = await Promise.all(
    chats.map(async (chat) => {
      const chatJson = chat.toJSON();
      
      // Get the last message
      const lastMessage = chatJson.Messages && chatJson.Messages.length > 0 
        ? chatJson.Messages[0] 
        : null;

      // Count unread messages for this user in this chat
      const unreadCount = await db.Message.count({
        where: {
          chat_id: chat.id,
          sender_id: { [Op.ne]: userId } // Not sent by this user
        },
        include: [
          {
            model: db.MessageStatus,
            where: {
              user_id: userId,
              status: { [Op.in]: ['sent', 'delivered'] } // Not read yet
            },
            required: true
          }
        ]
      });

      // Remove Messages array and add processed data
      delete chatJson.Messages;
      
      return {
        ...chatJson,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          sent_at: lastMessage.sent_at,
          sender_id: lastMessage.sender_id,
          message_type: lastMessage.message_type,
          status: lastMessage.status,
          // Check if this message is unread by the current user
          isUnread: lastMessage.MessageStatuses && lastMessage.MessageStatuses.length > 0
            ? ['sent', 'delivered'].includes(lastMessage.MessageStatuses[0].status)
            : (lastMessage.sender_id !== userId) // If no status record and not sent by user, consider unread
        } : null,
        unreadCount
      };
    })
  );

  // Sort by last message time (most recent first)
  chatsWithMetadata.sort((a, b) => {
    const timeA = a.lastMessage ? new Date(a.lastMessage.sent_at).getTime() : new Date(a.created_at).getTime();
    const timeB = b.lastMessage ? new Date(b.lastMessage.sent_at).getTime() : new Date(b.created_at).getTime();
    return timeB - timeA;
  });

  return chatsWithMetadata;
};

module.exports = {
  createGroupChat,
  createOrGetPrivateChat,
  getUserChats
};
