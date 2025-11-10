# Local Testing Guide for Messaging Functionalities

## Overview
Your messaging system has:
- ✅ REST API for reading messages
- ✅ Socket.io for real-time messaging
- ✅ Message status tracking (sent/delivered/read)
- ✅ Typing indicators
- ✅ Message search
- ✅ Unread count

## Prerequisites

1. **Database Setup**: Ensure PostgreSQL is running with your database configured
2. **Environment Variables**: Check `.env` file exists with proper configuration
3. **Dependencies Installed**: Run `npm install`

## Step 1: Start the Server

```powershell
# Navigate to project directory
cd C:\Users\3008\Desktop\whatsapp-design

# Install dependencies (if not already done)
npm install

# Start the server
node src/server.js
```

You should see:
```
✓ Database connection established successfully
✓ Database models synchronized
Server running on http://localhost:3000
```

---

## Step 2: Test REST API Endpoints

### A. Register/Login to Get Authentication Token

**Register a new user:**
```powershell
curl -X POST http://localhost:3000/api/users/request-otp `
  -H "Content-Type: application/json" `
  -d '{"phone_number": "+1234567890"}'
```

**Verify OTP and Login:**
```powershell
curl -X POST http://localhost:3000/api/users/verify-otp `
  -H "Content-Type: application/json" `
  -d '{
    "phone_number": "+1234567890",
    "otp": "123456"
  }'
```

Save the `token` from response. You'll need it for authenticated requests.

### B. Create a Chat (First User)

```powershell
curl -X POST http://localhost:3000/api/chats `
  -H "Authorization: Bearer YOUR_TOKEN_HERE" `
  -H "Content-Type: application/json" `
  -d '{
    "type": "private",
    "participant_ids": [2]
  }'
```

Save the `chat_id` from response.

### C. Test Message REST Endpoints

**Get Messages in a Chat:**
```powershell
curl -X GET "http://localhost:3000/api/messages/1" `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Get Unread Count:**
```powershell
curl -X GET "http://localhost:3000/api/messages/unread/count" `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Get Chat Unread Count:**
```powershell
curl -X GET "http://localhost:3000/api/messages/unread/count/1" `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Search Messages:**
```powershell
curl -X GET "http://localhost:3000/api/messages/search/1?q=hello" `
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Step 3: Test Socket.io Real-Time Messaging

### Option A: Using the HTML Test Client (Recommended)

1. **Open the test client**: Open `test-socket-client.html` in your browser
2. **Update the HTML file** to test messaging (see improved version below)

### Option B: Using Postman/Insomnia WebSocket

1. Create WebSocket connection to `ws://localhost:3000`
2. Send authentication event
3. Test messaging events

---

## Step 4: Create Enhanced Test Client

Create a better test client for messaging:

```html
<!-- Save as: test-messaging-client.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Messaging Test Client</title>
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
    <style>
        body { font-family: Arial; padding: 20px; background: #f0f0f0; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        button { background: #25D366; color: white; border: none; padding: 10px 20px; margin: 5px; cursor: pointer; border-radius: 5px; }
        button:disabled { background: #ccc; }
        input, textarea { padding: 8px; margin: 5px; border: 1px solid #ddd; border-radius: 3px; }
        .messages { max-height: 400px; overflow-y: auto; background: #f9f9f9; padding: 10px; border-radius: 5px; }
        .message { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; font-weight: bold; }
        .connected { background: #d4edda; color: #155724; }
        .disconnected { background: #f8d7da; color: #721c24; }
        .log { background: #f8f9fa; padding: 10px; border-radius: 5px; max-height: 200px; overflow-y: auto; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🟢 Messaging Test Client</h1>
        
        <div class="section">
            <h3>Connection</h3>
            <label>User ID: <input type="number" id="userId" value="1"></label>
            <label>Token: <input type="text" id="token" placeholder="Your JWT token" style="width: 400px;"></label>
            <button onclick="connect()">Connect</button>
            <button onclick="disconnect()" disabled id="disconnectBtn">Disconnect</button>
            <div id="status" class="status disconnected">Disconnected</div>
        </div>

        <div class="section">
            <h3>Join Chat</h3>
            <label>Chat ID: <input type="number" id="chatId" value="1"></label>
            <button onclick="joinChat()">Join Chat</button>
            <button onclick="leaveChat()">Leave Chat</button>
        </div>

        <div class="section">
            <h3>Send Message</h3>
            <textarea id="messageContent" placeholder="Type your message..." style="width: 90%; height: 60px;"></textarea>
            <br>
            <label>Message Type: 
                <select id="messageType">
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                </select>
            </label>
            <button onclick="sendMessage()">Send Message</button>
        </div>

        <div class="section">
            <h3>Typing Indicator</h3>
            <button onclick="sendTyping(true)">Start Typing</button>
            <button onclick="sendTyping(false)">Stop Typing</button>
        </div>

        <div class="section">
            <h3>Received Messages</h3>
            <div class="messages" id="messages"></div>
        </div>

        <div class="section">
            <h3>Event Log</h3>
            <button onclick="clearLog()">Clear Log</button>
            <div class="log" id="log"></div>
        </div>
    </div>

    <script>
        let socket = null;

        function log(message, data = null) {
            const logDiv = document.getElementById('log');
            const time = new Date().toLocaleTimeString();
            const entry = document.createElement('div');
            entry.innerHTML = `<strong>[${time}]</strong> ${message}`;
            if (data) {
                entry.innerHTML += `<br><pre>${JSON.stringify(data, null, 2)}</pre>`;
            }
            logDiv.appendChild(entry);
            logDiv.scrollTop = logDiv.scrollHeight;
        }

        function addMessage(msg) {
            const messagesDiv = document.getElementById('messages');
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message';
            msgDiv.innerHTML = `
                <strong>From: ${msg.User?.name || msg.sender_id}</strong><br>
                ${msg.content}<br>
                <small>${new Date(msg.sent_at).toLocaleString()}</small>
            `;
            messagesDiv.appendChild(msgDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        function updateStatus(connected) {
            const status = document.getElementById('status');
            const disconnectBtn = document.getElementById('disconnectBtn');
            if (connected) {
                status.className = 'status connected';
                status.textContent = '✓ Connected';
                disconnectBtn.disabled = false;
            } else {
                status.className = 'status disconnected';
                status.textContent = '✗ Disconnected';
                disconnectBtn.disabled = true;
            }
        }

        function connect() {
            const userId = document.getElementById('userId').value;
            const token = document.getElementById('token').value;

            log('Connecting to server...');
            
            socket = io('http://localhost:3000', {
                transports: ['websocket'],
                auth: { token: token }
            });

            socket.on('connect', () => {
                log('✅ Connected!', { socketId: socket.id });
                updateStatus(true);
                socket.emit('user_authenticated', parseInt(userId));
            });

            socket.on('disconnect', () => {
                log('❌ Disconnected');
                updateStatus(false);
            });

            socket.on('authenticated', (data) => {
                log('✅ Authenticated', data);
            });

            socket.on('joined_chat', (data) => {
                log('✅ Joined chat', data);
            });

            socket.on('new_message', (data) => {
                log('📨 New message received', data);
                addMessage(data);
            });

            socket.on('message_sent', (data) => {
                log('✅ Message sent', data);
                addMessage(data.message);
            });

            socket.on('message_error', (data) => {
                log('❌ Message error', data);
                alert('Error: ' + data.message);
            });

            socket.on('user_typing', (data) => {
                log(`✍️ User ${data.user_id} is ${data.is_typing ? 'typing' : 'stopped typing'}`);
            });

            socket.on('message_status_updated', (data) => {
                log('📬 Message status updated', data);
            });

            socket.on('message_deleted', (data) => {
                log('🗑️ Message deleted', data);
            });

            socket.on('error', (data) => {
                log('❌ Error', data);
            });

            socket.onAny((event, ...args) => {
                console.log('Event:', event, args);
            });
        }

        function disconnect() {
            if (socket) {
                socket.disconnect();
                log('Disconnected by user');
            }
        }

        function joinChat() {
            const chatId = document.getElementById('chatId').value;
            if (socket && socket.connected) {
                socket.emit('join_chat', parseInt(chatId));
                log('Joining chat...', { chatId });
            } else {
                alert('Not connected!');
            }
        }

        function leaveChat() {
            const chatId = document.getElementById('chatId').value;
            if (socket && socket.connected) {
                socket.emit('leave_chat', parseInt(chatId));
                log('Leaving chat...', { chatId });
            } else {
                alert('Not connected!');
            }
        }

        function sendMessage() {
            const content = document.getElementById('messageContent').value;
            const chatId = document.getElementById('chatId').value;
            const messageType = document.getElementById('messageType').value;

            if (!content.trim()) {
                alert('Message content is required!');
                return;
            }

            if (socket && socket.connected) {
                const data = {
                    chat_id: parseInt(chatId),
                    content: content,
                    message_type: messageType,
                    tempId: Date.now()
                };
                socket.emit('send_message', data);
                log('Sending message...', data);
                document.getElementById('messageContent').value = '';
            } else {
                alert('Not connected!');
            }
        }

        function sendTyping(isTyping) {
            const chatId = document.getElementById('chatId').value;
            if (socket && socket.connected) {
                socket.emit('typing', {
                    chat_id: parseInt(chatId),
                    is_typing: isTyping
                });
                log(`Typing indicator: ${isTyping}`);
            }
        }

        function clearLog() {
            document.getElementById('log').innerHTML = '';
            document.getElementById('messages').innerHTML = '';
        }
    </script>
</body>
</html>
```

---

## Step 5: Complete Testing Workflow

### Test Scenario: Two Users Chatting

1. **Terminal 1**: Keep server running
2. **Browser 1**: Open `test-messaging-client.html`
   - User ID: 1
   - Enter JWT token for user 1
   - Connect
   - Join chat 1

3. **Browser 2**: Open another tab with `test-messaging-client.html`
   - User ID: 2
   - Enter JWT token for user 2
   - Connect
   - Join chat 1

4. **Test Real-time Messaging**:
   - Send message from Browser 1
   - Should appear instantly in Browser 2
   - Test typing indicators
   - Test message status updates

---

## Step 6: Test Checklist

### ✅ REST API Tests
- [ ] User registration/login works
- [ ] Get messages endpoint returns data
- [ ] Get unread count works
- [ ] Search messages works
- [ ] Authentication required for protected routes

### ✅ Socket.io Tests
- [ ] Socket connection established
- [ ] User authentication via socket
- [ ] Join/leave chat rooms
- [ ] Send message - appears in real-time
- [ ] Typing indicators work
- [ ] Message status updates (delivered/read)
- [ ] Message deletion works
- [ ] Bulk mark as read works
- [ ] Multiple users can chat simultaneously

---

## Common Issues & Solutions

### Issue: "Not authenticated" error
**Solution**: Emit `user_authenticated` event with user ID after connection

### Issue: Messages not appearing in real-time
**Solution**: Ensure both users have joined the same chat room using `join_chat` event

### Issue: Database connection error
**Solution**: Check PostgreSQL is running and `.env` has correct database credentials

### Issue: Socket connection fails
**Solution**: Check CORS settings in `src/config/socket.js`

---

## Quick Test Commands

```powershell
# Check if server is running
curl http://localhost:3000

# Test with sample request (after getting token)
$token = "YOUR_JWT_TOKEN"
curl -X GET "http://localhost:3000/api/messages/unread/count" `
  -H "Authorization: Bearer $token"
```

---

## Expected Behavior

1. **Send Message**: 
   - Sender gets `message_sent` event
   - Receivers get `new_message` event
   - Message saved in database

2. **Message Status**:
   - Initially: `sent`
   - When delivered: `delivered` 
   - When read: `read`

3. **Typing Indicator**:
   - Real-time notification to other users in chat

4. **Message Search**:
   - Returns matching messages from database

---

## Next Steps for Production

1. Add file upload functionality (images, videos)
2. Implement message encryption
3. Add push notifications
4. Add rate limiting
5. Add message pagination
6. Add group chat features
7. Add voice/video call signaling

---

## Debugging Tips

1. **Enable verbose logging**: Check `src/utils/logger.js`
2. **Monitor socket events**: Use browser DevTools → Network → WS tab
3. **Check database**: Query messages table directly
4. **Use Postman**: For REST API testing
5. **Browser console**: Check for JavaScript errors

---

Your messaging system is well-structured! Test it step-by-step using this guide.
