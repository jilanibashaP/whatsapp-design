# 📋 Messaging System - Comprehensive Architecture Guide

> **Last Updated:** November 8, 2025  
> **Purpose:** Complete reference for understanding the messaging system architecture

---

## 📖 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [What's Available (Current State)](#whats-available-current-state)
3. [REST API Endpoints (Read-Only)](#rest-api-endpoints-read-only)
4. [WebSocket Events (Real-Time)](#websocket-events-real-time)
5. [Service Layer](#service-layer)
6. [How Everything Works Together](#how-everything-works-together)
7. [Database Schema](#database-schema)
8. [Quick Reference Guide](#quick-reference-guide)

---

## 🏗️ Architecture Overview

### Design Philosophy
This application follows **modern real-time messaging architecture** similar to WhatsApp, Slack, and Discord:

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (Frontend)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐    ┌─────────────────────────┐   │
│  │   REST API Calls     │    │   Socket.io Events      │   │
│  │  (Read Operations)   │    │  (Write Operations)     │   │
│  │                      │    │                         │   │
│  │  • Get messages      │    │  • Send message         │   │
│  │  • Get unread count  │    │  • Mark as read         │   │
│  │  • Search messages   │    │  • Delete message       │   │
│  └──────────────────────┘    │  • Typing indicator     │   │
│                               └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓                    ↓
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Backend - Node.js)                │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐    ┌─────────────────────────┐   │
│  │   REST Controllers   │    │   Socket Handlers       │   │
│  │  message.controller  │    │  message.socket.js      │   │
│  └──────────────────────┘    └─────────────────────────┘   │
│              ↓                           ↓                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           MESSAGE SERVICE (Business Logic)           │   │
│  │              message.service.js                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                            ↓                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              DATABASE MODELS (Sequelize)             │   │
│  │  Message, MessageStatus, Chat, User                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE (MySQL/PostgreSQL)                │
│  • messages                                                  │
│  • message_statuses                                          │
│  • chats, chat_members, users                                │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

#### ✅ Separation of Concerns
- **REST API** = Read-only operations (GET requests)
- **Socket.io** = Real-time write operations (send, update, delete)

#### ✅ Why This Design?
1. **Performance:** WebSocket connections are persistent - no HTTP overhead for every message
2. **Real-time:** Instant delivery without polling
3. **Scalability:** Efficient use of resources
4. **Industry Standard:** Same pattern used by WhatsApp, Telegram, Slack

---

## 🎯 What's Available (Current State)

### ✅ REST API Endpoints (4 Read-Only Routes)
| Method | Endpoint | Purpose | Status |
|--------|----------|---------|--------|
| GET | `/api/messages/:chatId` | Get message history | ✅ Active |
| GET | `/api/messages/unread/count` | Total unread count | ✅ Active |
| GET | `/api/messages/unread/count/:chatId` | Chat-specific unread | ✅ Active |
| GET | `/api/messages/search/:chatId` | Search in chat | ✅ Active |

### ✅ WebSocket Events (11 Real-Time Events)
| Event | Direction | Purpose | Status |
|-------|-----------|---------|--------|
| `authenticate` | Client → Server | Authenticate socket | ✅ Active |
| `join_chat` | Client → Server | Join chat room | ✅ Active |
| `leave_chat` | Client → Server | Leave chat room | ✅ Active |
| `send_message` | Client → Server | Send new message | ✅ Active |
| `typing` | Client → Server | Typing indicator | ✅ Active |
| `message_delivered` | Client → Server | Mark as delivered | ✅ Active |
| `message_read` | Client → Server | Mark as read | ✅ Active |
| `bulk_mark_read` | Client → Server | Mark multiple read | ✅ Active |
| `delete_message` | Client → Server | Delete message | ✅ Active |
| `message_sent` | Server → Client | Confirm message sent | ✅ Active |
| `new_message` | Server → Client | Broadcast new message | ✅ Active |

### ✅ Service Functions (8 Core Operations)
All available in `src/services/message.service.js`:
- `sendMessage()` - Create and save message
- `getMessages()` - Retrieve with pagination
- `updateMessageStatus()` - Update single status
- `bulkUpdateMessageStatus()` - Update multiple
- `deleteMessage()` - Soft delete
- `getUnreadCount()` - Total unread
- `getChatUnreadCount()` - Chat-specific unread
- `searchMessages()` - Search by content

## 📡 REST API Endpoints (Read-Only)

### File: `src/routes/message.routes.js`

```javascript
const express = require('express');
const controller = require('../controllers/message.controller');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(auth); // All routes require JWT authentication

// Get unread count
router.get('/unread/count', controller.getUnreadCount);

// Get chat unread count
router.get('/unread/count/:chatId', controller.getChatUnreadCount);

// Search messages in a chat
router.get('/search/:chatId', controller.searchMessages);

// Get messages for a chat
router.get('/:chatId', controller.getMessages);

module.exports = router;
```

### 1. Get Message History
**Endpoint:** `GET /api/messages/:chatId`

**Purpose:** Retrieve paginated message history for a chat

**Query Parameters:**
- `limit` (optional, default: 50) - Messages per page
- `offset` (optional, default: 0) - Skip N messages
- `before_id` (optional) - Get messages before this ID (cursor pagination)

**Example Request:**
```bash
GET /api/messages/1?limit=20&offset=0
Authorization: Bearer <your_jwt_token>
```

**Example Response:**
```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": {
    "messages": [
      {
        "id": 123,
        "chat_id": 1,
        "sender_id": 5,
        "content": "Hello!",
        "message_type": "text",
        "sent_at": "2025-11-08T10:30:00Z",
        "User": {
          "id": 5,
          "name": "John Doe",
          "profile_pic": "https://..."
        },
        "MessageStatuses": [
          { "user_id": 3, "status": "read" }
        ]
      }
    ],
    "count": 20
  }
}
```

**Implementation:** `src/controllers/message.controller.js` → `getMessages()`

---

### 2. Get Total Unread Count
**Endpoint:** `GET /api/messages/unread/count`

**Purpose:** Get total unread messages across all chats

**Example Request:**
```bash
GET /api/messages/unread/count
Authorization: Bearer <your_jwt_token>
```

**Example Response:**
```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "count": 15
  }
}
```

**Implementation:** `src/controllers/message.controller.js` → `getUnreadCount()`

---

### 3. Get Chat Unread Count
**Endpoint:** `GET /api/messages/unread/count/:chatId`

**Purpose:** Get unread messages for a specific chat

**Example Request:**
```bash
GET /api/messages/unread/count/1
Authorization: Bearer <your_jwt_token>
```

**Example Response:**
```json
{
  "success": true,
  "message": "Chat unread count retrieved successfully",
  "data": {
    "count": 3
  }
}
```

**Implementation:** `src/controllers/message.controller.js` → `getChatUnreadCount()`

---

### 4. Search Messages
**Endpoint:** `GET /api/messages/search/:chatId`

**Purpose:** Search for messages containing specific text

**Query Parameters:**
- `q` (required) - Search query

**Example Request:**
```bash
GET /api/messages/search/1?q=hello
Authorization: Bearer <your_jwt_token>
```

**Example Response:**
```json
{
  "success": true,
  "message": "Search completed successfully",
  "data": {
    "messages": [
      {
        "id": 123,
        "content": "hello there!",
        "User": { "name": "John" }
      }
    ],
    "count": 1
  }
}
```

**Implementation:** `src/controllers/message.controller.js` → `searchMessages()`

---

## ⚡ WebSocket Events (Real-Time)

### File: `src/sockets/message.socket.js`

All real-time operations use Socket.io for instant bidirectional communication.

### Connection Flow
```javascript
// 1. Connect to server
const socket = io('http://localhost:3000');

// 2. Authenticate
socket.emit('authenticate', '<your_jwt_token>');

// 3. Listen for authentication success
socket.on('authenticated', (data) => {
  console.log('Authenticated as:', data.userId);
  
  // 4. Join chat rooms
  socket.emit('join_chat', 1);
});
```

### Write Operations (Client → Server)

#### 1. Authenticate Socket
**Event:** `authenticate`

**Purpose:** Authenticate the WebSocket connection with JWT

**Payload:**
```javascript
socket.emit('authenticate', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
```

**Server Response:** `authenticated`
```javascript
socket.on('authenticated', (data) => {
  // { success: true, userId: 5 }
});
```

**What Happens:**
- Token is verified
- `socket.userId` is set
- User joins personal room: `user:${userId}`
- `user_authenticated` event emitted

**Implementation:** Line 15-28 in `message.socket.js`

---

#### 2. Join Chat Room
**Event:** `join_chat`

**Purpose:** Join a specific chat to receive messages

**Payload:**
```javascript
socket.emit('join_chat', chatId);
```

**Example:**
```javascript
socket.emit('join_chat', 1); // Join chat with ID 1
```

**Server Response:** `joined_chat`
```javascript
socket.on('joined_chat', (data) => {
  // { chatId: 1 }
});
```

**What Happens:**
- User joins room: `chat:${chatId}`
- Can now receive messages from this chat
- Can send messages to this chat

**Implementation:** Line 30-38 in `message.socket.js`

---

#### 3. Leave Chat Room
**Event:** `leave_chat`

**Purpose:** Stop receiving messages from a chat

**Payload:**
```javascript
socket.emit('leave_chat', chatId);
```

**What Happens:**
- User leaves room: `chat:${chatId}`
- Stops receiving real-time messages from this chat

**Implementation:** Line 40-44 in `message.socket.js`

---

#### 4. Send Message
**Event:** `send_message`

**Purpose:** Send a new message to a chat (PRIMARY MESSAGE SENDING METHOD)

**Payload:**
```javascript
socket.emit('send_message', {
  tempId: 'temp-' + Date.now(),  // Client-generated temporary ID
  chat_id: 1,
  content: 'Hello everyone!',
  message_type: 'text',          // 'text' | 'image' | 'video' | 'audio' | 'file'
  reply_to: null                 // Optional: message ID being replied to
});
```

**Server Responses:**

**Success - To Sender:** `message_sent`
```javascript
socket.on('message_sent', (data) => {
  // {
  //   tempId: 'temp-1699435200000',
  //   message: {
  //     id: 123,
  //     chat_id: 1,
  //     content: 'Hello everyone!',
  //     User: { id: 5, name: 'John' },
  //     ...
  //   }
  // }
  // Replace temp message with real message in UI
});
```

**Broadcast - To Recipients:** `new_message`
```javascript
socket.on('new_message', (message) => {
  // {
  //   id: 123,
  //   chat_id: 1,
  //   content: 'Hello everyone!',
  //   User: { id: 5, name: 'John' },
  //   ...
  // }
  // Add message to chat UI
});
```

**Error:** `message_error`
```javascript
socket.on('message_error', (error) => {
  // { tempId: 'temp-...', message: 'Error details' }
});
```

**What Happens:**
1. Server validates authentication and chat membership
2. Message saved to database with status 'sent'
3. MessageStatus entries created for all recipients
4. Sender receives confirmation with real message ID
5. All chat members receive the new message
6. Message includes sender info and reply info (if applicable)

**Implementation:** Line 46-95 in `message.socket.js`

---

#### 5. Typing Indicator
**Event:** `typing`

**Purpose:** Show/hide typing indicator to other users

**Payload:**
```javascript
// User starts typing
socket.emit('typing', {
  chat_id: 1,
  is_typing: true
});

// User stops typing (after 2 seconds of inactivity)
socket.emit('typing', {
  chat_id: 1,
  is_typing: false
});
```

**Server Broadcast:** `user_typing`
```javascript
socket.on('user_typing', (data) => {
  // { chat_id: 1, user_id: 5, is_typing: true }
  // Show "John is typing..." in UI
});
```

**What Happens:**
- Broadcast to all chat members except sender
- Used to show "User is typing..." indicator

**Implementation:** Line 97-105 in `message.socket.js`

---

#### 6. Mark as Delivered
**Event:** `message_delivered`

**Purpose:** Mark message as delivered when received

**Payload:**
```javascript
socket.emit('message_delivered', {
  message_id: 123
});
```

**Server Response - To Sender:** `message_status_updated`
```javascript
socket.on('message_status_updated', (data) => {
  // { message_id: 123, status: 'delivered', user_id: 5 }
  // Show double gray checkmark
});
```

**What Happens:**
1. MessageStatus updated to 'delivered' for this user
2. Sender is notified via their personal room
3. Sender's UI shows double gray checkmark

**Implementation:** Line 107-132 in `message.socket.js`

---

#### 7. Mark as Read
**Event:** `message_read`

**Purpose:** Mark message as read when user views it

**Payload:**
```javascript
socket.emit('message_read', {
  message_id: 123,
  chat_id: 1
});
```

**Server Responses:**

**To Sender:** `message_status_updated`
```javascript
socket.on('message_status_updated', (data) => {
  // { message_id: 123, status: 'read', user_id: 5 }
  // Show double blue checkmark
});
```

**To Chat (Group):** `message_read_by`
```javascript
socket.on('message_read_by', (data) => {
  // { message_id: 123, user_id: 5, chat_id: 1 }
  // Show "Read by John" in group chat
});
```

**What Happens:**
1. MessageStatus updated to 'read' for this user
2. Sender notified via personal room
3. Group chat members notified who read it
4. Sender's UI shows double blue checkmark

**Implementation:** Line 134-164 in `message.socket.js`

---

#### 8. Bulk Mark as Read
**Event:** `bulk_mark_read`

**Purpose:** Mark multiple messages as read at once (when opening chat)

**Payload:**
```javascript
socket.emit('bulk_mark_read', {
  chat_id: 1,
  message_ids: [120, 121, 122, 123]
});
```

**Server Response:** `messages_read_bulk`
```javascript
socket.on('messages_read_bulk', (data) => {
  // { message_ids: [120, 121, 122, 123], user_id: 5, chat_id: 1 }
});
```

**What Happens:**
1. All specified messages marked as 'read'
2. All senders notified via their personal rooms
3. Efficient batch operation (single DB query)

**Implementation:** Line 166-198 in `message.socket.js`

---

#### 9. Delete Message
**Event:** `delete_message`

**Purpose:** Delete your own message (soft delete)

**Payload:**
```javascript
socket.emit('delete_message', {
  message_id: 123,
  chat_id: 1
});
```

**Server Broadcast:** `message_deleted`
```javascript
socket.on('message_deleted', (data) => {
  // {
  //   message_id: 123,
  //   message: {
  //     id: 123,
  //     content: 'This message was deleted',
  //     ...
  //   }
  // }
  // Update message in UI to show "This message was deleted"
});
```

**Error:** `delete_error`
```javascript
socket.on('delete_error', (error) => {
  // { message: 'You can only delete your own messages' }
});
```

**What Happens:**
1. Verify user is the sender
2. Message content changed to "This message was deleted"
3. Message type changed to 'text'
4. All chat members notified
5. Original message data is preserved in database

**Implementation:** Line 200-217 in `message.socket.js`

---

## 🔧 Service Layer

### File: `src/services/message.service.js`

Core business logic used by both REST controllers and Socket handlers.

### 1. sendMessage()
**Purpose:** Create and persist a new message

**Parameters:**
```javascript
sendMessage(userId, {
  chat_id,
  content,
  message_type = 'text',
  reply_to = null
})
```

**Returns:** Complete message object with User and ReplyTo associations

**Process:**
1. ✅ Verify user is chat member
2. ✅ Create message record
3. ✅ Create MessageStatus for all recipients (status: 'sent')
4. ✅ Return with associations (User, ReplyTo)

**Used By:** Socket handler `send_message` event

---

### 2. getMessages()
**Purpose:** Retrieve paginated message history

**Parameters:**
```javascript
getMessages(userId, chatId, {
  limit = 50,
  offset = 0,
  before_id = null
})
```

**Returns:** Array of messages with associations (reversed to chronological order)

**Process:**
1. ✅ Verify user is chat member
2. ✅ Build query with pagination
3. ✅ Include User, ReplyTo, MessageStatuses
4. ✅ Order by ID DESC, then reverse

**Used By:** REST endpoint `GET /api/messages/:chatId`

---

### 3. updateMessageStatus()
**Purpose:** Update status for a single message

**Parameters:**
```javascript
updateMessageStatus(userId, messageId, status)
```

**Returns:** MessageStatus record

**Process:**
1. ✅ Find message
2. ✅ Verify user is chat member
3. ✅ Create or update MessageStatus
4. ✅ Set updated_at timestamp

**Used By:** Socket handlers `message_delivered` and `message_read`

---

### 4. bulkUpdateMessageStatus()
**Purpose:** Update status for multiple messages at once

**Parameters:**
```javascript
bulkUpdateMessageStatus(userId, chatId, messageIds, status)
```

**Returns:** Update result

**Process:**
1. ✅ Verify user is chat member
2. ✅ Bulk update all MessageStatus records
3. ✅ Single efficient database query

**Used By:** Socket handler `bulk_mark_read` event

---

### 5. deleteMessage()
**Purpose:** Soft delete a message (preserves data)

**Parameters:**
```javascript
deleteMessage(userId, messageId)
```

**Returns:** Updated message

**Process:**
1. ✅ Find message
2. ✅ Verify user is sender (only sender can delete)
3. ✅ Update content to "This message was deleted"
4. ✅ Change type to 'text'

**Used By:** Socket handler `delete_message` event

---

### 6. getUnreadCount()
**Purpose:** Get total unread messages for user

**Parameters:**
```javascript
getUnreadCount(userId)
```

**Returns:** Number (count)

**Process:**
1. ✅ Count MessageStatus where user_id matches
2. ✅ Status is 'sent' or 'delivered' (not 'read')

**Used By:** REST endpoint `GET /api/messages/unread/count`

---

### 7. getChatUnreadCount()
**Purpose:** Get unread messages for specific chat

**Parameters:**
```javascript
getChatUnreadCount(userId, chatId)
```

**Returns:** Number (count)

**Process:**
1. ✅ Count MessageStatus for this chat
2. ✅ Where user_id matches
3. ✅ Status is 'sent' or 'delivered'

**Used By:** REST endpoint `GET /api/messages/unread/count/:chatId`

---

### 8. searchMessages()
**Purpose:** Search messages by content

**Parameters:**
```javascript
searchMessages(userId, chatId, searchQuery)
```

**Returns:** Array of matching messages

**Process:**
1. ✅ Verify user is chat member
2. ✅ SQL LIKE query on content
3. ✅ Include User association
4. ✅ Order by sent_at DESC
5. ✅ Limit to 50 results

**Used By:** REST endpoint `GET /api/messages/search/:chatId`

---

## 🔄 How Everything Works Together

### Scenario 1: User Sends a Message

```
┌──────────────┐
│   CLIENT A   │ (Sender)
└──────────────┘
       │
       │ 1. socket.emit('send_message', { tempId, chat_id, content })
       ↓
┌──────────────────────────────────────┐
│     SOCKET HANDLER (Server)          │
│   message.socket.js - Line 46        │
└──────────────────────────────────────┘
       │
       │ 2. Validate authentication & chat membership
       ↓
┌──────────────────────────────────────┐
│    MESSAGE SERVICE (Business Logic)  │
│   message.service.js - sendMessage() │
└──────────────────────────────────────┘
       │
       │ 3. Save to database
       ↓
┌──────────────────────────────────────┐
│        DATABASE                      │
│  - Insert into messages table        │
│  - Insert MessageStatus for each     │
│    recipient (status: 'sent')        │
└──────────────────────────────────────┘
       │
       │ 4. Return complete message
       ↓
┌──────────────────────────────────────┐
│     SOCKET HANDLER (Server)          │
└──────────────────────────────────────┘
       │
       ├─────────────────────────────────────┐
       │                                     │
       │ 5. Emit to sender                   │ 6. Broadcast to chat
       ↓                                     ↓
┌──────────────┐                      ┌──────────────┐
│   CLIENT A   │                      │   CLIENT B   │ (Recipients)
│              │                      │   CLIENT C   │
└──────────────┘                      └──────────────┘
  message_sent event                    new_message event
  (with tempId & real message)          (broadcast to chat room)
```

---

### Scenario 2: User Opens a Chat (Load History)

```
┌──────────────┐
│   CLIENT     │
└──────────────┘
       │
       │ 1. GET /api/messages/1?limit=50
       │    Authorization: Bearer <token>
       ↓
┌──────────────────────────────────────┐
│    REST CONTROLLER (Server)          │
│   message.controller.js              │
│   getMessages()                      │
└──────────────────────────────────────┘
       │
       │ 2. Extract user from JWT token
       ↓
┌──────────────────────────────────────┐
│    MESSAGE SERVICE                   │
│   message.service.js - getMessages() │
└──────────────────────────────────────┘
       │
       │ 3. Query database
       ↓
┌──────────────────────────────────────┐
│        DATABASE                      │
│  SELECT * FROM messages              │
│  WHERE chat_id = 1                   │
│  INCLUDE User, MessageStatuses       │
│  ORDER BY id DESC                    │
│  LIMIT 50                            │
└──────────────────────────────────────┘
       │
       │ 4. Return messages array
       ↓
┌──────────────┐
│   CLIENT     │ Display messages in UI
└──────────────┘
```

---

### Scenario 3: Message Status Flow (Sent → Delivered → Read)

```
STATUS: SENT (Initial)
┌────────────────────────────────────────────┐
│  Message created in database               │
│  MessageStatus: { status: 'sent' }         │
│  Sender UI: Single checkmark ✓             │
└────────────────────────────────────────────┘
                   ↓
         Recipient receives message
                   ↓
STATUS: DELIVERED
┌────────────────────────────────────────────┐
│  socket.emit('message_delivered', {...})   │
│  MessageStatus: { status: 'delivered' }    │
│  Sender UI: Double gray checkmark ✓✓       │
└────────────────────────────────────────────┘
                   ↓
         Recipient opens/views chat
                   ↓
STATUS: READ
┌────────────────────────────────────────────┐
│  socket.emit('message_read', {...})        │
│  MessageStatus: { status: 'read' }         │
│  Sender UI: Double blue checkmark ✓✓       │
└────────────────────────────────────────────┘
```

---

## 💾 Database Schema

### Messages Table
```sql
CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  chat_id INT NOT NULL,
  sender_id INT NOT NULL,
  content TEXT NOT NULL,
  message_type ENUM('text', 'image', 'video', 'audio', 'file') DEFAULT 'text',
  reply_to INT NULL,
  sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
  
  FOREIGN KEY (chat_id) REFERENCES chats(id),
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (reply_to) REFERENCES messages(id)
);
```

**Purpose:** Stores all messages

**Key Fields:**
- `content`: Message text or media URL
- `message_type`: Type of message (text/image/video/audio/file)
- `reply_to`: ID of message being replied to (NULL if not a reply)
- `status`: Overall status (mainly for sender's view)

---

### MessageStatus Table
```sql
CREATE TABLE message_statuses (
  message_id INT NOT NULL,
  user_id INT NOT NULL,
  status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (message_id, user_id),
  FOREIGN KEY (message_id) REFERENCES messages(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Purpose:** Track individual status per recipient (critical for group chats)

**Why This Exists:**
- In group chats, different users read messages at different times
- This table tracks who has read what
- Sender can see "Read by 3 of 5 members"

---

### Relationships
```
users (1) ──── (many) messages
users (1) ──── (many) message_statuses
messages (1) ──── (many) message_statuses
chats (1) ──── (many) messages
messages (1) ──── (many) messages (reply_to relationship)
```

---

## 📚 Quick Reference Guide

### When to Use REST API
✅ Loading message history on app open
✅ Pagination (load more messages)
✅ Getting unread count for badge
✅ Searching messages
✅ Any read-only operation

### When to Use Socket.io
✅ Sending new messages
✅ Marking messages as read/delivered
✅ Deleting messages
✅ Typing indicators
✅ Any real-time write operation

---

### Common Patterns

#### Pattern 1: Send Message with Optimistic UI
```javascript
const tempId = 'temp-' + Date.now();

// 1. Show immediately in UI (optimistic)
addMessageToUI({
  tempId,
  content: 'Hello!',
  status: 'sending',
  User: currentUser
});

// 2. Send via socket
socket.emit('send_message', {
  tempId,
  chat_id: 1,
  content: 'Hello!',
  message_type: 'text'
});

// 3. Replace when confirmed
socket.on('message_sent', ({ tempId, message }) => {
  replaceMessageInUI(tempId, message);
});

// 4. Handle errors
socket.on('message_error', ({ tempId, message }) => {
  showError(tempId, message);
});
```

---

#### Pattern 2: Mark All Messages as Read When Opening Chat
```javascript
function openChat(chatId) {
  // 1. Load message history
  fetch(`/api/messages/${chatId}?limit=50`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => {
    displayMessages(data.messages);
    
    // 2. Get unread message IDs
    const unreadIds = data.messages
      .filter(m => m.MessageStatuses.some(s => 
        s.user_id === currentUserId && s.status !== 'read'
      ))
      .map(m => m.id);
    
    // 3. Mark all as read
    if (unreadIds.length > 0) {
      socket.emit('bulk_mark_read', {
        chat_id: chatId,
        message_ids: unreadIds
      });
    }
  });
}
```

---

#### Pattern 3: Typing Indicator with Debounce
```javascript
let typingTimeout;

chatInput.addEventListener('input', () => {
  // Clear existing timeout
  clearTimeout(typingTimeout);
  
  // Start typing
  socket.emit('typing', {
    chat_id: currentChatId,
    is_typing: true
  });
  
  // Stop after 2s of inactivity
  typingTimeout = setTimeout(() => {
    socket.emit('typing', {
      chat_id: currentChatId,
      is_typing: false
    });
  }, 2000);
});
```

---

## 🎨 Frontend Integration Examples

### React Hook
```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function useMessages(chatId, token) {
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial messages (REST)
    fetch(`/api/messages/${chatId}?limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setMessages(data.data.messages);
      setLoading(false);
    });

    // Setup socket (Real-time)
    const newSocket = io('http://localhost:3000');
    
    newSocket.emit('authenticate', token);
    
    newSocket.on('authenticated', () => {
      newSocket.emit('join_chat', chatId);
    });
    
    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
      
      // Auto mark as delivered
      newSocket.emit('message_delivered', {
        message_id: message.id
      });
    });
    
    newSocket.on('message_sent', ({ tempId, message }) => {
      setMessages(prev => 
        prev.map(m => m.tempId === tempId ? message : m)
      );
    });
    
    setSocket(newSocket);
    
    return () => newSocket.close();
  }, [chatId, token]);

  const sendMessage = (content) => {
    const tempId = 'temp-' + Date.now();
    
    // Optimistic update
    setMessages(prev => [...prev, {
      tempId,
      content,
      status: 'sending',
      User: currentUser,
      sent_at: new Date()
    }]);
    
    socket.emit('send_message', {
      tempId,
      chat_id: chatId,
      content,
      message_type: 'text'
    });
  };

  return { messages, sendMessage, loading };
}
```

---

### Vue.js Composable
```javascript
// useMessages.js
import { ref, onMounted, onUnmounted } from 'vue';
import io from 'socket.io-client';

export function useMessages(chatId, token) {
  const messages = ref([]);
  const socket = ref(null);
  const loading = ref(true);

  onMounted(async () => {
    // Load initial messages
    const res = await fetch(`/api/messages/${chatId}?limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    messages.value = data.data.messages;
    loading.value = false;

    // Setup socket
    socket.value = io('http://localhost:3000');
    socket.value.emit('authenticate', token);
    
    socket.value.on('authenticated', () => {
      socket.value.emit('join_chat', chatId);
    });
    
    socket.value.on('new_message', (message) => {
      messages.value.push(message);
    });
  });

  onUnmounted(() => {
    socket.value?.close();
  });

  const sendMessage = (content) => {
    const tempId = 'temp-' + Date.now();
    
    messages.value.push({
      tempId,
      content,
      status: 'sending'
    });
    
    socket.value.emit('send_message', {
      tempId,
      chat_id: chatId,
      content,
      message_type: 'text'
    });
  };

  return { messages, sendMessage, loading };
}
```

---

## 🚨 Important Notes

### Authentication
- All REST endpoints require `Authorization: Bearer <token>` header
- Socket connections require `authenticate` event with token
- User ID is extracted from JWT token

### Authorization
- Users can only access chats they're members of
- Users can only delete their own messages
- Chat membership is verified before every operation

### Performance Tips
1. Use `bulk_mark_read` instead of multiple `message_read` calls
2. Implement pagination for loading message history
3. Use `before_id` for cursor-based pagination (more efficient)
4. Add database indexes on frequently queried fields

### Error Handling
- Always listen for error events on socket
- Handle authentication failures gracefully
- Implement retry logic for failed operations
- Show user-friendly error messages

---

## 📊 File Structure Summary

```
src/
├── routes/
│   └── message.routes.js          ✅ 4 REST endpoints (read-only)
├── controllers/
│   └── message.controller.js      ✅ 4 controller functions
├── services/
│   └── message.service.js         ✅ 8 service functions (business logic)
├── sockets/
│   └── message.socket.js          ✅ 11 socket events (real-time)
├── models/
│   ├── message.model.js           ✅ Message model
│   └── messageStatus.model.js     ✅ MessageStatus model
└── constants.js                   ✅ Event names, enums
```

---

## 🎯 Summary

### What You Have
✅ **Complete messaging system** with REST API and WebSocket support
✅ **Clean architecture** - reads via REST, writes via Socket.io  
✅ **Message status tracking** - sent, delivered, read
✅ **Real-time features** - instant delivery, typing indicators
✅ **Scalable design** - follows industry best practices
✅ **Production-ready** - proper error handling and validation

### What This Enables
✅ Private (1-on-1) chats
✅ Group chats
✅ Message replies
✅ Message deletion
✅ Message search
✅ Unread counts
✅ Read receipts
✅ Typing indicators

### Next Steps (Optional Enhancements)
- Media upload (images, videos)
- Voice messages
- Push notifications
- End-to-end encryption
- Message forwarding
- Message editing
- Voice/video calls

---

**This document reflects the actual implementation as of November 8, 2025.**  
**All code examples are based on the real codebase.**

---

## 🔗 Related Documentation
- `MESSAGING_IMPLEMENTATION.md` - Detailed implementation guide
- `MESSAGE_API_EXAMPLES.md` - API usage examples
- `COVERAGE_ANALYSIS.md` - Feature completeness analysis
- `API_EXAMPLES.md` - General API documentation

