const db = require('../models');

/**
 * Update user online/offline status
 */
const updateUserStatus = async (userId, isOnline, lastSeen = new Date()) => {
  await db.User.update(
    { 
      is_online: isOnline,
      last_seen: lastSeen 
    },
    { where: { id: userId } }
  );
};

/**
 * Get user's contact list (people they've chatted with)
 */
const getUserContacts = async (userId) => {
  const chats = await db.Chat.findAll({
    include: [
      {
        model: db.ChatMember,
        where: { user_id: userId },
        attributes: []
      },
      {
        model: db.User,
        as: 'Users',
        attributes: ['id'],
        through: { attributes: [] }
      }
    ],
    attributes: ['id']
  });

  // Extract unique user IDs (excluding self)
  const contactIds = new Set();
  chats.forEach(chat => {
    chat.Users.forEach(user => {
      if (user.id !== userId) {
        contactIds.add(user.id);
      }
    });
  });

  return Array.from(contactIds);
};

/**
 * Get online status of multiple users
 */
const getBulkUserStatus = async (userIds) => {
  const users = await db.User.findAll({
    where: { id: userIds },
    attributes: ['id', 'is_online', 'last_seen']
  });

  return users.map(user => ({
    user_id: user.id,
    is_online: user.is_online,
    last_seen: user.last_seen
  }));
};

module.exports = {
  updateUserStatus,
  getUserContacts,
  getBulkUserStatus
};
