# Frontend Integration Guide

## Getting Chat ID - Recommended Approach

### Overview
The frontend works with `userId` and `otherUserId`, but messaging requires a `chat_id`. This guide shows how to seamlessly get or create chats before sending messages.

---

## Step 1: Create or Get Private Chat

Before sending messages, call the chat creation endpoint:

### API Endpoint
```
POST /api/chats
Content-Type: application/json
Authorization: Bearer <token>
```

### Request Body
```json
{
  "user_id": 1,
  "other_user_id": 2,
  "is_group": false
}
```

### Response
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "chat": {
      "id": 5,
      "is_group": false,
      "created_by": 1,
      "created_at": "2025-11-08T10:30:00.000Z"
    }
  }
}
```

**Note:** This endpoint is **idempotent** - it returns existing chat if one exists between these users, or creates a new one if it doesn't.

---

## Step 2: Join Chat Room via Socket

Once you have the `chat_id`, join the socket room:

```javascript
socket.emit('join_chat', chatId);

// Listen for confirmation
socket.on('joined_chat', ({ chatId }) => {
  console.log('Joined chat:', chatId);
});
```

---

## Step 3: Send Messages

Now you can send messages using the `chat_id`:

```javascript
socket.emit('send_message', {
  chat_id: 5,
  content: 'Hello!',
  message_type: 'text',
  tempId: 'temp-123' // Optional: for optimistic UI updates
});

// Listen for confirmation
socket.on('message_sent', ({ tempId, message }) => {
  console.log('Message sent successfully:', message);
  // Replace temporary message in UI with real message
});

// Listen for new messages from others
socket.on('new_message', (message) => {
  console.log('New message received:', message);
  // Display message in UI
});
```

---

## Complete Frontend Example (Vanilla JavaScript)

```javascript
// ============================================
// Authentication & Socket Setup
// ============================================

const API_BASE = 'http://localhost:3000/api';
let authToken = null;
let currentUserId = null;
let socket = null;

// Login
async function login(email, password) {
  const response = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    authToken = data.data.token;
    currentUserId = data.data.user.id;
    
    // Initialize socket connection
    initializeSocket();
    
    return data.data.user;
  }
  
  throw new Error(data.message);
}

// Initialize Socket Connection
function initializeSocket() {
  socket = io('http://localhost:3000', {
    transports: ['websocket']
  });
  
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
    
    // Authenticate socket
    socket.emit('authenticate', authToken);
  });
  
  socket.on('authenticated', ({ userId }) => {
    console.log('Socket authenticated for user:', userId);
  });
  
  socket.on('authentication_error', ({ message }) => {
    console.error('Socket authentication failed:', message);
  });
  
  // Listen for incoming messages
  socket.on('new_message', handleNewMessage);
  
  // Listen for message status updates
  socket.on('message_status_updated', handleMessageStatusUpdate);
  
  // Listen for typing indicators
  socket.on('user_typing', handleUserTyping);
}

// ============================================
// Chat Management
// ============================================

// Create or Get Chat with Another User
async function startChatWithUser(otherUserId) {
  try {
    const response = await fetch(`${API_BASE}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        user_id: currentUserId,
        other_user_id: otherUserId,
        is_group: false
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const chat = data.data.chat;
      
      // Join the chat room via socket
      socket.emit('join_chat', chat.id);
      
      // Load message history
      const messages = await loadMessages(chat.id);
      
      // Display chat in UI
      displayChat(chat, messages);
      
      return chat;
    }
    
    throw new Error(data.message);
  } catch (error) {
    console.error('Error starting chat:', error);
    throw error;
  }
}

// Create Group Chat
async function createGroupChat(groupName, memberIds, description = null) {
  try {
    const response = await fetch(`${API_BASE}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        user_id: currentUserId,
        is_group: true,
        group_name: groupName,
        members: memberIds,
        group_description: description
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      const chat = data.data.chat;
      socket.emit('join_chat', chat.id);
      return chat;
    }
    
    throw new Error(data.message);
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
}

// Load User's Chat List
async function loadUserChats() {
  try {
    const response = await fetch(`${API_BASE}/chats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      const chats = data.data.chats;
      
      // Join all chat rooms
      chats.forEach(chat => {
        socket.emit('join_chat', chat.id);
      });
      
      return chats;
    }
    
    throw new Error(data.message);
  } catch (error) {
    console.error('Error loading chats:', error);
    throw error;
  }
}

// ============================================
// Messaging
// ============================================

// Load Messages for a Chat
async function loadMessages(chatId, limit = 50, offset = 0) {
  try {
    const response = await fetch(
      `${API_BASE}/messages/${chatId}?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      return data.data.messages;
    }
    
    throw new Error(data.message);
  } catch (error) {
    console.error('Error loading messages:', error);
    throw error;
  }
}

// Send Message
function sendMessage(chatId, content, messageType = 'text', replyTo = null) {
  const tempId = `temp-${Date.now()}-${Math.random()}`;
  
  // Optimistic UI update (add message to UI immediately)
  const tempMessage = {
    id: tempId,
    chat_id: chatId,
    sender_id: currentUserId,
    content,
    message_type: messageType,
    reply_to: replyTo,
    created_at: new Date().toISOString(),
    status: 'sending'
  };
  
  addMessageToUI(tempMessage);
  
  // Send via socket
  socket.emit('send_message', {
    chat_id: chatId,
    content,
    message_type: messageType,
    reply_to: replyTo,
    tempId
  });
  
  return tempId;
}

// Handle Message Sent Confirmation
socket.on('message_sent', ({ tempId, message }) => {
  console.log('Message sent successfully');
  
  // Replace temporary message with real message in UI
  replaceMessageInUI(tempId, message);
});

// Handle Message Send Error
socket.on('message_error', ({ tempId, message }) => {
  console.error('Error sending message:', message);
  
  // Mark message as failed in UI
  markMessageAsFailed(tempId, message);
});

// Handle Incoming Messages
function handleNewMessage(message) {
  console.log('New message received:', message);
  
  // Add message to UI
  addMessageToUI(message);
  
  // Mark as delivered
  socket.emit('message_delivered', {
    message_id: message.id
  });
  
  // If chat is currently open, mark as read
  if (isCurrentChat(message.chat_id)) {
    socket.emit('message_read', {
      message_id: message.id,
      chat_id: message.chat_id
    });
  }
}

// ============================================
// Message Status Updates
// ============================================

// Mark Message as Read
function markMessageAsRead(messageId, chatId) {
  socket.emit('message_read', {
    message_id: messageId,
    chat_id: chatId
  });
}

// Bulk Mark Messages as Read
function bulkMarkAsRead(chatId, messageIds) {
  socket.emit('bulk_mark_read', {
    chat_id: chatId,
    message_ids: messageIds
  });
}

// Handle Message Status Updates
function handleMessageStatusUpdate({ message_id, status, user_id }) {
  console.log(`Message ${message_id} ${status} by user ${user_id}`);
  
  // Update message status in UI
  updateMessageStatusInUI(message_id, status, user_id);
}

// ============================================
// Typing Indicators
// ============================================

let typingTimeout = null;

// Send Typing Indicator
function sendTypingIndicator(chatId, isTyping) {
  socket.emit('typing', {
    chat_id: chatId,
    is_typing: isTyping
  });
  
  // Auto-stop typing after 3 seconds of inactivity
  if (isTyping) {
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      sendTypingIndicator(chatId, false);
    }, 3000);
  }
}

// Handle User Typing
function handleUserTyping({ chat_id, user_id, is_typing }) {
  console.log(`User ${user_id} is ${is_typing ? 'typing' : 'stopped typing'}`);
  
  // Update typing indicator in UI
  updateTypingIndicatorInUI(chat_id, user_id, is_typing);
}

// ============================================
// Delete Message
// ============================================

function deleteMessage(messageId, chatId) {
  socket.emit('delete_message', {
    message_id: messageId,
    chat_id: chatId
  });
}

socket.on('message_deleted', ({ message_id, message }) => {
  console.log('Message deleted:', message_id);
  
  // Update UI to show deleted message
  markMessageAsDeletedInUI(message_id, message);
});

// ============================================
// UI Helper Functions (implement based on your UI framework)
// ============================================

function displayChat(chat, messages) {
  // Display chat header and messages in your UI
  console.log('Displaying chat:', chat.id);
}

function addMessageToUI(message) {
  // Add message to chat UI
  console.log('Adding message to UI:', message);
}

function replaceMessageInUI(tempId, realMessage) {
  // Replace temporary message with real message
  console.log('Replacing temp message:', tempId, 'with:', realMessage);
}

function markMessageAsFailed(tempId, errorMessage) {
  // Mark message as failed in UI
  console.log('Message failed:', tempId, errorMessage);
}

function updateMessageStatusInUI(messageId, status, userId) {
  // Update message status (delivered/read) in UI
  console.log('Update message status:', messageId, status);
}

function updateTypingIndicatorInUI(chatId, userId, isTyping) {
  // Show/hide typing indicator
  console.log('Typing indicator:', chatId, userId, isTyping);
}

function markMessageAsDeletedInUI(messageId, message) {
  // Show message as deleted
  console.log('Message deleted:', messageId);
}

function isCurrentChat(chatId) {
  // Check if this chat is currently open
  return true; // Implement based on your UI state
}

// ============================================
// Usage Example
// ============================================

async function example() {
  // 1. Login
  await login('user@example.com', 'password123');
  
  // 2. Load user's chats
  const chats = await loadUserChats();
  console.log('My chats:', chats);
  
  // 3. Start chat with a specific user (by their ID)
  const otherUserId = 5;
  const chat = await startChatWithUser(otherUserId);
  
  // 4. Send a message
  sendMessage(chat.id, 'Hello! How are you?');
  
  // 5. Send typing indicator when user is typing
  const messageInput = document.getElementById('messageInput');
  messageInput.addEventListener('input', () => {
    sendTypingIndicator(chat.id, true);
  });
}
```

---

## React Example

```jsx
import { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';

const API_BASE = 'http://localhost:3000/api';

function useMessaging(authToken, userId) {
  const [socket, setSocket] = useState(null);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([]);

  // Initialize socket
  useEffect(() => {
    if (!authToken) return;

    const newSocket = io('http://localhost:3000', {
      transports: ['websocket']
    });

    newSocket.on('connect', () => {
      newSocket.emit('authenticate', authToken);
    });

    newSocket.on('authenticated', () => {
      console.log('Socket authenticated');
    });

    newSocket.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
      
      // Mark as delivered
      newSocket.emit('message_delivered', { message_id: message.id });
    });

    newSocket.on('message_sent', ({ tempId, message }) => {
      setMessages(prev => 
        prev.map(msg => msg.id === tempId ? message : msg)
      );
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [authToken]);

  // Start chat with user
  const startChat = useCallback(async (otherUserId) => {
    const response = await fetch(`${API_BASE}/chats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        user_id: userId,
        other_user_id: otherUserId,
        is_group: false
      })
    });

    const data = await response.json();
    const chat = data.data.chat;

    // Join chat room
    socket.emit('join_chat', chat.id);

    // Load messages
    const messagesResponse = await fetch(`${API_BASE}/messages/${chat.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const messagesData = await messagesResponse.json();

    setCurrentChat(chat);
    setMessages(messagesData.data.messages);

    return chat;
  }, [socket, authToken, userId]);

  // Send message
  const sendMessage = useCallback((content) => {
    if (!currentChat || !socket) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      chat_id: currentChat.id,
      sender_id: userId,
      content,
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, tempMessage]);

    socket.emit('send_message', {
      chat_id: currentChat.id,
      content,
      tempId
    });
  }, [socket, currentChat, userId]);

  return {
    socket,
    currentChat,
    messages,
    chats,
    startChat,
    sendMessage
  };
}

export default useMessaging;
```

---

## Key Benefits of This Approach

✅ **Clean Separation**: Chat creation via REST API, messaging via WebSocket  
✅ **Idempotent**: Safe to call multiple times - returns existing chat  
✅ **Frontend-Friendly**: Works with user IDs, backend handles chat IDs  
✅ **Message History**: Load messages before sending first one  
✅ **Group Chat Ready**: Same pattern works for groups  
✅ **Optimistic UI**: Use tempId for instant feedback  

---

## Common Patterns

### Pattern 1: Contact List Click
```javascript
// User clicks on a contact from their contact list
async function onContactClick(contactUserId) {
  const chat = await startChatWithUser(contactUserId);
  // Chat UI opens with history loaded
}
```

### Pattern 2: Search & Chat
```javascript
// User searches for a user and starts chatting
async function searchAndChat(searchQuery) {
  const users = await searchUsers(searchQuery);
  const selectedUser = users[0];
  const chat = await startChatWithUser(selectedUser.id);
}
```

### Pattern 3: Load Existing Chats on App Start
```javascript
// When app loads, get all existing chats
async function onAppStart() {
  const chats = await loadUserChats();
  // Display chat list with last messages
  displayChatList(chats);
}
```

---

## Error Handling

```javascript
try {
  const chat = await startChatWithUser(otherUserId);
} catch (error) {
  if (error.message.includes('User not found')) {
    showError('This user does not exist');
  } else if (error.message.includes('authentication')) {
    showError('Please login again');
  } else {
    showError('Failed to start chat');
  }
}
```

---

## Next Steps

1. Implement authentication in your frontend
2. Initialize socket connection after login
3. Use `createOrGetPrivateChat` endpoint before messaging
4. Cache `chat_id` for active conversations
5. Implement optimistic UI updates with `tempId`
