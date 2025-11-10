# Presence System Documentation

## Overview

The presence system tracks user online/offline status and "last seen" timestamps in real-time using WebSocket connections. It notifies contacts when users come online or go offline, similar to WhatsApp's presence feature.

---

## Architecture

### Components

1. **`presence.socket.js`** - WebSocket event handlers for real-time presence
2. **`presence.service.js`** - Database operations for presence data
3. **`user.model.js`** - User model with presence fields
4. **In-memory tracking** - Maps active socket connections to users

---

## How It Works

### 1. Connection Tracking

```javascript
// In-memory Map: userId -> Set of socketIds
const userConnections = new Map();
```

**Purpose:** Track multiple simultaneous connections per user (phone, laptop, tablet, etc.)

**Logic:**
- User is "online" if they have **at least one active connection**
- User goes "offline" only when **all connections are closed**

---

### 2. User Comes Online

**Flow:**
```
Client connects → Socket established → Client emits 'user_authenticated'
    ↓
Server adds socket to userConnections Map
    ↓
Server updates database: status='online', last_seen=current_timestamp
    ↓
Server fetches user's contacts (people they've chatted with)
    ↓
Server broadcasts 'presence_updated' event to all contacts
```

**Socket Event:**
```javascript
socket.emit('user_authenticated', userId);
```

**What Contacts Receive:**
```javascript
socket.on('presence_updated', (data) => {
  // data = {
  //   user_id: 123,
  //   status: 'online',
  //   last_seen: '2025-11-10T14:30:00Z'
  // }
});
```

---

### 3. User Goes Offline

**Flow:**
```
Socket disconnects (user closes app/tab/loses connection)
    ↓
Server removes socket from userConnections Map
    ↓
IF user has NO more active connections:
    ↓
    Server updates database: status='offline', last_seen=current_timestamp
    ↓
    Server fetches user's contacts
    ↓
    Server broadcasts 'presence_updated' with offline status and timestamp
```

**What Contacts Receive:**
```javascript
socket.on('presence_updated', (data) => {
  // data = {
  //   user_id: 123,
  //   status: 'offline',
  //   last_seen: '2025-11-10T12:15:00Z'  // Use this for "last seen 2 hours ago"
  // }
});
```

---

### 4. Multi-Device Support

**Example Scenario:**

| Action | Active Sockets | Status Shown |
|--------|---------------|--------------|
| Open app on phone | `[socket1]` | **Online** |
| Open app on laptop | `[socket1, socket2]` | **Online** |
| Close phone app | `[socket2]` | **Online** (still on laptop) |
| Close laptop app | `[]` | **Offline** (last_seen saved) |

---

## Database Schema

### User Table Fields

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  profile_pic TEXT,
  status VARCHAR(50),              -- 'online', 'offline', 'away', 'busy'
  last_seen DATETIME,              -- Timestamp of last activity
  is_online BOOLEAN DEFAULT FALSE, -- Redundant flag (optional)
  created_at DATETIME DEFAULT NOW(),
  -- ... other fields
);

-- Indexes for performance
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_online ON users(is_online);
```

### Migration

Run this SQL to add presence fields:
```bash
mysql -u your_user -p your_database < migrations/add_presence_fields.sql
```

---

## Socket Events Reference

### Client → Server Events

#### 1. `user_authenticated`
**Purpose:** Notify server that user has connected and authenticated

**Payload:**
```javascript
socket.emit('user_authenticated', userId);
```

**Parameters:**
- `userId` (Number) - ID of the authenticated user

---

#### 2. `update_status`
**Purpose:** Manually change user status (online, away, busy, offline)

**Payload:**
```javascript
socket.emit('update_status', 'away');
```

**Parameters:**
- `status` (String) - One of: `'online'`, `'offline'`, `'away'`, `'busy'`

---

#### 3. `get_presence`
**Purpose:** Request presence info for multiple users

**Payload:**
```javascript
socket.emit('get_presence', [userId1, userId2, userId3]);
```

**Parameters:**
- `userIds` (Array<Number>) - Array of user IDs to check

**Response Event:** `presence_info`

---

### Server → Client Events

#### 1. `presence_updated`
**Purpose:** Notify when a contact's presence changes

**Payload:**
```javascript
socket.on('presence_updated', (data) => {
  console.log(data);
  // {
  //   user_id: 123,
  //   status: 'online' | 'offline' | 'away' | 'busy',
  //   last_seen: '2025-11-10T14:30:00Z'
  // }
});
```

**When Triggered:**
- Contact comes online
- Contact goes offline
- Contact manually changes status

---

#### 2. `presence_info`
**Purpose:** Response to `get_presence` request

**Payload:**
```javascript
socket.on('presence_info', (users) => {
  console.log(users);
  // [
  //   { user_id: 1, status: 'online', last_seen: '2025-11-10T14:30:00Z' },
  //   { user_id: 2, status: 'offline', last_seen: '2025-11-10T12:00:00Z' }
  // ]
});
```

---

## API Reference

### Service Methods

#### `updateUserStatus(userId, status, lastSeen)`
Updates user's online status in database

**Parameters:**
- `userId` (Number) - User ID
- `status` (String) - 'online', 'offline', 'away', 'busy'
- `lastSeen` (Date, optional) - Timestamp, defaults to current time

**Returns:** Promise

---

#### `getUserContacts(userId)`
Gets list of user IDs that the user has chatted with

**Parameters:**
- `userId` (Number) - User ID

**Returns:** Promise<Array<Number>> - Array of contact user IDs

---

#### `getBulkUserStatus(userIds)`
Fetches presence info for multiple users

**Parameters:**
- `userIds` (Array<Number>) - Array of user IDs

**Returns:** Promise<Array<Object>>
```javascript
[
  { user_id: 1, status: 'online', last_seen: Date },
  { user_id: 2, status: 'offline', last_seen: Date }
]
```

---

## Frontend Integration

### 1. Connect and Authenticate

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// After user logs in
const userId = getUserId(); // from your auth system
socket.emit('user_authenticated', userId);
```

---

### 2. Listen for Presence Updates

```javascript
socket.on('presence_updated', (data) => {
  const { user_id, status, last_seen } = data;
  
  // Update UI
  updateContactStatus(user_id, {
    isOnline: status === 'online',
    lastSeen: last_seen,
    statusText: getStatusText(status, last_seen)
  });
});
```

---

### 3. Format "Last Seen"

```javascript
function getStatusText(status, lastSeenTimestamp) {
  if (status === 'online') {
    return 'Online';
  }
  
  if (status === 'away') {
    return 'Away';
  }
  
  if (status === 'busy') {
    return 'Busy';
  }
  
  // For offline, show relative time
  return `Last seen ${formatRelativeTime(lastSeenTimestamp)}`;
}

function formatRelativeTime(timestamp) {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  // For older timestamps, show actual date
  return then.toLocaleDateString();
}
```

---

### 4. Request Presence for Multiple Users

```javascript
// When loading a contact list or chat
const userIds = [1, 2, 3, 4, 5];
socket.emit('get_presence', userIds);

socket.on('presence_info', (users) => {
  users.forEach(({ user_id, status, last_seen }) => {
    updateContactStatus(user_id, { status, last_seen });
  });
});
```

---

### 5. Update Your Status Manually

```javascript
// When user selects a status
socket.emit('update_status', 'away');
```

---

## Complete React Example

```javascript
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';

function ContactList({ contacts, currentUserId }) {
  const [socket, setSocket] = useState(null);
  const [presenceMap, setPresenceMap] = useState({});

  useEffect(() => {
    // Initialize socket
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Authenticate
    newSocket.emit('user_authenticated', currentUserId);

    // Listen for presence updates
    newSocket.on('presence_updated', (data) => {
      setPresenceMap(prev => ({
        ...prev,
        [data.user_id]: {
          status: data.status,
          lastSeen: data.last_seen
        }
      }));
    });

    // Request initial presence
    const contactIds = contacts.map(c => c.id);
    newSocket.emit('get_presence', contactIds);

    newSocket.on('presence_info', (users) => {
      const map = {};
      users.forEach(u => {
        map[u.user_id] = { status: u.status, lastSeen: u.last_seen };
      });
      setPresenceMap(map);
    });

    return () => newSocket.close();
  }, [currentUserId, contacts]);

  return (
    <div className="contact-list">
      {contacts.map(contact => (
        <ContactItem
          key={contact.id}
          contact={contact}
          presence={presenceMap[contact.id]}
        />
      ))}
    </div>
  );
}

function ContactItem({ contact, presence }) {
  const getStatusDisplay = () => {
    if (!presence) return '';
    
    if (presence.status === 'online') {
      return <span className="status-online">Online</span>;
    }
    
    const lastSeenText = formatRelativeTime(presence.lastSeen);
    return <span className="status-offline">Last seen {lastSeenText}</span>;
  };

  return (
    <div className="contact-item">
      <img src={contact.profile_pic} alt={contact.name} />
      <div>
        <div className="contact-name">{contact.name}</div>
        <div className="contact-status">{getStatusDisplay()}</div>
      </div>
    </div>
  );
}

function formatRelativeTime(timestamp) {
  // Same implementation as above
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
```

---

## Privacy Considerations

### Who Can See Your Status?

**Current Implementation:** Only your contacts (people you've chatted with) can see your online status and last seen.

**How it works:**
```javascript
// Server fetches contacts before broadcasting
const contacts = await presenceService.getUserContacts(userId);

// Only notify these specific users
contacts.forEach(contactId => {
  io.to(`user:${contactId}`).emit('presence_updated', data);
});
```

### Privacy Settings (Future Enhancement)

You can extend this to add privacy controls:

```javascript
// In user model, add:
privacy_settings: {
  show_online_status: 'everyone' | 'contacts' | 'nobody',
  show_last_seen: 'everyone' | 'contacts' | 'nobody'
}
```

---

## Performance Optimization

### 1. Database Indexes

Already included in migration:
```sql
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_online ON users(is_online);
```

### 2. Batch Updates

For high-traffic applications, batch status updates:

```javascript
// Instead of updating DB on every status change
// Buffer updates and flush every 5 seconds
const statusUpdateQueue = new Map();

setInterval(async () => {
  if (statusUpdateQueue.size > 0) {
    await db.User.bulkCreate(
      Array.from(statusUpdateQueue.values()),
      { updateOnDuplicate: ['status', 'last_seen'] }
    );
    statusUpdateQueue.clear();
  }
}, 5000);
```

### 3. Redis for Connection Tracking

For distributed systems (multiple servers), use Redis instead of in-memory Map:

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Track connections in Redis
await redis.sadd(`user:${userId}:sockets`, socket.id);
const socketCount = await redis.scard(`user:${userId}:sockets`);

if (socketCount === 0) {
  // User is offline
}
```

---

## Testing

### Manual Testing with Socket.io Client

```javascript
const io = require('socket.io-client');

// Connect
const socket = io('http://localhost:3000');

// Authenticate
socket.emit('user_authenticated', 1);

// Listen
socket.on('presence_updated', (data) => {
  console.log('Presence update:', data);
});

// Get presence
socket.emit('get_presence', [2, 3, 4]);

socket.on('presence_info', (data) => {
  console.log('Presence info:', data);
});
```

---

## Troubleshooting

### Issue: Contacts not receiving presence updates

**Check:**
1. Is the user's socket authenticated? (`socket.userId` should be set)
2. Are the users in each other's contact list? (have they chatted?)
3. Is the contact's socket connected and joined to their user room?

**Debug:**
```javascript
// Add logging
console.log('User contacts:', await presenceService.getUserContacts(userId));
console.log('Active connections:', userConnections);
```

---

### Issue: User stuck as "online" after disconnect

**Possible causes:**
1. Socket didn't fire disconnect event (network issue)
2. Error in disconnect handler
3. Multiple connections still active

**Solution:** Implement heartbeat timeout:
```javascript
// In socket config
io = new Server(server, {
  pingTimeout: 30000,  // 30 seconds
  pingInterval: 10000  // ping every 10 seconds
});
```

---

### Issue: "last_seen" not updating

**Check:**
1. Have you run the migration? `migrations/add_presence_fields.sql`
2. Is the field defined in the User model?
3. Check database column exists: `DESCRIBE users;`

---

## Helper Functions on IO Instance

The presence socket adds helper functions to the `io` instance:

### `io.isUserOnline(userId)`
```javascript
const { getIo } = require('./config/socket');
const io = getIo();

if (io.isUserOnline(123)) {
  console.log('User is currently connected');
}
```

### `io.getActiveUsersCount()`
```javascript
const activeUsers = io.getActiveUsersCount();
console.log(`${activeUsers} users currently online`);
```

---

## Summary

✅ **Real-time presence tracking** via WebSocket  
✅ **Multi-device support** (user online if ANY device connected)  
✅ **Last seen timestamps** for offline users  
✅ **Contact-based notifications** (privacy-aware)  
✅ **Manual status updates** (away, busy, etc.)  
✅ **Efficient bulk queries** for contact lists  
✅ **Automatic cleanup** on disconnect  

---

## Next Steps

1. **Run the migration**: Add presence fields to database
2. **Restart server**: Load the presence socket handler
3. **Implement frontend**: Add presence listeners and UI
4. **Test multi-device**: Open multiple tabs/devices
5. **Add privacy settings**: Let users control who sees their status

---

## Related Files

- `src/sockets/presence.socket.js` - WebSocket handlers
- `src/services/presence.service.js` - Database operations
- `src/models/user.model.js` - User model with presence fields
- `src/config/socket.js` - Socket initialization
- `migrations/add_presence_fields.sql` - Database migration
