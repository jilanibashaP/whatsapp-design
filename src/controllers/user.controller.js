const { response } = require('../utils/response');


const bcrypt = require('bcrypt');
const { signToken } = require('../utils/token');
const db = require('../models');

exports.register = async (req, res, next) => {
  try {
    const { name, phone_number, email, password, profile_pic, status } = req.body;
    if (!name || !phone_number || !password) {
      return res.status(400).json(response({ error: 'Name, phone number, and password are required.' }));
    }
    // Check if user exists
    const existing = await db.User.findOne({ where: { phone_number } });
    if (existing) {
      return res.status(409).json(response({ error: 'User already exists.' }));
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create user
    const user = await db.User.create({
      name,
      phone_number,
      email,
      profile_pic,
      status,
      password: hashedPassword
    });
    // Generate token
    const token = signToken({ id: user.id, phone_number: user.phone_number });
    res.status(201).json(response({ user: { id: user.id, name: user.name, phone_number: user.phone_number, email: user.email, profile_pic: user.profile_pic, status: user.status }, token }));
  } catch (err) {
    next(err);
  }
};


exports.login = async (req, res, next) => {
  try {
    const { phone_number, password } = req.body;
    if (!phone_number || !password) {
      return res.status(400).json(response({ error: 'Phone number and password are required.' }));
    }
    const user = await db.User.findOne({ where: { phone_number } });
    if (!user) {
      return res.status(404).json(response({ error: 'User not found.' }));
    }
    // Compare password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json(response({ error: 'Invalid credentials.' }));
    }
    // Generate token
    const token = signToken({ id: user.id, phone_number: user.phone_number });
    res.json(response({ user: { id: user.id, name: user.name, phone_number: user.phone_number, email: user.email, profile_pic: user.profile_pic, status: user.status }, token }));
  } catch (err) {
    next(err);
  }
};
