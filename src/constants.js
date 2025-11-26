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
    FILE: 'file' // Documents: PDF, Excel, Word, Text, etc.
  },
  SUPPORTED_FILE_TYPES: {
    DOCUMENTS: {
      PDF: 'application/pdf',
      DOC: 'application/msword',
      DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      XLS: 'application/vnd.ms-excel',
      XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      PPT: 'application/vnd.ms-powerpoint',
      PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      TXT: 'text/plain',
      CSV: 'text/csv',
      JSON: 'application/json',
      XML: 'application/xml'
    },
    ARCHIVES: {
      ZIP: 'application/zip',
      RAR: 'application/x-rar-compressed',
      SEVEN_ZIP: 'application/x-7z-compressed'
    }
  },
  MESSAGE_STATUS: {
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read'
  }
};
