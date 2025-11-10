# Socket.IO Events Documentation

## Connection URL
```
ws://localhost:3000
```

---

## 🔐 Authentication Events

### 1. `user_authenticated` (Client → Server)

**Description:** Authenticate the socket connection with a user ID. Must be sent after connection to enable presence tracking.

**Emit from client:**
```javascript
socket.emit('user_authenticated', userId);
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | number | Yes | The user ID to authenticate as |

**Example:**
```javascript
const socket = io('ws://localhost:3000');

socket.on('connect', () => {
  console.log('Connected:', socket.id);
  socket.emit('user_authenticated', 14); // Authenticate as user 14
});
```

**Server Response:**
- User is marked as online in database
- Contacts are notified via `presence_updated` event
- Socket is added to user's connection pool

---

## 📡 Presence Events

### 2. `presence_updated` (Server → Client)

**Description:** Broadcasted when a contact's online status changes.

**Listen on client:**
```javascript
socket.on('presence_updated', (data) => {
  console.log('Contact status changed:', data);
});
```

**Payload:**
```json
{
  "user_id": 14,
  "is_online": true,
  "last_seen": "2025-11-10T07:33:40.444Z"
}
```

**Fields:**
| Field | Type | Description |
|-------|------|-------------|
| user_id | number | User whose status changed |
| is_online | boolean | `true` if online, `false` if offline |
| last_seen | string (ISO 8601) | Last seen timestamp |

---

### 3. `update_status` (Client → Server)

**Description:** Manually update your online/offline status.

**Emit from client:**
```javascript
socket.emit('update_status', isOnline);
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| isOnline | boolean | Yes | `true` for online, `false` for offline |

**Example:**
```javascript
// Go offline
socket.emit('update_status', false);

// Go online
socket.emit('update_status', true);
```

**Note:** This is for manual status changes. Automatic presence is handled by connection/disconnection.

---

### 4. `get_presence` (Client → Server)

**Description:** Request presence information for multiple users.

**Emit from client:**
```javascript
socket.emit('get_presence', [userId1, userId2, userId3]);
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userIds | array | Yes | Array of user IDs to check |

**Example:**
```javascript
// Get presence for users 1, 5, and 10
socket.emit('get_presence', [1, 5, 10]);
```

**Server Response:** `presence_info` event

---

### 5. `presence_info` (Server → Client)

**Description:** Response containing presence information for requested users.

**Listen on client:**
```javascript
socket.on('presence_info', (presenceData) => {
  console.log('Presence info:', presenceData);
});
```

**Payload:**
```json
[
  {
    "id": 1,
    "is_online": true,
    "last_seen": "2025-11-10T07:33:40.444Z"
  },
  {
    "id": 5,
    "is_online": false,
    "last_seen": "2025-11-10T06:20:15.123Z"
  }
]
```

---

### 6. `user_disconnect` (Client → Server)

**Description:** Manually trigger a disconnect (e.g., logout). This marks the user offline and notifies contacts.

**Emit from client:**
```javascript
socket.emit('user_disconnect');
```

**Parameters:** None

**Example:**
```javascript
// User clicks logout button
function logout() {
  socket.emit('user_disconnect');
  socket.disconnect();
}
```

**Server Response:**
- User marked as offline in database
- Contacts notified via `presence_updated` event
- Socket removed from user's connection pool

---

### 7. `disconnect` (Automatic)

**Description:** Built-in Socket.IO event that fires when connection is lost.

**Listen on client:**
```javascript
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});
```

**Reasons:**
- `transport close` - Connection closed
- `io server disconnect` - Server initiated disconnect
- `io client disconnect` - Client initiated disconnect
- `ping timeout` - Ping timeout
- `transport error` - Transport error

**Server Behavior:**
- Automatically marks user offline if no other connections exist
- Notifies contacts via `presence_updated` event

---

## 💬 Message Events

### 8. `send_message` (Client → Server)

**Description:** Send a message to a chat.

**Emit from client:**
```javascript
socket.emit('send_message', messageData);
```

**Parameters:**
```json
{
  "chat_id": 1,
  "content": "Hello, World!",
  "message_type": "text"
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| chat_id | number | Yes | Target chat ID |
| content | string | Yes | Message content |
| message_type | string | No | `text`, `image`, `video`, `audio`, `file` (default: `text`) |

---

### 9. `new_message` (Server → Client)

**Description:** Broadcasted when a new message is received.

**Listen on client:**
```javascript
socket.on('new_message', (message) => {
  console.log('New message:', message);
});
```

**Payload:**
```json
{
  "id": 123,
  "chat_id": 1,
  "sender_id": 14,
  "content": "Hello, World!",
  "message_type": "text",
  "sent_at": "2025-11-10T07:33:40.444Z"
}
```

---

### 10. `message_status_update` (Client → Server)

**Description:** Update message status (delivered, read).

**Emit from client:**
```javascript
socket.emit('message_status_update', statusData);
```

**Parameters:**
```json
{
  "message_id": 123,
  "status": "read"
}
```

**Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| message_id | number | Yes | Message ID |
| status | string | Yes | `delivered` or `read` |

---

### 11. `typing` (Client → Server)

**Description:** Notify chat members that user is typing.

**Emit from client:**
```javascript
socket.emit('typing', { chat_id: 1, is_typing: true });
```

**Parameters:**
```json
{
  "chat_id": 1,
  "is_typing": true
}
```

---

### 12. `user_typing` (Server → Client)

**Description:** Broadcasted when a user starts/stops typing.

**Listen on client:**
```javascript
socket.on('user_typing', (data) => {
  console.log(`User ${data.user_id} is ${data.is_typing ? 'typing' : 'not typing'}`);
});
```

**Payload:**
```json
{
  "chat_id": 1,
  "user_id": 14,
  "is_typing": true
}
```

---

## 🔧 Complete Client Example

```javascript
const socket = io('ws://localhost:3000', {
  transports: ['websocket'],
  reconnection: true
});

// 1. Connect and authenticate
socket.on('connect', () => {
  console.log('Connected:', socket.id);
  socket.emit('user_authenticated', 14); // Use actual user ID
});

// 2. Listen for presence updates
socket.on('presence_updated', (data) => {
  console.log(`User ${data.user_id} is ${data.is_online ? 'online' : 'offline'}`);
  // Update UI to show online status
});

// 3. Listen for new messages
socket.on('new_message', (message) => {
  console.log('New message:', message);
  // Display message in chat
});

// 4. Listen for typing indicators
socket.on('user_typing', (data) => {
  console.log(`User ${data.user_id} is typing in chat ${data.chat_id}`);
  // Show typing indicator
});

// 5. Handle disconnection
socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
  // Show reconnection UI
});

// Send a message
function sendMessage(chatId, content) {
  socket.emit('send_message', {
    chat_id: chatId,
    content: content,
    message_type: 'text'
  });
}

// Update typing status
function setTyping(chatId, isTyping) {
  socket.emit('typing', {
    chat_id: chatId,
    is_typing: isTyping
  });
}

// Logout
function logout() {
  socket.emit('user_disconnect');
  socket.disconnect();
}

// Get presence for users
function checkPresence(userIds) {
  socket.emit('get_presence', userIds);
  
  socket.once('presence_info', (data) => {
    console.log('Presence info:', data);
  });
}
```

---

## 🧪 Testing with Postman/Thunder Client

### Step 1: Connect
```
URL: ws://localhost:3000
Protocol: WebSocket
```

### Step 2: Authenticate
```
Event: user_authenticated
Payload: 14
```

### Step 3: Test Events

**Send Message:**
```
Event: send_message
Payload:
{
  "chat_id": 1,
  "content": "Hello",
  "message_type": "text"
}
```

**Get Presence:**
```
Event: get_presence
Payload: [1, 2, 3]
```

**Disconnect:**
```
Event: user_disconnect
Payload: (empty)
```

---

## 📝 Notes

### Multi-Device Support
- Users can connect from multiple devices simultaneously
- User is marked offline only when ALL connections are closed
- Each socket connection is tracked separately

### Authentication Flow
1. Client connects to WebSocket
2. Server registers event handlers but doesn't authenticate
3. Client sends `user_authenticated` event with userId
4. Server marks user online and notifies contacts

### Production Considerations
⚠️ **TODO before production:**
- Implement JWT token authentication instead of plain userId
- Add rate limiting for events
- Implement proper error handling
- Add event validation middleware
- Use Redis for connection tracking across multiple servers
- Implement proper reconnection handling

---

## 🐛 Troubleshooting

**User not going offline:**
- Check if `user_disconnect` event is being sent
- Verify userId is set on socket
- Check console logs for disconnect handling

**Presence not updating:**
- Verify user is authenticated (`user_authenticated` event sent)
- Check if users are in same chat/contacts
- Verify database has proper chat memberships

**Messages not received:**
- Verify user is member of the chat
- Check if socket is authenticated
- Verify chat_id exists in database
