const { response } = require('../utils/response');

exports.sendMessage = async (req, res, next) => {
  res.json(response({ message: 'send message - implement' }));
};

exports.getMessages = async (req, res, next) => {
  res.json(response({ message: 'get messages - implement' }));
};
