const { response } = require('../utils/response');

exports.register = async (req, res, next) => {
  // TODO: implement registration
  res.json(response({ message: 'register endpoint - implement' }));
};

exports.login = async (req, res, next) => {
  // TODO: implement login
  res.json(response({ message: 'login endpoint - implement' }));
};
