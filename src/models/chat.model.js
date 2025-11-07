const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Chat = sequelize.define('Chat', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    is_group: { type: DataTypes.BOOLEAN, defaultValue: false },
    group_name: { type: DataTypes.STRING },
    group_icon: { type: DataTypes.TEXT },
    created_by: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'chats',
    timestamps: false
  });

  Chat.associate = (models) => {
    Chat.belongsTo(models.User, { foreignKey: 'created_by' });
    Chat.belongsToMany(models.User, {
      through: models.ChatMember,
      foreignKey: 'chat_id',
      otherKey: 'user_id'
    });
    Chat.hasMany(models.Message, { foreignKey: 'chat_id' });
    Chat.hasMany(models.ChatMember, { foreignKey: 'chat_id' });
  };

  return Chat;
};
