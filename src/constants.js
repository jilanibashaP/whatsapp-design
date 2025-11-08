module.exports = {
  SOCKET_EVENTS: {
    MESSAGE: 'message',
    PRESENCE: 'presence',
    TYPING: 'typing',
    SEND_MESSAGE: 'send_message',
    NEW_MESSAGE: 'new_message',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_DELIVERED: 'message_delivered',
    MESSAGE_READ: 'message_read',
    MESSAGE_STATUS_UPDATED: 'message_status_updated',
    AUTHENTICATE: 'authenticate',
    JOIN_CHAT: 'join_chat',
    LEAVE_CHAT: 'leave_chat',
    USER_TYPING: 'user_typing',
    DELETE_MESSAGE: 'delete_message',
    MESSAGE_DELETED: 'message_deleted'
  },
  MESSAGE_TYPES: {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    FILE: 'file'
  },
  MESSAGE_STATUS: {
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read'
  }
};
