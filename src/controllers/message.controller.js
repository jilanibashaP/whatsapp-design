const messageService = require('../services/message.service');
const s3Service = require('../services/s3.service');
const { response } = require('../utils/response');

/**
 * Get messages for a specific chat
 * GET /api/messages/:chatId
 */
exports.getMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const { limit, offset, before_id } = req.query;

    const messages = await messageService.getMessages(userId, chatId, {
      limit,
      offset,
      before_id
    });

    res.json(
      response({
        messages,
        count: messages.length
      }, 'Messages retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread message count
 * GET /api/messages/unread/count
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const count = await messageService.getUnreadCount(userId);

    res.json(
      response({ count }, 'Unread count retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread message count for a specific chat
 * GET /api/messages/unread/count/:chatId
 */
exports.getChatUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;

    const count = await messageService.getChatUnreadCount(userId, chatId);

    res.json(
      response({ count }, 'Chat unread count retrieved successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Search messages in a chat
 * GET /api/messages/search/:chatId
 */
exports.searchMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { chatId } = req.params;
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json(
        response(null, 'Search query (q) is required', false)
      );
    }

    const messages = await messageService.searchMessages(userId, chatId, q);

    res.json(
      response({
        messages,
        count: messages.length
      }, 'Search completed successfully')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Upload message media (image/video)
 * POST /api/messages/upload-media
 * Supports single or multiple files
 */
exports.uploadMedia = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const files = req.files || (req.file ? [req.file] : []);

    if (!files || files.length === 0) {
      return res.status(400).json(
        response(null, 'No file uploaded', false)
      );
    }

    console.log(`📤 Uploading ${files.length} media file(s):`, {
      userId,
      count: files.length
    });

    // Upload all files to S3
    const uploadPromises = files.map(file => 
      s3Service.uploadMessageMedia(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId
      )
    );

    const urls = await Promise.all(uploadPromises);

    console.log(`✅ ${urls.length} media file(s) uploaded successfully`);

    // Return single URL or array based on count
    const responseData = files.length === 1 
      ? {
          url: urls[0],
          type: files[0].mimetype.startsWith('image/') ? 'image' : 'video'
        }
      : {
          urls: urls,
          count: urls.length,
          type: files[0].mimetype.startsWith('image/') ? 'image' : 'video'
        };

    res.json(
      response(responseData, 'Media uploaded successfully')
    );
  } catch (error) {
    console.error('❌ Error uploading message media:', error);
    next(error);
  }
};
