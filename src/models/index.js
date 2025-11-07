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

// Call associate methods for all models
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
