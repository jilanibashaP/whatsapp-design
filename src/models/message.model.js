const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Message = sequelize.define('Message', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    chat_id: { type: DataTypes.INTEGER, allowNull: false },
    sender_id: { type: DataTypes.INTEGER, allowNull: false },
    message_type: {
      type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'file'),
      defaultValue: 'text'
    },
    content: { type: DataTypes.TEXT, allowNull: false },
    caption: { type: DataTypes.TEXT, allowNull: true },
    reply_to: { type: DataTypes.INTEGER },
    sent_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    status: {
      type: DataTypes.ENUM('sent', 'delivered', 'read'),
      defaultValue: 'sent'
    }
  }, {
    tableName: 'messages',
    timestamps: false
  });

  Message.associate = (models) => {
    Message.belongsTo(models.Chat, { foreignKey: 'chat_id' });
    Message.belongsTo(models.User, { foreignKey: 'sender_id', as: 'User' });
    Message.belongsTo(models.Message, { foreignKey: 'reply_to', as: 'ReplyTo' });
    Message.hasMany(models.MessageStatus, { foreignKey: 'message_id' });
  };

  return Message;
};
