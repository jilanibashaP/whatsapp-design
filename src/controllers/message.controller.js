const messageService = require('../services/message.service');
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
