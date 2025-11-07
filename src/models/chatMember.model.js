const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatMember = sequelize.define('ChatMember', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    role: { type: DataTypes.STRING, defaultValue: 'member' }
  }, {
    tableName: 'chat_members'
  });

  return ChatMember;
};
