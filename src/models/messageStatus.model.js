const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MessageStatus = sequelize.define('MessageStatus', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    messageId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false } // e.g., sent, delivered, read
  }, {
    tableName: 'message_statuses'
  });

  return MessageStatus;
};
