const Sequelize = require('sequelize');
const sequelize = require('../config/db');

const User = require('./user.model');
const Chat = require('./chat.model');
const ChatMember = require('./chatMember.model');
const Message = require('./message.model');
const MessageStatus = require('./messageStatus.model');

const db = {
  Sequelize,
  sequelize,
  User: User(sequelize),
  Chat: Chat(sequelize),
  ChatMember: ChatMember(sequelize),
  Message: Message(sequelize),
  MessageStatus: MessageStatus(sequelize)
};

// Associations (basic)
db.Chat.hasMany(db.Message, { foreignKey: 'chatId' });
db.Message.belongsTo(db.Chat, { foreignKey: 'chatId' });

db.User.hasMany(db.Message, { foreignKey: 'senderId' });
db.Message.belongsTo(db.User, { foreignKey: 'senderId' });

db.Chat.belongsToMany(db.User, { through: db.ChatMember, foreignKey: 'chatId', otherKey: 'userId' });
db.User.belongsToMany(db.Chat, { through: db.ChatMember, foreignKey: 'userId', otherKey: 'chatId' });

module.exports = db;
