# 🎯 Private Chat Testing Guide (Frontend Integration)

## 📋 Overview

This guide covers **ONLY private (one-to-one) chats** - no group chats.  
Complete step-by-step instructions for frontend developers to test the messaging system.

---

## 🚀 Quick Start

### Step 1: Start the Server
```powershell
cd c:\Users\3008\Desktop\whatsapp-design
npm start
```

Server runs on: `http://localhost:3000`

---

## 📡 API Calls from Frontend

### 1️⃣ Create a Private Chat

**When to call:** When user selects another user to start a conversation

**Endpoint:** `POST /api/chats`

**Request:**
```javascript
fetch('http://localhost:3000/api/chats', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: 1,              // Current logged-in user ID
    is_group: false,         // Always false for private chat
    other_user_id: 2         // The user you want to chat with
  })
})
.then(res => res.json())
.then(data => {
  console.log('Chat created:', data.data.chat);
  const chatId = data.data.chat.id; // Save this chat ID!
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chat": {
      "id": 1,                    // ⭐ SAVE THIS - You need it for messaging
      "is_group": false,
      "created_by": 1,
      "created_at": "2025-11-11T10:00:00.000Z"
    }
  }
}
```

**Notes:**
- If chat already exists between these two users, it returns the existing chat
- No duplicate chats are created

---

### 2️⃣ Get All Chats for Current User

**When to call:** When loading the chat list/sidebar

**Endpoint:** `GET /api/chats`

**Request:**
```javascript
fetch('http://localhost:3000/api/chats', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('User chats:', data.data.chats);
  // Display in UI: list of chats with other user info
});
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chats": [
      {
        "id": 1,
        "is_group": false,
        "created_at": "2025-11-11T10:00:00.000Z",
        "Users": [
          {
            "id": 1,
            "name": "Test User A",
            "phone": "1234567890",
            "profile_pic": null,
            "about": "Available"
          },
          {
            "id": 2,
            "name": "Test User B",
            "phone": "0987654321",
            "profile_pic": null,
            "about": "Busy"
          }
        ]
      }
    ]
  }
}
```

**Display in UI:**
- Show the other user's name, profile pic, and about
- Store the `chat.id` for that conversation

---

### 3️⃣ Get Messages for a Chat

**When to call:** When user opens a chat conversation

**Endpoint:** `GET /api/messages/:chatId`

**Request:**
```javascript
const chatId = 1; // From the chat you want to view

fetch(`http://localhost:3000/api/messages/${chatId}?limit=50&offset=0`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('Messages:', data.data.messages);
  // Display messages in chat window
});
```

**Query Parameters:**
- `limit`: Number of messages to fetch (default: 50)
- `offset`: For pagination (default: 0)
- `before_id`: Get messages before a specific message ID (optional)

**Response:**
```json
{
  "success": true,
  "message": "Messages retrieved successfully",
  "data": {
    "messages": [
      {
        "id": 1,
        "chat_id": 1,
        "sender_id": 1,
        "content": "Hello!",
        "message_type": "text",
        "sent_at": "2025-11-11T10:30:00.000Z",
        "reply_to": null,
        "User": {
          "id": 1,
          "name": "Test User A",
          "profile_pic": null
        },
        "MessageStatuses": [
          {
            "user_id": 2,
            "status": "delivered",  // 'sent', 'delivered', or 'read'
            "updated_at": "2025-11-11T10:30:01.000Z"
          }
        ]
      }
    ],
    "count": 1
  }
}
```

**Message Status Values:**
- `sent` = Message sent but not delivered (recipient offline)
- `delivered` = Message delivered to recipient (recipient was online)
- `read` = Recipient has read the message

---

### 4️⃣ Get Unread Message Count

**When to call:** To show notification badge on chat list

**Endpoint:** `GET /api/messages/unread/count`

**Request:**
```javascript
fetch('http://localhost:3000/api/messages/unread/count', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('Unread messages:', data.data.count);
  // Show badge with count
});
```

**Response:**
```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "count": 5  // Total unread messages across all chats
  }
}
```

---

### 5️⃣ Search Messages

**When to call:** When user searches within a chat

**Endpoint:** `GET /api/messages/search/:chatId?q=searchTerm`

**Request:**
```javascript
const chatId = 1;
const searchTerm = 'hello';

fetch(`http://localhost:3000/api/messages/search/${chatId}?q=${searchTerm}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('Search results:', data.data.messages);
});
```

**Response:**
```json
{
  "success": true,
  "message": "Search completed successfully",
  "data": {
    "messages": [
      {
        "id": 1,
        "content": "Hello World!",
        "sender_id": 1,
        "sent_at": "2025-11-11T10:30:00.000Z"
      }
    ],
    "count": 1
  }
}
```

---

## 🔌 Socket.io Integration

### Setup Socket Connection

**Include Socket.io in your HTML:**
```html
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
```

**Or install via npm:**
```bash
npm install socket.io-client
```

**Initialize Connection:**
```javascript
import io from 'socket.io-client';

// Connect to server
const socket = io('http://localhost:3000');

// Save socket instance globally
window.chatSocket = socket;
```

---

### 1️⃣ Authenticate User

**When to call:** As soon as socket connects (on app load)

```javascript
const currentUserId = 1; // Get from your auth state

socket.on('connect', () => {
  console.log('✅ Socket connected');
  
  // Authenticate immediately
  socket.emit('user_authenticated', currentUserId);
});

// Listen for authentication confirmation
socket.on('authenticated', (data) => {
  console.log('✅ User authenticated:', data);
  // data = { success: true, userId: 1 }
});

// Handle disconnection
socket.on('disconnect', () => {
  console.log('❌ Socket disconnected');
});
```

---

### 2️⃣ Send a Message

**When to call:** When user types and sends a message

```javascript
function sendMessage(chatId, messageContent) {
  const messageData = {
    chat_id: chatId,           // Required: The chat ID
    content: messageContent,    // Required: The message text
    message_type: 'text',       // Required: 'text', 'image', 'video', 'audio', 'file'
    tempId: Date.now()          // Optional: For tracking on frontend
  };
  
  socket.emit('send_message', messageData);
}

// Example usage:
sendMessage(1, 'Hello from frontend!');
```

**Listen for Confirmation:**
```javascript
socket.on('message_sent', (data) => {
  console.log('✅ Message sent successfully:', data);
  
  // data contains:
  // {
  //   tempId: 1699123456789,
  //   message: {
  //     id: 1,              // Real message ID from database
  //     chat_id: 1,
  //     sender_id: 1,
  //     content: "Hello from frontend!",
  //     sent_at: "2025-11-11T10:30:00.000Z"
  //   }
  // }
  
  // Update UI: Replace temp message with real message ID
});
```

**Get Delivery Information:**
```javascript
socket.on('message_delivery_info', (info) => {
  console.log('📊 Delivery info:', info);
  
  // info contains:
  // {
  //   message_id: 1,
  //   delivered: 1,    // Number of recipients who received it (online)
  //   queued: 0,       // Number of recipients who will get it later (offline)
  //   total: 1         // Total recipients in the chat
  // }
  
  // Update UI: Show delivery status (✓ or ✓✓)
  if (info.delivered === info.total) {
    // All delivered - show double check mark ✓✓
  } else if (info.queued > 0) {
    // Some offline - show single check mark ✓
  }
});
```

---

### 3️⃣ Receive Messages

**When to call:** Automatically listen for incoming messages

```javascript
socket.on('new_message', (message) => {
  console.log('📨 New message received:', message);
  
  // message contains:
  // {
  //   id: 2,
  //   chat_id: 1,
  //   sender_id: 2,              // Who sent it
  //   content: "Hi there!",
  //   message_type: "text",
  //   sent_at: "2025-11-11T10:35:00.000Z",
  //   User: {
  //     id: 2,
  //     name: "Test User B",
  //     profile_pic: null
  //   }
  // }
  
  // Update UI: Add message to chat window
  displayMessage(message);
  
  // Play notification sound
  playNotificationSound();
  
  // If chat window is open, mark as read
  if (currentChatId === message.chat_id) {
    markMessageAsRead(message.id, message.chat_id);
  }
});
```

---

### 4️⃣ Mark Message as Delivered

**When to call:** When message appears on user's screen (automatic)

```javascript
socket.on('new_message', (message) => {
  // Display message first
  displayMessage(message);
  
  // Then mark as delivered
  socket.emit('message_delivered', {
    message_id: message.id
  });
});
```

---

### 5️⃣ Mark Message as Read

**When to call:** When user opens the chat or scrolls to the message

```javascript
function markMessageAsRead(messageId, chatId) {
  socket.emit('message_read', {
    message_id: messageId,
    chat_id: chatId
  });
}

// Example: Mark all messages as read when chat is opened
function markAllMessagesAsRead(chatId, messageIds) {
  messageIds.forEach(msgId => {
    markMessageAsRead(msgId, chatId);
  });
}
```

---

### 6️⃣ Receive Status Updates

**When to call:** Automatically listen for status changes

```javascript
socket.on('message_status_updated', (statusUpdate) => {
  console.log('📬 Status updated:', statusUpdate);
  
  // statusUpdate contains:
  // {
  //   message_id: 1,
  //   status: "read",        // 'delivered' or 'read'
  //   user_id: 2             // Who updated the status
  // }
  
  // Update UI: Change check marks
  // delivered = ✓✓ (gray)
  // read = ✓✓ (blue)
  updateMessageStatus(statusUpdate.message_id, statusUpdate.status);
});
```

---

### 7️⃣ Typing Indicators

**When to call:** When user is typing

```javascript
let typingTimeout;

function onUserTyping(chatId) {
  // Emit typing event
  socket.emit('typing', {
    chat_id: chatId,
    is_typing: true
  });
  
  // Auto-stop typing after 3 seconds
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing', {
      chat_id: chatId,
      is_typing: false
    });
  }, 3000);
}

// Listen for other user typing
socket.on('user_typing', (data) => {
  console.log('👤 User typing:', data);
  
  // data contains:
  // {
  //   chat_id: 1,
  //   user_id: 2,
  //   is_typing: true
  // }
  
  // Update UI: Show "User B is typing..."
  if (data.is_typing) {
    showTypingIndicator(data.chat_id, data.user_id);
  } else {
    hideTypingIndicator(data.chat_id, data.user_id);
  }
});
```

---

### 8️⃣ Delete Message

**When to call:** When user deletes their own message

```javascript
function deleteMessage(messageId, chatId) {
  socket.emit('delete_message', {
    message_id: messageId,
    chat_id: chatId
  });
}

// Listen for deleted messages
socket.on('message_deleted', (data) => {
  console.log('🗑️ Message deleted:', data);
  
  // data contains:
  // {
  //   message_id: 1,
  //   message: {
  //     id: 1,
  //     content: "This message was deleted",  // Content is replaced
  //     ...
  //   }
  // }
  
  // Update UI: Replace message content with "This message was deleted"
  updateDeletedMessage(data.message_id, data.message.content);
});
```

---

## 🎯 Complete Frontend Flow

### Scenario: User A sends message to User B

```javascript
// ============================================
// USER A (SENDER)
// ============================================

// 1. Connect and authenticate
const socketA = io('http://localhost:3000');
socketA.on('connect', () => {
  socketA.emit('user_authenticated', 1); // User A ID
});

// 2. Create or get existing chat
fetch('http://localhost:3000/api/chats', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: 1,
    is_group: false,
    other_user_id: 2
  })
})
.then(res => res.json())
.then(data => {
  const chatId = data.data.chat.id;
  
  // 3. Send message
  socketA.emit('send_message', {
    chat_id: chatId,
    content: 'Hey! How are you?',
    message_type: 'text',
    tempId: Date.now()
  });
});

// 4. Listen for confirmation
socketA.on('message_sent', (data) => {
  console.log('✅ Message sent:', data.message.id);
});

// 5. Check delivery status
socketA.on('message_delivery_info', (info) => {
  if (info.delivered > 0) {
    console.log('✓✓ Delivered to recipient');
  } else {
    console.log('✓ Sent (recipient offline)');
  }
});

// 6. Listen for read receipt
socketA.on('message_status_updated', (status) => {
  if (status.status === 'read') {
    console.log('✓✓ Read by recipient (blue checks)');
  }
});


// ============================================
// USER B (RECEIVER)
// ============================================

// 1. Connect and authenticate
const socketB = io('http://localhost:3000');
socketB.on('connect', () => {
  socketB.emit('user_authenticated', 2); // User B ID
});

// 2. Listen for incoming messages
socketB.on('new_message', (message) => {
  console.log('📨 Received:', message.content);
  
  // Display in UI
  addMessageToChat(message);
  
  // Auto-mark as delivered
  socketB.emit('message_delivered', {
    message_id: message.id
  });
  
  // If chat is open, mark as read
  if (currentOpenChatId === message.chat_id) {
    socketB.emit('message_read', {
      message_id: message.id,
      chat_id: message.chat_id
    });
  }
});

// 3. Reply to User A
socketB.emit('send_message', {
  chat_id: 1,
  content: "I'm good! Thanks for asking.",
  message_type: 'text'
});
```

---

## 📱 UI Implementation Examples

### Display Message with Status

```javascript
function displayMessage(message, currentUserId) {
  const isSentByMe = message.sender_id === currentUserId;
  
  let statusIcon = '';
  if (isSentByMe) {
    // Check message status for recipient
    const recipientStatus = message.MessageStatuses?.[0];
    if (recipientStatus) {
      switch (recipientStatus.status) {
        case 'sent':
          statusIcon = '✓'; // Single gray check
          break;
        case 'delivered':
          statusIcon = '✓✓'; // Double gray checks
          break;
        case 'read':
          statusIcon = '<span style="color: blue;">✓✓</span>'; // Blue checks
          break;
      }
    }
  }
  
  const messageHTML = `
    <div class="message ${isSentByMe ? 'sent' : 'received'}">
      <div class="message-content">${message.content}</div>
      <div class="message-time">
        ${new Date(message.sent_at).toLocaleTimeString()} 
        ${statusIcon}
      </div>
    </div>
  `;
  
  document.getElementById('chat-window').innerHTML += messageHTML;
}
```

---

### Update Message Status

```javascript
function updateMessageStatus(messageId, status) {
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  const statusElement = messageElement.querySelector('.message-status');
  
  switch (status) {
    case 'delivered':
      statusElement.innerHTML = '✓✓'; // Gray double check
      statusElement.style.color = 'gray';
      break;
    case 'read':
      statusElement.innerHTML = '✓✓'; // Blue double check
      statusElement.style.color = '#4FC3F7';
      break;
  }
}
```

---

### Show Typing Indicator

```javascript
function showTypingIndicator(chatId, userId) {
  if (currentOpenChatId !== chatId) return;
  
  const indicator = document.getElementById('typing-indicator');
  indicator.innerHTML = `
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
    <span>User is typing...</span>
  `;
  indicator.style.display = 'block';
}

function hideTypingIndicator(chatId, userId) {
  const indicator = document.getElementById('typing-indicator');
  indicator.style.display = 'none';
}
```

---

## 🧪 Testing Steps

### Test 1: Send Message (Both Users Online)

1. Open two browser tabs/windows
2. **Tab 1 (User A):**
   ```javascript
   const socket = io('http://localhost:3000');
   socket.on('connect', () => socket.emit('user_authenticated', 1));
   socket.on('message_sent', (d) => console.log('Sent:', d));
   socket.on('message_delivery_info', (i) => console.log('Delivery:', i));
   
   // Send message
   socket.emit('send_message', {
     chat_id: 1,
     content: 'Hello!',
     message_type: 'text'
   });
   ```

3. **Tab 2 (User B):**
   ```javascript
   const socket = io('http://localhost:3000');
   socket.on('connect', () => socket.emit('user_authenticated', 2));
   socket.on('new_message', (m) => console.log('Received:', m));
   ```

**Expected Result:**
- User A sees: `message_sent` and `message_delivery_info` with `delivered: 1`
- User B sees: `new_message` event

---

### Test 2: Offline Message Delivery

1. **User B is offline** (close tab)
2. **User A sends message:**
   ```javascript
   socket.emit('send_message', {
     chat_id: 1,
     content: 'Are you there?',
     message_type: 'text'
   });
   ```

**Expected Result:**
- User A sees: `message_delivery_info` with `queued: 1`
- Message stored in database with status `sent`

3. **User B comes online:**
   ```javascript
   const socket = io('http://localhost:3000');
   socket.on('connect', () => socket.emit('user_authenticated', 2));
   socket.on('new_message', (m) => console.log('Pending:', m));
   ```

**Expected Result:**
- User B receives all pending messages automatically
- Status updates to `delivered`

---

### Test 3: Read Receipts

1. User B receives message
2. User B marks as read:
   ```javascript
   socket.emit('message_read', {
     message_id: 1,
     chat_id: 1
   });
   ```

**Expected Result:**
- User A sees: `message_status_updated` event with `status: 'read'`
- User A's UI shows blue check marks

---

## ✅ API & Socket.io Quick Reference

### REST API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/chats` | Create private chat |
| GET | `/api/chats` | Get all user's chats |
| GET | `/api/messages/:chatId` | Get messages in chat |
| GET | `/api/messages/unread/count` | Get unread count |
| GET | `/api/messages/search/:chatId?q=term` | Search messages |

---

### Socket.io Events

#### Events to EMIT (Frontend → Backend)

| Event | Data | Purpose |
|-------|------|---------|
| `user_authenticated` | `userId` (number) | Authenticate user |
| `send_message` | `{chat_id, content, message_type, tempId}` | Send message |
| `message_delivered` | `{message_id}` | Mark as delivered |
| `message_read` | `{message_id, chat_id}` | Mark as read |
| `typing` | `{chat_id, is_typing}` | Typing indicator |
| `delete_message` | `{message_id, chat_id}` | Delete message |

---

#### Events to LISTEN (Backend → Frontend)

| Event | Data | Purpose |
|-------|------|---------|
| `authenticated` | `{success, userId}` | Auth confirmation |
| `new_message` | `{id, chat_id, sender_id, content, ...}` | Receive message |
| `message_sent` | `{tempId, message}` | Send confirmation |
| `message_delivery_info` | `{message_id, delivered, queued, total}` | Delivery status |
| `message_status_updated` | `{message_id, status, user_id}` | Status changed |
| `user_typing` | `{chat_id, user_id, is_typing}` | Other user typing |
| `message_deleted` | `{message_id, message}` | Message deleted |

---

## 🐛 Troubleshooting

### Issue: "Not authenticated" error
**Solution:** Make sure to emit `user_authenticated` immediately after `connect` event

### Issue: Messages not received
**Solution:** Check if both users are members of the chat in database:
```sql
SELECT * FROM chat_members WHERE chat_id = 1;
```

### Issue: Pending messages not delivered
**Solution:** Ensure user emits `user_authenticated` on reconnection

### Issue: CORS error
**Solution:** Check server's `src/config/socket.js` has correct CORS settings

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check server logs (`npm start` terminal)
3. Verify database has correct data
4. Test with `test-whatsapp-delivery.html` file

---

**🎉 You're ready to integrate private chat messaging!**
