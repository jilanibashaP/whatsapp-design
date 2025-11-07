const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Chat = sequelize.define('Chat', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: { type: DataTypes.STRING },
    isGroup: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, {
    tableName: 'chats'
  });

  return Chat;
};
