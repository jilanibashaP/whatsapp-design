const jwt = require('jsonwebtoken');
const env = require('../config/env');

const SECRET = env.JWT_SECRET || 'change_this_secret';

function signToken(payload, opts = {}) {
  return jwt.sign(payload, SECRET, opts);
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
