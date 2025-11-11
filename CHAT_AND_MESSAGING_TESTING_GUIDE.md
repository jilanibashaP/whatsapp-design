# 📋 Chat & Messaging Workflow - Complete Testing Guide

## 📚 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Chat Workflow Testing](#chat-workflow-testing)
4. [Messaging Workflow Testing](#messaging-workflow-testing)
5. [Integration Testing](#integration-testing)
6. [API Testing with Postman/cURL](#api-testing)
7. [Socket.io Real-time Testing](#socketio-testing)
8. [Test Scenarios & Expected Results](#test-scenarios)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview {#overview}

This guide covers comprehensive testing for:
- **Chat Workflow**: Creating, retrieving, and managing chats (private & group)
- **Messaging Workflow**: Sending, receiving, and tracking messages in real-time
- **Delivery System**: WhatsApp-like message delivery without requiring chat room joins
- **Status Tracking**: Sent, delivered, and read receipts

---

## 🔧 Prerequisites {#prerequisites}

### 1. Server Setup
```powershell
# Navigate to project directory
cd c:\Users\3008\Desktop\whatsapp-design

# Install dependencies (if not already done)
npm install

# Start the server
npm start
```

Server should be running on `http://localhost:3000`

### 2. Database Verification
Ensure your database has the required tables:
```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'your_database_name'
AND table_name IN ('users', 'chats', 'chat_members', 'messages', 'message_statuses');

-- Create test users if needed
INSERT INTO users (phone, name, about, profile_pic) VALUES
('1234567890', 'Test User A', 'Available', NULL),
('0987654321', 'Test User B', 'Busy', NULL),
('1122334455', 'Test User C', 'At work', NULL);
```

### 3. Testing Tools
- **REST API**: Postman, cURL, or Thunder Client (VS Code extension)
- **Socket.io**: Browser console or `test-whatsapp-delivery.html`
- **Browser**: Chrome/Firefox with Developer Tools

---

## 💬 Chat Workflow Testing {#chat-workflow-testing}

### Test Case 1: Create Private Chat

#### 1.1 Using REST API (POST)

**Endpoint:** `POST /api/chats`

**Request Body:**
```json
{
  "user_id": 1,
  "is_group": false,
  "other_user_id": 2
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "chat": {
      "id": 1,
      "is_group": false,
      "created_by": 1,
      "created_at": "2025-11-11T10:00:00.000Z",
      "group_name": null,
      "group_icon": null,
      "group_description": null
    }
  }
}
```

**cURL Command:**
```bash
curl -X POST http://localhost:3000/api/chats ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":1,\"is_group\":false,\"other_user_id\":2}"
```

#### 1.2 Validation Tests

**Test Invalid Input:**
```json
// Missing user_id
{
  "is_group": false,
  "other_user_id": 2
}
// Expected: 400 Bad Request - "user_id is required"

// Missing other_user_id for private chat
{
  "user_id": 1,
  "is_group": false
}
// Expected: 400 Bad Request - "Other user ID is required for private chat"
```

#### 1.3 Duplicate Prevention Test

**Create same chat twice:**
```bash
# First request
curl -X POST http://localhost:3000/api/chats ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":1,\"is_group\":false,\"other_user_id\":2}"

# Second request (should return existing chat)
curl -X POST http://localhost:3000/api/chats ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":1,\"is_group\":false,\"other_user_id\":2}"
```

**Expected:** Same chat object returned (verify by matching `chat.id`)

---

### Test Case 2: Create Group Chat

#### 2.1 Valid Group Creation

**Request Body:**
```json
{
  "user_id": 1,
  "is_group": true,
  "group_name": "Test Group",
  "group_description": "A test group chat",
  "group_icon": "https://example.com/icon.png",
  "members": [2, 3]
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "chat": {
      "id": 2,
      "is_group": true,
      "group_name": "Test Group",
      "group_description": "A test group chat",
      "group_icon": "https://example.com/icon.png",
      "created_by": 1,
      "created_at": "2025-11-11T10:05:00.000Z"
    }
  }
}
```

**Database Verification:**
```sql
-- Check group chat created
SELECT * FROM chats WHERE id = 2;

-- Check all members added (creator + members)
SELECT * FROM chat_members WHERE chat_id = 2;
-- Should show: user_id 1 (admin), 2 (member), 3 (member)
```

#### 2.2 Validation Tests

**Missing Required Fields:**
```json
// Missing group_name
{
  "user_id": 1,
  "is_group": true,
  "members": [2, 3]
}
// Expected: 400 Bad Request

// Empty members array
{
  "user_id": 1,
  "is_group": true,
  "group_name": "Test",
  "members": []
}
// Expected: 400 Bad Request
```

---

### Test Case 3: Get User's Chats

#### 3.1 Retrieve All Chats

**Endpoint:** `GET /api/chats`

**cURL Command:**
```bash
curl -X GET http://localhost:3000/api/chats
```

**Expected Response:**
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
            "profile_pic": null,
            "ChatMember": {
              "role": "member",
              "joined_at": "2025-11-11T10:00:00.000Z"
            }
          },
          {
            "id": 2,
            "name": "Test User B",
            "profile_pic": null,
            "ChatMember": {
              "role": "member",
              "joined_at": "2025-11-11T10:00:00.000Z"
            }
          }
        ]
      },
      {
        "id": 2,
        "is_group": true,
        "group_name": "Test Group",
        "group_description": "A test group chat",
        "created_at": "2025-11-11T10:05:00.000Z",
        "Users": [...]
      }
    ]
  }
}
```

#### 3.2 Verification Points

- ✅ Only chats where user is a member are returned
- ✅ Chats ordered by creation date (newest first)
- ✅ All members with their details included
- ✅ Private chats show both participants
- ✅ Group chats show all members with roles

---

## 📨 Messaging Workflow Testing {#messaging-workflow-testing}

### Test Case 4: Send Message via Socket.io

#### 4.1 Setup Socket Connection

**HTML Test Client:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Message Test</title>
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
</head>
<body>
    <h2>Message Testing</h2>
    <div id="status"></div>
    <div id="messages"></div>
    
    <script>
        const socket = io('http://localhost:3000');
        const userId = 1; // Change for different users
        
        // Authenticate
        socket.on('connect', () => {
            console.log('Connected');
            socket.emit('user_authenticated', userId);
        });
        
        socket.on('authenticated', (data) => {
            console.log('Authenticated:', data);
            document.getElementById('status').innerHTML = 
                `✅ Connected as User ${userId}`;
        });
        
        // Send message
        function sendMessage(chatId, content) {
            socket.emit('send_message', {
                chat_id: chatId,
                content: content,
                message_type: 'text',
                tempId: Date.now() // Client tracking ID
            });
        }
        
        // Receive messages
        socket.on('new_message', (message) => {
            console.log('Received message:', message);
            const div = document.getElementById('messages');
            div.innerHTML += `<p><b>User ${message.sender_id}:</b> ${message.content}</p>`;
        });
        
        // Message sent confirmation
        socket.on('message_sent', (data) => {
            console.log('Message sent:', data);
        });
        
        // Delivery info
        socket.on('message_delivery_info', (info) => {
            console.log('Delivery:', info);
            alert(`Delivered: ${info.delivered}, Queued: ${info.queued}`);
        });
    </script>
    
    <button onclick="sendMessage(1, 'Hello World!')">Send to Chat 1</button>
</body>
</html>
```

#### 4.2 Test Sending Message

**Steps:**
1. Open HTML file in browser
2. Open browser console (F12)
3. Click "Send to Chat 1" button

**Expected Console Output:**
```javascript
Connected
Authenticated: {success: true, userId: 1}
Message sent: {tempId: 1699123456789, message: {...}}
Delivery: {message_id: 1, delivered: 1, queued: 0, total: 1}
```

**Database Verification:**
```sql
-- Check message created
SELECT * FROM messages WHERE chat_id = 1 ORDER BY id DESC LIMIT 1;

-- Check message status for recipients
SELECT * FROM message_statuses WHERE message_id = (
    SELECT MAX(id) FROM messages WHERE chat_id = 1
);
```

---

### Test Case 5: Message Delivery Status Tracking

#### 5.1 Both Users Online

**Setup:**
- Open test client in two browser tabs
- Tab 1: User A (userId = 1)
- Tab 2: User B (userId = 2)
- Both connected and authenticated

**Test Steps:**
1. User A sends message
2. Observe User B receives immediately
3. Check delivery status

**Expected Results:**

**User A sees:**
```javascript
// Console output
message_sent: {tempId: ..., message: {id: 1, ...}}
message_delivery_info: {
    message_id: 1,
    delivered: 1,  // User B is online
    queued: 0,
    total: 1
}
```

**User B sees:**
```javascript
// Console output
new_message: {
    id: 1,
    chat_id: 1,
    sender_id: 1,
    content: "Hello World!",
    message_type: "text",
    sent_at: "2025-11-11T10:30:00.000Z"
}
```

**Database Check:**
```sql
-- Message status should be 'delivered'
SELECT * FROM message_statuses WHERE message_id = 1;
-- Expected: status = 'delivered', user_id = 2
```

#### 5.2 Recipient Offline (Queued Messages)

**Setup:**
- User A: Online
- User B: Offline (close browser tab)

**Test Steps:**
1. User A sends message
2. Check delivery info shows "queued"
3. User B comes online
4. Verify User B receives pending message

**Expected Results:**

**User A sees:**
```javascript
message_delivery_info: {
    message_id: 2,
    delivered: 0,  // No one online
    queued: 1,     // User B offline
    total: 1
}
```

**Database Check:**
```sql
-- Message status should be 'sent' (not delivered yet)
SELECT * FROM message_statuses WHERE message_id = 2;
-- Expected: status = 'sent', user_id = 2
```

**When User B Reconnects:**
```javascript
// User B console
authenticated: {success: true, userId: 2}
📬 Received 1 pending messages
new_message: {id: 2, content: "...", ...}
```

**Database After Delivery:**
```sql
-- Status should update to 'delivered'
SELECT * FROM message_statuses WHERE message_id = 2;
-- Expected: status = 'delivered'
```

---

### Test Case 6: Message Read Receipts

#### 6.1 Mark Message as Read

**Test Steps:**
1. User B receives message
2. User B marks message as read

**Socket Event:**
```javascript
// User B emits
socket.emit('message_read', {
    message_id: 1,
    chat_id: 1
});
```

**Expected Results:**

**User B status update:**
```sql
SELECT * FROM message_statuses WHERE message_id = 1 AND user_id = 2;
-- Expected: status = 'read'
```

**User A receives notification:**
```javascript
// User A console
message_status_updated: {
    message_id: 1,
    status: 'read',
    user_id: 2
}
```

#### 6.2 Bulk Mark as Read

**Socket Event:**
```javascript
// User B marks multiple messages as read
socket.emit('bulk_mark_read', {
    chat_id: 1,
    message_ids: [1, 2, 3, 4, 5]
});
```

**Database Check:**
```sql
-- All messages should be marked as read
SELECT * FROM message_statuses 
WHERE message_id IN (1,2,3,4,5) AND user_id = 2;
-- All should have status = 'read'
```

---

### Test Case 7: Message Operations

#### 7.1 Get Messages (REST API)

**Endpoint:** `GET /api/messages/:chatId`

**Request:**
```bash
curl -X GET "http://localhost:3000/api/messages/1?limit=20&offset=0" ^
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Query Parameters:**
- `limit`: Number of messages (default: 50)
- `offset`: Pagination offset (default: 0)
- `before_id`: Get messages before this ID (optional)

**Expected Response:**
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
        "content": "Hello World!",
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
            "status": "delivered",
            "updated_at": "2025-11-11T10:30:01.000Z"
          }
        ]
      }
    ],
    "count": 1
  }
}
```

#### 7.2 Search Messages

**Endpoint:** `GET /api/messages/search/:chatId?q=searchTerm`

**Request:**
```bash
curl -X GET "http://localhost:3000/api/messages/search/1?q=hello" ^
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
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
        ...
      }
    ],
    "count": 1
  }
}
```

#### 7.3 Get Unread Count

**Endpoint:** `GET /api/messages/unread/count`

**Request:**
```bash
curl -X GET http://localhost:3000/api/messages/unread/count ^
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Unread count retrieved successfully",
  "data": {
    "count": 5
  }
}
```

#### 7.4 Delete Message

**Socket Event:**
```javascript
socket.emit('delete_message', {
    message_id: 1,
    chat_id: 1
});
```

**Expected Results:**
- Message content updated to "This message was deleted"
- All chat members receive notification

**Broadcast Event:**
```javascript
// All users in chat receive
message_deleted: {
    message_id: 1,
    message: {
        id: 1,
        content: "This message was deleted",
        ...
    }
}
```

---

## 🔄 Integration Testing {#integration-testing}

### Test Scenario 1: Complete Chat Creation to Message Flow

**Flow:**
1. Create private chat between User A and User B
2. User A connects via Socket.io
3. User B connects via Socket.io
4. User A sends message
5. User B receives message
6. User B marks as read
7. User A sees read receipt

**Step-by-Step Commands:**

```bash
# Step 1: Create chat
curl -X POST http://localhost:3000/api/chats ^
  -H "Content-Type: application/json" ^
  -d "{\"user_id\":1,\"is_group\":false,\"other_user_id\":2}"

# Note the chat_id from response (e.g., chat_id: 1)
```

```javascript
// Step 2 & 3: Connect both users (in browser console)
// User A tab
const socketA = io('http://localhost:3000');
socketA.on('connect', () => socketA.emit('user_authenticated', 1));

// User B tab
const socketB = io('http://localhost:3000');
socketB.on('connect', () => socketB.emit('user_authenticated', 2));

// Step 4: User A sends message
socketA.emit('send_message', {
    chat_id: 1,
    content: 'Hi User B!',
    message_type: 'text',
    tempId: Date.now()
});

// Step 5: User B listens
socketB.on('new_message', (msg) => console.log('Received:', msg));

// Step 6: User B marks as read (wait for message_id)
socketB.emit('message_read', {
    message_id: 1,
    chat_id: 1
});

// Step 7: User A listens for status
socketA.on('message_status_updated', (status) => 
    console.log('Status:', status));
```

**Expected Timeline:**
1. ✅ Chat created with ID 1
2. ✅ User A authenticated
3. ✅ User B authenticated
4. ✅ User A receives `message_sent` confirmation
5. ✅ User B receives `new_message` event
6. ✅ User B status updated to 'read' in database
7. ✅ User A receives `message_status_updated` event

---

### Test Scenario 2: Group Chat Multi-User Delivery

**Setup:**
- Create group chat with 3 members (User A, B, C)
- User A and B online
- User C offline

**Test Flow:**

```javascript
// User A sends message
socketA.emit('send_message', {
    chat_id: 2, // group chat ID
    content: 'Hello everyone!',
    message_type: 'text'
});
```

**Expected Results:**

**User A receives:**
```javascript
message_delivery_info: {
    message_id: 10,
    delivered: 1,  // User B online
    queued: 1,     // User C offline
    total: 2
}
```

**User B receives immediately:**
```javascript
new_message: {
    id: 10,
    content: 'Hello everyone!',
    sender_id: 1,
    chat_id: 2
}
```

**Database Check:**
```sql
-- Check message statuses
SELECT ms.*, u.name
FROM message_statuses ms
JOIN users u ON ms.user_id = u.id
WHERE ms.message_id = 10;

-- Expected results:
-- User B: status = 'delivered'
-- User C: status = 'sent'
```

**When User C Connects:**
```javascript
// User C console
socketC.on('connect', () => socketC.emit('user_authenticated', 3));
// Should automatically receive:
new_message: {id: 10, content: 'Hello everyone!', ...}
```

---

## 🧪 Test Scenarios & Expected Results {#test-scenarios}

### Scenario Matrix

| # | Scenario | User A | User B | Expected Result |
|---|----------|--------|--------|-----------------|
| 1 | Both online | Sends message | Online | ✅ Immediate delivery |
| 2 | Recipient offline | Sends message | Offline | 📤 Queued (status: sent) |
| 3 | Recipient reconnects | Waits | Comes online | ✅ Receives pending messages |
| 4 | Multiple offline msgs | Sends 3 messages | Offline | 📤 All queued |
| 5 | Bulk delivery | Waits | Reconnects | ✅ Receives all 3 in order |
| 6 | Read receipt | Waits | Reads message | ✅ A sees read status |
| 7 | Group chat mixed | Sends to group | B: online, C: offline | ✅ B gets it, C queued |
| 8 | Message search | Searches "hello" | N/A | ✅ Returns matching messages |
| 9 | Delete message | Deletes message | Online | ✅ Both see deleted message |
| 10 | Duplicate chat | Creates private | Same pair | ✅ Returns existing chat |

---

## 🔍 API Testing with Postman {#api-testing}

### Postman Collection Setup

**Base URL:** `http://localhost:3000`

#### 1. Create Private Chat
```
POST {{baseUrl}}/api/chats
Body (JSON):
{
    "user_id": 1,
    "is_group": false,
    "other_user_id": 2
}
```

#### 2. Create Group Chat
```
POST {{baseUrl}}/api/chats
Body (JSON):
{
    "user_id": 1,
    "is_group": true,
    "group_name": "Test Group",
    "members": [2, 3, 4]
}
```

#### 3. Get User Chats
```
GET {{baseUrl}}/api/chats
Headers:
Authorization: Bearer {{token}}
```

#### 4. Get Chat Messages
```
GET {{baseUrl}}/api/messages/1?limit=50
Headers:
Authorization: Bearer {{token}}
```

#### 5. Search Messages
```
GET {{baseUrl}}/api/messages/search/1?q=hello
Headers:
Authorization: Bearer {{token}}
```

#### 6. Get Unread Count
```
GET {{baseUrl}}/api/messages/unread/count
Headers:
Authorization: Bearer {{token}}
```

---

## 🔌 Socket.io Testing {#socketio-testing}

### Using Browser Console

```javascript
// 1. Connect
const socket = io('http://localhost:3000');

// 2. Setup event listeners
socket.on('connect', () => console.log('Connected'));
socket.on('authenticated', (data) => console.log('Auth:', data));
socket.on('new_message', (msg) => console.log('Message:', msg));
socket.on('message_sent', (data) => console.log('Sent:', data));
socket.on('message_delivery_info', (info) => console.log('Delivery:', info));
socket.on('message_status_updated', (status) => console.log('Status:', status));

// 3. Authenticate
socket.emit('user_authenticated', 1); // Your user ID

// 4. Send message
socket.emit('send_message', {
    chat_id: 1,
    content: 'Test message',
    message_type: 'text',
    tempId: Date.now()
});

// 5. Mark as delivered
socket.emit('message_delivered', {message_id: 1});

// 6. Mark as read
socket.emit('message_read', {message_id: 1, chat_id: 1});

// 7. Typing indicator
socket.emit('typing', {chat_id: 1, is_typing: true});

// 8. Delete message
socket.emit('delete_message', {message_id: 1, chat_id: 1});
```

### Using test-whatsapp-delivery.html

1. Open file in browser
2. Configure User A panel:
   - Server: `http://localhost:3000`
   - User ID: `1`
   - Chat ID: `1`
3. Configure User B panel:
   - Server: `http://localhost:3000`
   - User ID: `2`
   - Chat ID: `1`
4. Click "Connect" for both users
5. Send messages and observe real-time delivery

---

## 🐛 Troubleshooting {#troubleshooting}

### Issue 1: "User not authenticated"

**Symptoms:**
- Socket events not working
- Error: "Not authenticated"

**Solutions:**
```javascript
// Check connection
console.log('Connected:', socket.connected);

// Re-authenticate
socket.emit('user_authenticated', userId);

// Verify authentication
socket.on('authenticated', (data) => {
    if (data.success) {
        console.log('✅ Authenticated as user', data.userId);
    }
});
```

---

### Issue 2: Messages not delivered

**Check:**
1. Are both users members of the chat?
```sql
SELECT * FROM chat_members WHERE chat_id = 1;
```

2. Is recipient online?
```javascript
// In presence.socket.js
console.log('Online users:', Array.from(io.onlineUsers.keys()));
```

3. Check server logs for errors

---

### Issue 3: Pending messages not delivered

**Verify:**
1. Messages have status 'sent':
```sql
SELECT m.id, m.content, ms.status
FROM messages m
JOIN message_statuses ms ON m.id = ms.message_id
WHERE ms.user_id = 2 AND ms.status = 'sent';
```

2. User authenticated properly:
```javascript
socket.on('authenticated', (data) => {
    console.log('Auth success:', data);
});
```

3. Check pending message delivery in server logs:
```
User came online: 2
Delivering X pending messages to user 2
```

---

### Issue 4: Database errors

**Common Issues:**

**Foreign key constraint failed:**
```sql
-- Check user exists
SELECT * FROM users WHERE id = 1;

-- Check chat exists
SELECT * FROM chats WHERE id = 1;

-- Check user is chat member
SELECT * FROM chat_members WHERE chat_id = 1 AND user_id = 1;
```

**Duplicate entry:**
- Creating duplicate private chat
- Solution: System should return existing chat

---

### Issue 5: CORS errors

**Browser Console:**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
Check `src/config/socket.js`:
```javascript
const io = new Server(server, {
  cors: {
    origin: "*", // Or specific origin
    methods: ["GET", "POST"]
  }
});
```

---

## ✅ Success Checklist

### Chat Workflow
- [ ] Create private chat successfully
- [ ] Create group chat successfully
- [ ] Retrieve user's chats
- [ ] Prevent duplicate private chats
- [ ] Validate required fields

### Messaging Workflow
- [ ] Send message to online user
- [ ] Send message to offline user (queued)
- [ ] Deliver pending messages on reconnect
- [ ] Update message status (delivered)
- [ ] Update message status (read)
- [ ] Bulk mark as read
- [ ] Delete message
- [ ] Search messages
- [ ] Get unread count

### Real-time Features
- [ ] Instant message delivery
- [ ] Typing indicators
- [ ] Read receipts
- [ ] Delivery receipts
- [ ] Multiple user support
- [ ] Group chat delivery

### Database Integrity
- [ ] Messages stored correctly
- [ ] Message statuses tracked
- [ ] Chat members maintained
- [ ] Foreign keys enforced
- [ ] Timestamps accurate

---

## 📊 Performance Testing

### Load Test: Multiple Users

```javascript
// Simulate 10 users sending messages
for (let i = 1; i <= 10; i++) {
    const socket = io('http://localhost:3000');
    socket.on('connect', () => {
        socket.emit('user_authenticated', i);
        
        setInterval(() => {
            socket.emit('send_message', {
                chat_id: 1,
                content: `Message from User ${i}`,
                message_type: 'text'
            });
        }, 5000); // Every 5 seconds
    });
}
```

**Monitor:**
- Server CPU usage
- Memory consumption
- Database connections
- Message delivery latency
- Socket connection stability

---

## 📝 Test Data Setup

### SQL Script for Test Data

```sql
-- Create test users
INSERT INTO users (id, phone, name, about) VALUES
(1, '1111111111', 'Alice', 'Available'),
(2, '2222222222', 'Bob', 'Busy'),
(3, '3333333333', 'Charlie', 'At work'),
(4, '4444444444', 'Diana', 'Sleeping');

-- Create private chat
INSERT INTO chats (id, is_group, created_by) VALUES (1, false, 1);
INSERT INTO chat_members (chat_id, user_id) VALUES (1, 1), (1, 2);

-- Create group chat
INSERT INTO chats (id, is_group, group_name, created_by) VALUES 
(2, true, 'Test Group', 1);
INSERT INTO chat_members (chat_id, user_id, role) VALUES 
(2, 1, 'admin'),
(2, 2, 'member'),
(2, 3, 'member'),
(2, 4, 'member');

-- Create test messages
INSERT INTO messages (chat_id, sender_id, content, message_type) VALUES
(1, 1, 'Hello Bob!', 'text'),
(1, 2, 'Hi Alice!', 'text'),
(2, 1, 'Welcome everyone!', 'text');

-- Create message statuses
INSERT INTO message_statuses (message_id, user_id, status) VALUES
(1, 2, 'delivered'),
(2, 1, 'read'),
(3, 2, 'read'),
(3, 3, 'delivered'),
(3, 4, 'sent');
```

---

## 🎯 Summary

This testing guide covers:
- ✅ **Chat Creation**: Private & group chats
- ✅ **Message Sending**: Real-time via Socket.io
- ✅ **Message Delivery**: WhatsApp-like system
- ✅ **Status Tracking**: Sent → Delivered → Read
- ✅ **Offline Handling**: Queued messages
- ✅ **API Testing**: REST endpoints
- ✅ **Integration Testing**: End-to-end flows
- ✅ **Troubleshooting**: Common issues & solutions

### Key Features Tested
1. Real-time message delivery without chat room joins
2. Automatic pending message delivery on user reconnection
3. Multi-user group chat support
4. Comprehensive status tracking
5. Message operations (delete, search, bulk read)
6. Error handling and validation

---

**🎉 Happy Testing!**

For more details, refer to:
- `SIMPLE_MESSAGE_DELIVERY_GUIDE.md` - Quick overview
- `WHATSAPP_DELIVERY_IMPLEMENTATION_SUMMARY.md` - Technical details
- `OFFLINE_MESSAGE_IMPLEMENTATION_EXAMPLES.md` - Code examples
