const messageService = require('../services/message.service');
const s3Service = require('../services/s3.service');
const { response } = require('../utils/response');

/**
 * Determine message type from MIME type
 * @param {String} mimeType - File MIME type
 * @returns {String} - Message type (image, video, audio, file)
 */
const getMessageTypeFromMimeType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  // All other files (PDF, Excel, Word, Text, etc.) are 'file' type
  return 'file';
};

/**
 * Get file extension from MIME type
 * @param {String} mimeType - File MIME type
 * @returns {String} - File extension
 */
const getExtensionFromMimeType = (mimeType) => {
  const mimeMap = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/zip': 'zip',
    'application/x-rar-compressed': 'rar',
    'application/json': 'json',
    'application/xml': 'xml'
  };
  return mimeMap[mimeType] || '';
};

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
 * Upload message media (images, videos, documents)
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

    console.log(`📤 Uploading ${files.length} file(s):`, {
      userId,
      count: files.length,
      types: files.map(f => f.mimetype)
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

    console.log(`✅ ${urls.length} file(s) uploaded successfully`);

    // Determine message type for each file
    const filesWithTypes = files.map((file, index) => ({
      url: urls[index],
      type: getMessageTypeFromMimeType(file.mimetype),
      mimeType: file.mimetype,
      fileName: file.originalname,
      size: file.size,
      extension: getExtensionFromMimeType(file.mimetype) || file.originalname.split('.').pop()
    }));

    // Return single file or array based on count
    const responseData = files.length === 1 
      ? filesWithTypes[0]
      : {
          files: filesWithTypes,
          count: filesWithTypes.length
        };

    res.json(
      response(responseData, 'File(s) uploaded successfully')
    );
  } catch (error) {
    console.error('❌ Error uploading files:', error);
    next(error);
  }
};
