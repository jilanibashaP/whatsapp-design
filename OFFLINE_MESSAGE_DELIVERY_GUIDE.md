# Offline Message Delivery Guide

## Overview

This guide explains how to implement a system where messages can be sent to offline users and automatically delivered when they come back online. This is a core feature of modern messaging applications like WhatsApp, Telegram, etc.

## Core Concept

When a user is offline:
1. Messages are **still saved to the database** (they already are in your current system)
2. Messages are **queued for delivery** when the user comes online
3. When the user connects, **pending messages are pushed** to their client
4. Message status is updated from "sent" → "delivered"

## Current System Analysis

### What You Already Have ✅
- Messages are stored in the `messages` table
- Message status tracking in `message_status` table
- Socket connection management with presence tracking
- User online/offline status detection

### What Needs to Be Added 📝
- Logic to detect undelivered messages when user comes online
- Automatic message push mechanism on connection
- Proper message status updates (sent → delivered)

---

## Implementation Architecture

### 1. Database Schema (Already Exists)

Your current schema supports this feature:

```sql
-- messages table
- id
- chat_id
- sender_id
- content
- message_type
- created_at

-- message_status table
- id
- message_id
- user_id
- status ('sent', 'delivered', 'read')
- timestamp
```

**Key Point**: When a message is sent to an offline user:
- Message is saved in `messages` table
- Status is set to `'sent'` in `message_status` table
- When user comes online and receives it, status updates to `'delivered'`

---

## Implementation Flow

### Flow 1: Sending Message to Offline User

```
User A sends message to User B (offline)
         ↓
1. Save message to database
         ↓
2. Create message_status entry with status='sent'
         ↓
3. Check if User B is online via socket
         ↓
4. User B is offline → Message waits in database
         ↓
5. Emit socket event only to User A (message sent confirmation)
```

### Flow 2: User Comes Online (Message Delivery)

```
User B connects to socket
         ↓
1. Socket 'connection' event fires
         ↓
2. Authenticate user from socket token
         ↓
3. Query database for undelivered messages
   (WHERE user_id = B AND status = 'sent')
         ↓
4. Emit all pending messages to User B
         ↓
5. Update message_status to 'delivered'
         ↓
6. Notify senders that messages were delivered
```

---

## Detailed Implementation Steps

### Step 1: Create Undelivered Messages Service

**File**: `src/services/message.service.js`

**New Function**: `getUndeliveredMessages(userId)`

**Purpose**: Fetch all messages that are in 'sent' status for a specific user

**Logic**:
```javascript
// Pseudo-code
async getUndeliveredMessages(userId) {
  // Query all messages where:
  // 1. The user is a chat member
  // 2. Message status is 'sent' (not 'delivered' or 'read')
  // 3. Message sender is not the user themselves
  // 4. Order by created_at (oldest first)
  
  // Join tables:
  // - messages
  // - message_status
  // - chat_members
  // - chats
  
  // Return array of message objects with:
  // - message_id
  // - chat_id
  // - sender_id
  // - content
  // - message_type
  // - created_at
  // - sender info (name, profile_picture)
}
```

### Step 2: Modify Socket Connection Handler

**File**: `src/sockets/message.socket.js` or `src/sockets/presence.socket.js`

**Event**: `connection`

**Add Logic**:
```javascript
// Pseudo-code for socket connection handler
socket.on('connection', async (socket) => {
  
  // 1. Authenticate user (already exists)
  const userId = socket.user.id;
  
  // 2. Update user presence to 'online' (already exists)
  await updateUserPresence(userId, 'online');
  
  // 3. **NEW**: Fetch undelivered messages
  const undeliveredMessages = await messageService.getUndeliveredMessages(userId);
  
  // 4. **NEW**: Emit each message to the user
  for (const message of undeliveredMessages) {
    socket.emit('message:receive', {
      messageId: message.id,
      chatId: message.chat_id,
      senderId: message.sender_id,
      content: message.content,
      messageType: message.message_type,
      createdAt: message.created_at,
      sender: {
        name: message.sender_name,
        profilePicture: message.sender_profile_picture
      }
    });
    
    // 5. **NEW**: Update message status to 'delivered'
    await messageService.updateMessageStatus(
      message.id, 
      userId, 
      'delivered'
    );
    
    // 6. **NEW**: Notify sender that message was delivered
    const senderSocket = getSocketByUserId(message.sender_id);
    if (senderSocket) {
      senderSocket.emit('message:status', {
        messageId: message.id,
        status: 'delivered',
        deliveredTo: userId,
        timestamp: new Date()
      });
    }
  }
  
  // Continue with other connection logic...
});
```

### Step 3: Modify Send Message Logic

**File**: `src/services/message.service.js` or socket handler

**Function**: `sendMessage()` or `socket.on('message:send')`

**Current Behavior**: 
- Save message to database
- Emit to online recipients only

**Updated Behavior**:
```javascript
// Pseudo-code
async sendMessage(chatId, senderId, content, messageType) {
  
  // 1. Save message to database (already exists)
  const message = await saveMessage(chatId, senderId, content, messageType);
  
  // 2. Get all chat members (already exists)
  const members = await getChatMembers(chatId);
  
  // 3. Create message status for each member
  for (const member of members) {
    if (member.id !== senderId) { // Don't create status for sender
      
      // Create status entry with 'sent'
      await createMessageStatus(message.id, member.id, 'sent');
      
      // Check if member is online
      const recipientSocket = getSocketByUserId(member.id);
      
      if (recipientSocket) {
        // Member is ONLINE → Send immediately
        recipientSocket.emit('message:receive', {
          messageId: message.id,
          chatId: chatId,
          senderId: senderId,
          content: content,
          messageType: messageType,
          createdAt: message.created_at,
          sender: {
            name: senderInfo.name,
            profilePicture: senderInfo.profile_picture
          }
        });
        
        // Update status to 'delivered' immediately
        await updateMessageStatus(message.id, member.id, 'delivered');
        
      } else {
        // Member is OFFLINE → Message stays in 'sent' status
        // Will be delivered when user comes online
        console.log(`User ${member.id} is offline. Message queued.`);
      }
    }
  }
  
  return message;
}
```

### Step 4: Update Message Status Service

**File**: `src/services/message.service.js`

**New Function**: `updateMessageStatus(messageId, userId, status)`

**Purpose**: Update the status of a message for a specific user

```javascript
// Pseudo-code
async updateMessageStatus(messageId, userId, status) {
  // Update message_status table
  // WHERE message_id = messageId AND user_id = userId
  // SET status = status, timestamp = NOW()
  
  // Return updated status
}
```

---

## Database Queries Needed

### Query 1: Get Undelivered Messages

```sql
SELECT 
    m.id as message_id,
    m.chat_id,
    m.sender_id,
    m.content,
    m.message_type,
    m.created_at,
    u.name as sender_name,
    u.profile_picture as sender_profile_picture
FROM messages m
INNER JOIN message_status ms ON m.id = ms.message_id
INNER JOIN chat_members cm ON m.chat_id = cm.chat_id
INNER JOIN users u ON m.sender_id = u.id
WHERE cm.user_id = ? -- The user who came online
    AND ms.user_id = ? -- Same user
    AND ms.status = 'sent' -- Only undelivered messages
    AND m.sender_id != ? -- Don't include own messages
ORDER BY m.created_at ASC; -- Deliver in order
```

### Query 2: Update Message Status

```sql
UPDATE message_status
SET status = ?, timestamp = NOW()
WHERE message_id = ? AND user_id = ?;
```

### Query 3: Check If User Is Online (via Socket)

This is done in-memory via socket connection tracking:
```javascript
// Check if user has active socket connection
const isOnline = io.sockets.sockets.get(userSocketId) !== undefined;
```

---

## Socket Events Reference

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connection` | `{ token }` | User connects with auth token |
| `message:send` | `{ chatId, content, messageType }` | Send a new message |
| `disconnect` | - | User disconnects |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `message:receive` | `{ messageId, chatId, senderId, content, ... }` | Receive a message (real-time or queued) |
| `message:status` | `{ messageId, status, deliveredTo, timestamp }` | Message status update (delivered/read) |
| `user:online` | `{ userId, timestamp }` | User came online |
| `user:offline` | `{ userId, lastSeen }` | User went offline |

---

## Frontend Integration

### On Connection (Frontend)

```javascript
// When socket connects
socket.on('connect', () => {
  console.log('Connected to server');
  // Server will automatically push pending messages
});

// Listen for incoming messages
socket.on('message:receive', (message) => {
  // Add message to chat UI
  addMessageToChat(message.chatId, message);
  
  // Send delivery confirmation (optional)
  socket.emit('message:delivered', {
    messageId: message.messageId
  });
});

// Listen for status updates
socket.on('message:status', (update) => {
  // Update message UI (show double check mark)
  updateMessageStatus(update.messageId, update.status);
});
```

### Sending Messages (Frontend)

```javascript
// Send message
socket.emit('message:send', {
  chatId: currentChatId,
  content: messageText,
  messageType: 'text'
});

// Handle confirmation
socket.on('message:sent', (response) => {
  // Show single check mark (sent)
  markAsSent(response.messageId);
});
```

---

## Error Handling & Edge Cases

### 1. User Connects/Disconnects Rapidly
**Problem**: Multiple connection events, duplicate message delivery

**Solution**: 
- Use a flag or lock to prevent duplicate processing
- Check message status before emitting
- Use database transactions

### 2. Too Many Pending Messages
**Problem**: User was offline for days, thousands of messages

**Solution**:
- Paginate message delivery (e.g., 50 messages at a time)
- Use batch operations
- Emit messages in chunks with delays

```javascript
// Pseudo-code
const BATCH_SIZE = 50;
for (let i = 0; i < undeliveredMessages.length; i += BATCH_SIZE) {
  const batch = undeliveredMessages.slice(i, i + BATCH_SIZE);
  await deliverMessageBatch(batch);
  await sleep(100); // Small delay between batches
}
```

### 3. Message Delivery Failure
**Problem**: Socket disconnects during delivery

**Solution**:
- Don't update status until client acknowledges receipt
- Use acknowledgment callbacks in Socket.IO
- Implement retry logic

```javascript
// With acknowledgment
socket.emit('message:receive', message, (ack) => {
  if (ack.received) {
    updateMessageStatus(message.id, userId, 'delivered');
  }
});
```

### 4. Group Chat Scenarios
**Problem**: Multiple users, some online, some offline

**Solution**:
- Track status individually per user
- Each user has their own `message_status` row
- Update each user's status independently

---

## Performance Considerations

### 1. Index Database Properly

```sql
-- Index on message_status for faster queries
CREATE INDEX idx_message_status_user_status 
ON message_status(user_id, status);

-- Index on messages for chat queries
CREATE INDEX idx_messages_chat_created 
ON messages(chat_id, created_at);
```

### 2. Cache User Socket Mappings

```javascript
// In-memory map for fast lookups
const userSocketMap = new Map();

// On connection
userSocketMap.set(userId, socketId);

// On disconnect
userSocketMap.delete(userId);

// Fast lookup
const socketId = userSocketMap.get(userId);
```

### 3. Use Redis for Scalability

For multi-server deployments:
- Store user→socket mappings in Redis
- Use Redis pub/sub for cross-server communication
- Store pending message counts in Redis

---

## Testing Strategy

### Test Case 1: Send to Offline User
1. User A online, User B offline
2. User A sends message to User B
3. Verify message saved with status='sent'
4. User B comes online
5. Verify User B receives message
6. Verify status updated to 'delivered'

### Test Case 2: Multiple Offline Messages
1. User B offline
2. User A sends 5 messages
3. User B comes online
4. Verify all 5 messages delivered in order
5. Verify all statuses updated

### Test Case 3: Group Chat Mixed Status
1. Group with 3 users: A (online), B (offline), C (online)
2. User A sends message
3. Verify B and C receive immediately
4. User B comes online
5. Verify User B receives pending message

### Test Case 4: Rapid Reconnection
1. User A offline
2. Send message to User A
3. User A connects and disconnects rapidly
4. Verify message delivered only once

---

## Security Considerations

### 1. Authentication
- Verify JWT token on every socket connection
- Don't deliver messages without valid authentication

### 2. Authorization
- Verify user is a member of the chat before delivering messages
- Don't expose messages from chats user isn't part of

### 3. Rate Limiting
- Limit number of messages that can be sent per minute
- Prevent spam when user comes online

---

## Monitoring & Logging

### Metrics to Track
- Number of undelivered messages per user
- Average delivery delay
- Failed delivery attempts
- Socket connection/disconnection rate

### Logs to Implement
```javascript
logger.info(`User ${userId} came online. Delivering ${count} pending messages`);
logger.info(`Message ${messageId} delivered to user ${userId}`);
logger.error(`Failed to deliver message ${messageId} to user ${userId}: ${error}`);
```

---

## Migration Plan

### Phase 1: Add New Functions (No Breaking Changes)
- Add `getUndeliveredMessages()` service
- Add `updateMessageStatus()` service
- Test independently

### Phase 2: Update Connection Handler
- Add pending message delivery on connection
- Monitor for issues
- Add logging

### Phase 3: Update Send Logic
- Modify message sending to check recipient status
- Update status accordingly
- Test thoroughly

### Phase 4: Cleanup & Optimization
- Add database indexes
- Optimize queries
- Add caching layer

---

## Summary

### What Happens Now
✅ Messages saved to database  
✅ Emitted to online users only  
❌ Offline users miss real-time delivery  

### What Will Happen After Implementation
✅ Messages saved to database  
✅ Emitted to online users immediately (status: delivered)  
✅ Queued for offline users (status: sent)  
✅ Automatically delivered when user comes online  
✅ Status updated to delivered  
✅ Sender notified of delivery  

---

## Code Files to Modify

1. **`src/services/message.service.js`**
   - Add `getUndeliveredMessages(userId)`
   - Add `updateMessageStatus(messageId, userId, status)`

2. **`src/sockets/message.socket.js`**
   - Update `connection` event handler
   - Update `message:send` event handler
   - Add delivery logic

3. **`src/sockets/presence.socket.js`** (if using separate file)
   - Update presence tracking
   - Trigger message delivery on online status

4. **`src/services/chat.service.js`** (optional)
   - Add helper functions for member status checks

5. **Frontend Client** (separate implementation)
   - Handle `message:receive` events
   - Update UI for delivery status

---

## Next Steps

1. Review this document and understand the flow
2. Test current message flow to understand behavior
3. Implement service functions first (database layer)
4. Update socket handlers (connection and send)
5. Test with two users (one online, one offline)
6. Add error handling and edge cases
7. Optimize with indexes and caching
8. Deploy and monitor

---

## Additional Resources

- Socket.IO Documentation: https://socket.io/docs/
- Message Status Patterns: WhatsApp/Telegram architecture
- Sequelize Associations: For complex queries
- PostgreSQL Indexes: Performance optimization

---

**Document Version**: 1.0  
**Last Updated**: November 10, 2025  
**Status**: Ready for Implementation
