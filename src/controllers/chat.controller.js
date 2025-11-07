const { response } = require('../utils/response');

exports.createChat = async (req, res, next) => {
  res.json(response({ message: 'create chat - implement' }));
};

exports.getChats = async (req, res, next) => {
  res.json(response({ message: 'get chats - implement' }));
};
