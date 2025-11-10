# Frontend Presence Integration

## Setup
```bash
npm install socket.io-client
```

## Backend Calls

### 1. Connect & Authenticate
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// After login
socket.emit('user_authenticated', userId);
```

### 2. Get Presence Status
```javascript
// Request presence for multiple users
socket.emit('get_presence', [userId1, userId2, userId3]);

// Receive response
socket.on('presence_info', (users) => {
  // [
  //   { user_id: 1, is_online: true, last_seen: "2025-11-10T14:30:00Z" },
  //   { user_id: 2, is_online: false, last_seen: "2025-11-10T12:00:00Z" }
  // ]
});
```

### 3. Listen for Real-time Updates
```javascript
// Automatically receive when contacts go online/offline
socket.on('presence_updated', (data) => {
  // { user_id: 123, is_online: true, last_seen: "2025-11-10T14:30:00Z" }
});
```

## Complete Example
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// 1. Authenticate
socket.emit('user_authenticated', userId);

// 2. Listen for real-time updates
socket.on('presence_updated', (data) => {
  console.log(`User ${data.user_id} is now ${data.is_online ? 'online' : 'offline'}`);
  // Update UI here
});

// 3. Get presence for chat list
const chatUserIds = [1, 2, 3, 4, 5];
socket.emit('get_presence', chatUserIds);

socket.on('presence_info', (users) => {
  users.forEach(user => {
    console.log(`User ${user.user_id}: ${user.is_online ? 'Online' : 'Last seen ' + user.last_seen}`);
    // Update UI here
  });
});
```

That's it!
