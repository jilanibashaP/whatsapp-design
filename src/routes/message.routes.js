const express = require('express');
const controller = require('../controllers/message.controller');
const auth = require('../middlewares/auth.middleware');
const { uploadMedia } = require('../middlewares/upload.middleware');

const router = express.Router();

// All message routes require authentication
router.use(auth);

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// Otherwise Express will match "unread" or "search" as :chatId

// Upload message media (image/video) - supports single or multiple files
router.post('/upload-media', uploadMedia.array('media', 10), controller.uploadMedia);

// Get unread count (must be before /:chatId)
router.get('/unread/count', controller.getUnreadCount);

// Get chat unread count (must be before /:chatId)
router.get('/unread/count/:chatId', controller.getChatUnreadCount);

// Search messages in a chat (must be before /:chatId)
router.get('/search/:chatId', controller.searchMessages);

// Get messages for a chat (read-only operations via REST)
router.get('/:chatId', controller.getMessages);

// NOTE: All write operations (send, update status, delete) are handled via Socket.io
// for real-time functionality. Use WebSocket events instead of REST endpoints.

module.exports = router;
