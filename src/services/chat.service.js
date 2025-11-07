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
const getUserChats = async (userId) => {

  return db.Chat.findAll({
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
      }
    ],
    order: [['created_at', 'DESC']]
  });
};

module.exports = {
  createGroupChat,
  createOrGetPrivateChat,
  getUserChats
};
