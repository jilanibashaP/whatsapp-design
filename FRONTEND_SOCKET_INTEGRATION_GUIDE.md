# Frontend Socket.IO Integration Guide

## Overview

This messaging system uses a **dual room architecture** similar to WhatsApp:

1. **Personal Rooms** (`user:{userId}`) - For receiving messages even when not in a specific chat
2. **Chat Rooms** (`chat:{chatId}`) - For real-time updates within specific conversations (optional)

This architecture enables **WhatsApp-like message delivery** where messages arrive even if you haven't opened the chat.

---

## Architecture: Personal Rooms vs Chat Rooms

### Personal Room (`user:{userId}`)
- **Created when**: User authenticates/connects to Socket.IO
- **Purpose**: Receive all messages meant for you across all chats
- **Lifecycle**: Exists as long as you're online
- **Automatic**: Joined automatically on authentication
- **Use case**: Primary message delivery mechanism

### Chat Room (`chat:{chatId}`)
- **Created when**: User explicitly joins via `join_chat` event
- **Purpose**: Real-time updates (typing indicators, read receipts) for a specific chat
- **Lifecycle**: Join when opening chat, leave when closing
- **Manual**: Must explicitly join/leave
- **Use case**: Enhanced real-time features (optional but recommended)

### Why Both?

```
┌─────────────────────────────────────────────────────────────┐
│  WITHOUT CHAT ROOMS (Personal Rooms Only)                    │
│  ✓ Messages arrive even if chat not open                     │
│  ✓ Works offline (messages queued)                           │
│  ✗ No typing indicators                                      │
│  ✗ No real-time read receipts in chat                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  WITH BOTH ROOMS (Recommended)                               │
│  ✓ Messages arrive even if chat not open                     │
│  ✓ Works offline (messages queued)                           │
│  ✓ Typing indicators when chat is open                       │
│  ✓ Real-time read receipts                                   │
│  ✓ Enhanced user experience                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation

```bash
npm install socket.io-client
```

---

## Step 1: Socket Connection Setup

### Create Socket Service (`services/socketService.js`)

```javascript
import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.userId = null;
    this.currentChatId = null;
  }

  /**
   * Connect to Socket.IO server and authenticate
   * @param {string} token - JWT authentication token
   * @param {string} userId - Current user ID
   */
  connect(token, userId) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    // Connect to server
    this.socket = io('http://localhost:3000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.userId = userId;

    // Connection successful
    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id);
      this.connected = true;

      // Trigger authentication and join personal room
      this.socket.emit('user_authenticated', userId);
    });

    // Listen for pending messages delivered when coming online
    this.socket.on('pending_messages_delivered', (data) => {
      console.log(`📬 ${data.count} pending messages delivered`);
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
      this.connected = false;
    });

    // Disconnection
    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
      this.connected = false;
    });

    // Presence updates
    this.socket.on('presence_updated', (data) => {
      console.log('👤 Presence update:', data);
      // Update UI to show user online/offline status
      this.handlePresenceUpdate(data);
    });

    return this.socket;
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.emit('user_disconnect');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.currentChatId = null;
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected() {
    return this.connected && this.socket?.connected;
  }

  /**
   * Get socket instance
   */
  getSocket() {
    return this.socket;
  }

  /**
   * Handle presence updates (override in your app)
   */
  handlePresenceUpdate(data) {
    // Implement in your application
    // Update user status in contact list, chat headers, etc.
  }
}

export default new SocketService();
```

---

## Step 2: Chat Room Management

### Join/Leave Chat Rooms

```javascript
class SocketService {
  // ... previous code ...

  /**
   * Join a specific chat room when user opens a chat
   * @param {string} chatId - Chat ID to join
   */
  joinChat(chatId) {
    if (!this.isConnected()) {
      console.error('Socket not connected');
      return;
    }

    // Leave previous chat if any
    if (this.currentChatId && this.currentChatId !== chatId) {
      this.leaveChat(this.currentChatId);
    }

    this.socket.emit('join_chat', chatId);
    this.currentChatId = chatId;

    // Wait for confirmation
    this.socket.once('joined_chat', (data) => {
      console.log(`✅ Joined chat room: ${data.chatId}`);
    });
  }

  /**
   * Leave a chat room when user closes/exits chat
   * @param {string} chatId - Chat ID to leave
   */
  leaveChat(chatId) {
    if (!this.isConnected()) return;

    this.socket.emit('leave_chat', chatId);
    console.log(`👋 Left chat room: ${chatId}`);
    
    if (this.currentChatId === chatId) {
      this.currentChatId = null;
    }
  }

  /**
   * Get current chat ID
   */
  getCurrentChatId() {
    return this.currentChatId;
  }
}
```

---

## Step 3: Message Handling

### Send Messages

```javascript
class SocketService {
  // ... previous code ...

  /**
   * Send a message
   * @param {Object} messageData - Message data
   * @returns {Promise} Resolves when message is sent
   */
  sendMessage(messageData) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected()) {
        reject(new Error('Socket not connected'));
        return;
      }

      const { chatId, content, messageType = 'text', replyTo = null } = messageData;
      const tempId = `temp_${Date.now()}_${Math.random()}`;

      const payload = {
        chat_id: chatId,
        content,
        message_type: messageType,
        reply_to: replyTo,
        tempId
      };

      // Send message
      this.socket.emit('send_message', payload);

      // Wait for confirmation
      this.socket.once('message_sent', (data) => {
        if (data.tempId === tempId) {
          console.log('✅ Message sent:', data.message);
          resolve(data.message);
        }
      });

      // Handle error
      this.socket.once('message_error', (error) => {
        if (error.tempId === tempId) {
          console.error('❌ Message error:', error);
          reject(new Error(error.message));
        }
      });

      // Listen for delivery info
      this.socket.once('message_delivery_info', (info) => {
        if (info.message_id) {
          console.log(`📊 Delivery: ${info.delivered} delivered, ${info.queued} queued`);
        }
      });
    });
  }

  /**
   * Listen for incoming messages (from personal room)
   * @param {Function} callback - Callback to handle new message
   */
  onNewMessage(callback) {
    if (!this.socket) return;

    this.socket.on('new_message', (message) => {
      console.log('📨 New message received:', message);
      
      // Check if it's a pending message
      if (message.isPending) {
        console.log('📬 This was a queued message (delivered after coming online)');
      }
      
      callback(message);
    });
  }

  /**
   * Remove message listener
   */
  offNewMessage() {
    if (this.socket) {
      this.socket.off('new_message');
    }
  }
}
```

---

## Step 4: Message Status Updates

### Mark Messages as Delivered/Read

```javascript
class SocketService {
  // ... previous code ...

  /**
   * Mark message as delivered
   * @param {string} messageId - Message ID
   */
  markAsDelivered(messageId) {
    if (!this.isConnected()) return;

    this.socket.emit('message_delivered', { message_id: messageId });
  }

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @param {string} chatId - Chat ID
   */
  markAsRead(messageId, chatId) {
    if (!this.isConnected()) return;

    this.socket.emit('message_read', { 
      message_id: messageId,
      chat_id: chatId 
    });
  }

  /**
   * Bulk mark messages as read
   * @param {string} chatId - Chat ID
   * @param {Array} messageIds - Array of message IDs
   */
  bulkMarkAsRead(chatId, messageIds) {
    if (!this.isConnected() || !messageIds.length) return;

    this.socket.emit('bulk_mark_read', {
      chat_id: chatId,
      message_ids: messageIds
    });
  }

  /**
   * Listen for message status updates
   * @param {Function} callback - Callback to handle status update
   */
  onMessageStatusUpdate(callback) {
    if (!this.socket) return;

    this.socket.on('message_status_updated', (data) => {
      console.log('✓ Message status updated:', data);
      callback(data);
    });
  }

  /**
   * Listen for bulk read updates
   * @param {Function} callback - Callback to handle bulk read
   */
  onBulkMessagesRead(callback) {
    if (!this.socket) return;

    this.socket.on('messages_read_bulk', (data) => {
      console.log('✓✓ Bulk messages read:', data);
      callback(data);
    });
  }
}
```

---

## Step 5: Typing Indicators

```javascript
class SocketService {
  // ... previous code ...

  /**
   * Send typing indicator
   * @param {string} chatId - Chat ID
   * @param {boolean} isTyping - Typing status
   */
  sendTypingIndicator(chatId, isTyping) {
    if (!this.isConnected()) return;

    this.socket.emit('typing', {
      chat_id: chatId,
      is_typing: isTyping
    });
  }

  /**
   * Listen for typing indicators
   * @param {Function} callback - Callback to handle typing event
   */
  onUserTyping(callback) {
    if (!this.socket) return;

    this.socket.on('user_typing', (data) => {
      console.log('⌨️ User typing:', data);
      callback(data);
    });
  }
}
```

---

## Step 6: React Integration Example

### App.js - Initialize Socket

```javascript
import React, { useEffect, useState } from 'react';
import socketService from './services/socketService';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    // Get user from localStorage or auth service
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    if (user && token) {
      setCurrentUser(user);
      
      // Connect to Socket.IO
      socketService.connect(token, user.id);

      // Listen for new messages globally
      socketService.onNewMessage((message) => {
        // Update chat list with new message
        // Play notification sound if not in current chat
        handleNewMessage(message);
      });

      // Listen for message status updates
      socketService.onMessageStatusUpdate((data) => {
        // Update message status in UI (delivered/read ticks)
        handleStatusUpdate(data);
      });

      // Listen for presence updates
      socketService.handlePresenceUpdate = (data) => {
        // Update user online/offline status in UI
        handlePresenceUpdate(data);
      };
    }

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  const handleNewMessage = (message) => {
    // Add message to appropriate chat
    // Update chat list order
    // Show notification if not in current chat
    console.log('New message:', message);
  };

  const handleStatusUpdate = (data) => {
    // Update message status (✓ or ✓✓)
    console.log('Status update:', data);
  };

  const handlePresenceUpdate = (data) => {
    // Update user online status
    console.log('Presence:', data);
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
  };

  return (
    <div className="app">
      <ChatList 
        currentUser={currentUser}
        onChatSelect={handleChatSelect}
        selectedChat={selectedChat}
      />
      {selectedChat && (
        <ChatWindow 
          chat={selectedChat}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

export default App;
```

---

### ChatWindow.js - Join/Leave Chat Room

```javascript
import React, { useEffect, useState, useRef } from 'react';
import socketService from '../services/socketService';

function ChatWindow({ chat, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    // Join chat room when chat is opened
    socketService.joinChat(chat.id);

    // Load messages from API
    loadMessages(chat.id);

    // Mark unread messages as read
    markMessagesAsRead();

    // Cleanup: Leave chat room when closing
    return () => {
      socketService.leaveChat(chat.id);
    };
  }, [chat.id]);

  useEffect(() => {
    // Listen for typing indicators
    socketService.onUserTyping((data) => {
      if (data.chat_id === chat.id && data.user_id !== currentUser.id) {
        setIsTyping(data.is_typing);
      }
    });

    return () => {
      socketService.getSocket()?.off('user_typing');
    };
  }, [chat.id, currentUser.id]);

  const loadMessages = async (chatId) => {
    // Load messages from REST API
    const response = await fetch(`/api/chats/${chatId}/messages`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    const data = await response.json();
    setMessages(data.messages);
  };

  const markMessagesAsRead = () => {
    const unreadMessageIds = messages
      .filter(msg => msg.sender_id !== currentUser.id && msg.status !== 'read')
      .map(msg => msg.id);

    if (unreadMessageIds.length > 0) {
      socketService.bulkMarkAsRead(chat.id, unreadMessageIds);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    try {
      const message = await socketService.sendMessage({
        chatId: chat.id,
        content: inputText.trim(),
        messageType: 'text'
      });

      // Add message to UI optimistically
      setMessages(prev => [...prev, message]);
      setInputText('');

      // Stop typing indicator
      socketService.sendTypingIndicator(chat.id, false);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    // Send typing indicator
    socketService.sendTypingIndicator(chat.id, true);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socketService.sendTypingIndicator(chat.id, false);
    }, 3000);
  };

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>{chat.name}</h3>
        {isTyping && <span className="typing-indicator">typing...</span>}
      </div>

      <div className="messages-container">
        {messages.map(message => (
          <MessageBubble 
            key={message.id}
            message={message}
            isOwn={message.sender_id === currentUser.id}
          />
        ))}
      </div>

      <div className="chat-input">
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
}

export default ChatWindow;
```

---

### MessageBubble.js - Show Message Status

```javascript
import React, { useEffect, useState } from 'react';
import socketService from '../services/socketService';

function MessageBubble({ message, isOwn }) {
  const [status, setStatus] = useState(message.status || 'sent');

  useEffect(() => {
    if (!isOwn) {
      // Mark as delivered when viewing message
      socketService.markAsDelivered(message.id);
    }

    // Listen for status updates
    const handleStatusUpdate = (data) => {
      if (data.message_id === message.id) {
        setStatus(data.status);
      }
    };

    socketService.onMessageStatusUpdate(handleStatusUpdate);

    return () => {
      // Cleanup listener if needed
    };
  }, [message.id, isOwn]);

  const getStatusIcon = () => {
    if (!isOwn) return null;

    switch (status) {
      case 'sent':
        return '✓'; // Single tick
      case 'delivered':
        return '✓✓'; // Double tick (gray)
      case 'read':
        return <span style={{ color: 'blue' }}>✓✓</span>; // Double tick (blue)
      default:
        return '⏱'; // Pending
    }
  };

  return (
    <div className={`message-bubble ${isOwn ? 'own' : 'other'}`}>
      <div className="message-content">{message.content}</div>
      <div className="message-meta">
        <span className="message-time">
          {new Date(message.sent_at).toLocaleTimeString()}
        </span>
        {isOwn && <span className="message-status">{getStatusIcon()}</span>}
      </div>
    </div>
  );
}

export default MessageBubble;
```

---

## Step 7: Complete Event Reference

### Events You EMIT (Client → Server)

| Event | Data | Description |
|-------|------|-------------|
| `user_authenticated` | `userId` | Authenticate and join personal room |
| `join_chat` | `chatId` | Join a specific chat room |
| `leave_chat` | `chatId` | Leave a chat room |
| `send_message` | `{ chat_id, content, message_type, reply_to, tempId }` | Send a message |
| `typing` | `{ chat_id, is_typing }` | Send typing indicator |
| `message_delivered` | `{ message_id }` | Mark message as delivered |
| `message_read` | `{ message_id, chat_id }` | Mark message as read |
| `bulk_mark_read` | `{ chat_id, message_ids[] }` | Mark multiple messages as read |
| `get_presence` | `[userIds]` | Get presence info for users |
| `user_disconnect` | - | Manually disconnect |

### Events You LISTEN (Server → Client)

| Event | Data | Description |
|-------|------|-------------|
| `connect` | - | Socket connected successfully |
| `disconnect` | `reason` | Socket disconnected |
| `new_message` | `message` | New message received (via personal room) |
| `message_sent` | `{ tempId, message }` | Your message was sent successfully |
| `message_error` | `{ tempId, message }` | Error sending message |
| `message_delivery_info` | `{ message_id, delivered, queued, total }` | Delivery status of your message |
| `message_status_updated` | `{ message_id, status, user_id }` | Message status changed |
| `messages_read_bulk` | `{ message_ids[], user_id, chat_id }` | Multiple messages read |
| `user_typing` | `{ chat_id, user_id, is_typing }` | User typing in chat |
| `presence_updated` | `{ user_id, is_online, last_seen }` | User went online/offline |
| `presence_info` | `[{ user_id, is_online, last_seen }]` | Bulk presence info |
| `pending_messages_delivered` | `{ count }` | Queued messages delivered on connect |
| `joined_chat` | `{ chatId }` | Successfully joined chat room |
| `error` | `{ message }` | General error |

---

## Step 8: Flow Diagrams

### Message Send Flow

```
┌─────────┐                  ┌─────────┐                  ┌─────────┐
│ Sender  │                  │  Server │                  │Recipient│
└────┬────┘                  └────┬────┘                  └────┬────┘
     │                            │                            │
     │  send_message              │                            │
     ├───────────────────────────>│                            │
     │                            │                            │
     │  message_sent (confirm)    │                            │
     │<───────────────────────────┤                            │
     │                            │                            │
     │                            │  new_message (personal rm) │
     │                            ├───────────────────────────>│
     │                            │                            │
     │                            │  message_status_updated    │
     │<───────────────────────────┤  (delivered)               │
     │                            │<───────────────────────────┤
     │                            │                            │
     │                            │  message_status_updated    │
     │<───────────────────────────┤  (read)                    │
     │                            │<───────────────────────────┤
```

### Offline Message Delivery

```
┌─────────┐                  ┌─────────┐                  ┌─────────┐
│ Sender  │                  │  Server │                  │Recipient│
└────┬────┘                  └────┬────┘                  └────┬────┘
     │                            │                            │
     │  send_message              │        (OFFLINE)           │
     ├───────────────────────────>│                            X
     │                            │                            X
     │  message_sent (queued)     │                            X
     │<───────────────────────────┤                            X
     │                            │                            │
     │                            │                     (COMES ONLINE)
     │                            │  user_authenticated        │
     │                            │<───────────────────────────┤
     │                            │                            │
     │                            │  new_message (pending)     │
     │                            ├───────────────────────────>│
     │                            │                            │
     │  message_status_updated    │  pending_messages_deliv... │
     │<───────────────────────────┤───────────────────────────>│
```

---

## Best Practices

### 1. **Always Join Personal Room**
- Happens automatically via `user_authenticated` event
- Don't disconnect until user logs out

### 2. **Join Chat Rooms When Opening Chat**
- Call `joinChat(chatId)` when user opens a conversation
- Call `leaveChat(chatId)` when user closes/switches chat

### 3. **Mark Messages as Delivered/Read**
- Mark as delivered when message is received
- Mark as read when user views the message

### 4. **Handle Reconnections**
- Socket.IO handles reconnections automatically
- Re-authenticate on reconnect
- Fetch missed messages from API

### 5. **Typing Indicators**
- Send when user starts typing
- Stop after 3 seconds of inactivity
- Stop when message is sent

### 6. **Error Handling**
- Always handle `message_error` events
- Show user-friendly error messages
- Retry failed messages

---

## Troubleshooting

### Messages Not Receiving
✅ Check if `user_authenticated` event was emitted
✅ Verify user joined personal room (`user:{userId}`)
✅ Check server logs for delivery attempts

### Typing Indicators Not Working
✅ Verify you joined the chat room (`join_chat`)
✅ Check if `typing` event is being emitted
✅ Ensure recipient is in the same chat room

### Message Status Not Updating
✅ Emit `message_delivered` and `message_read` events
✅ Listen for `message_status_updated` event
✅ Check network connectivity

### Offline Messages Not Delivered
✅ Verify `pending_messages_delivered` event is received
✅ Check `new_message` event listener is registered
✅ Ensure database has undelivered messages

---

## Testing Checklist

- [ ] Connect to Socket.IO server
- [ ] Authenticate user
- [ ] Join personal room automatically
- [ ] Receive messages in personal room
- [ ] Join chat room when opening chat
- [ ] Send message successfully
- [ ] Receive typing indicators
- [ ] Mark messages as delivered
- [ ] Mark messages as read
- [ ] Receive status updates (✓ → ✓✓)
- [ ] Handle offline message delivery
- [ ] Leave chat room when closing
- [ ] Disconnect gracefully on logout
- [ ] Reconnect automatically on disconnect
- [ ] Handle connection errors

---

## Summary

**Key Takeaways:**

1. **Personal Rooms** = Always online, receive all messages
2. **Chat Rooms** = Join when viewing chat, for real-time features
3. **WhatsApp-like delivery** = Messages arrive even if chat not open
4. **Offline support** = Messages queued and delivered when user comes online
5. **Status tracking** = Sent (✓) → Delivered (✓✓) → Read (✓✓ blue)

This architecture provides a robust, scalable messaging system with WhatsApp-like functionality! 🚀
