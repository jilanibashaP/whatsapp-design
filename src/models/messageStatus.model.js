const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MessageStatus = sequelize.define('MessageStatus', {
    message_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'read'),
      allowNull: false,
      defaultValue: 'sent'
    },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, {
    tableName: 'message_statuses',
    timestamps: false
  });

  MessageStatus.associate = (models) => {
    MessageStatus.belongsTo(models.Message, { foreignKey: 'message_id' });
    MessageStatus.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return MessageStatus;
};
