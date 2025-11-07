const express = require('express');
const userRoutes = require('./user.routes');
const chatRoutes = require('./chat.routes');
const messageRoutes = require('./message.routes');

const router = express.Router();

router.use('/users', userRoutes);
router.use('/chats', chatRoutes);
router.use('/messages', messageRoutes);

module.exports = router;
