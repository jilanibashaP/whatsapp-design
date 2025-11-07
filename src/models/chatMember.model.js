const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatMember = sequelize.define('ChatMember', {
    chat_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    role: {
      type: DataTypes.ENUM('admin', 'member'),
      defaultValue: 'member'
    },
    joined_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'chat_members',
    timestamps: false
  });

  ChatMember.associate = (models) => {
    ChatMember.belongsTo(models.Chat, { foreignKey: 'chat_id' });
    ChatMember.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return ChatMember;
};
