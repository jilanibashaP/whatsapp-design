# Database Guide for Messaging App (5K Users)

## Best Choice: PostgreSQL 🎯

For an application with **only 5K users**, PostgreSQL is the ideal choice. You have flexibility and don't need to worry about extreme scaling.

---

## Why PostgreSQL is Perfect for 5K Users

✅ **More than enough performance** - Can easily handle millions of messages  
✅ **ACID transactions** - Strong consistency for message delivery  
✅ **Rich querying** - SQL makes complex features easier  
✅ **Single database** - No need for multiple database types  
✅ **Better for small scale** - Simpler operations and maintenance  
✅ **Cost-effective** - Lower infrastructure costs  
✅ **Excellent tooling** - pgAdmin, monitoring, backups all mature  
✅ **JSON support** - Can store flexible data when needed  

### Performance Reality Check

- PostgreSQL can handle **10,000+ writes/second** on modest hardware
- With 5K users, you'll have maybe **50-100 concurrent users**
- Even if each sends 10 messages/minute, that's only **~17 messages/second**
- PostgreSQL will handle this **effortlessly**

---

## Recommended Architecture for 5K Users

```
PostgreSQL (Primary Database)
    ↓
Redis (Optional - for caching)
    ↓
S3/Local Storage (Media files)
```

**You can actually start with just PostgreSQL + Local Storage and add Redis later if needed!**

---

## Complete Database Schema

### Users Table

Stores all registered users’ profile information.

```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    profile_pic_url TEXT,
    status_message VARCHAR(200),
    last_seen TIMESTAMP,
    is_online BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chats Table
Represents a conversation — either 1-on-1 (individual) or group.

```sql
CREATE TABLE chats (
    chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_type VARCHAR(20) NOT NULL CHECK (chat_type IN ('individual', 'group')),
    name VARCHAR(100), -- for group chats
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Chat Members Table

Links users ↔ chats, representing who is part of which chat.

Why it’s needed:

A chat can have multiple users (especially for groups).
Even 1-on-1 chats use this to track participants and “last read” info.

```sql
CREATE TABLE chat_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(chat_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP,
    UNIQUE(chat_id, user_id)
);
```

### Messages Table

```sql
CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(chat_id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'audio', 'document')),
    content TEXT,
    media_url TEXT,
    thumbnail_url TEXT,
    file_size BIGINT,
    reply_to UUID REFERENCES messages(message_id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Message Status Table

```sql
CREATE TABLE message_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(message_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(message_id, user_id)
);
```

### Contacts Table

```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    contact_user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    contact_name VARCHAR(100), -- custom name saved by user
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, contact_user_id)
);
```

### Performance Indexes

```sql
-- Indexes for Performance
CREATE INDEX idx_messages_chat_id ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_message_status_message_id ON message_status(message_id);
CREATE INDEX idx_message_status_user_status ON message_status(user_id, status);
CREATE INDEX idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX idx_chat_members_chat_id ON chat_members(chat_id);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_users_phone ON users(phone);
```

---

## Common SQL Queries

### 1. Get All Chats for a User with Last Message

```sql
SELECT 
    c.chat_id,
    c.chat_type,
    c.name,
    u.name as other_user_name,
    u.profile_pic_url,
    u.is_online,
    m.content as last_message,
    m.created_at as last_message_time,
    COUNT(CASE WHEN ms.status != 'read' THEN 1 END) as unread_count
FROM chats c
JOIN chat_members cm ON c.chat_id = cm.chat_id
LEFT JOIN chat_members cm2 ON c.chat_id = cm2.chat_id AND cm2.user_id != cm.user_id
LEFT JOIN users u ON cm2.user_id = u.user_id
LEFT JOIN LATERAL (
    SELECT content, created_at 
    FROM messages 
    WHERE chat_id = c.chat_id 
    ORDER BY created_at DESC 
    LIMIT 1
) m ON true
LEFT JOIN message_status ms ON ms.user_id = cm.user_id AND ms.status != 'read'
WHERE cm.user_id = $1
GROUP BY c.chat_id, c.chat_type, c.name, u.name, u.profile_pic_url, u.is_online, m.content, m.created_at
ORDER BY m.created_at DESC;
```

### 2. Get Messages for a Chat (with pagination)

```sql
SELECT 
    m.*,
    u.name as sender_name,
    u.profile_pic_url as sender_pic
FROM messages m
JOIN users u ON m.sender_id = u.user_id
WHERE m.chat_id = $1 
    AND m.is_deleted = false
ORDER BY m.created_at DESC
LIMIT 50 OFFSET $2;
```

### 3. Get Unread Message Count for User

```sql
SELECT COUNT(*) as unread_count
FROM messages m
JOIN chat_members cm ON m.chat_id = cm.chat_id
LEFT JOIN message_status ms ON m.message_id = ms.message_id AND ms.user_id = cm.user_id
WHERE cm.user_id = $1 
    AND m.sender_id != $1
    AND (ms.status IS NULL OR ms.status != 'read');
```

### 4. Mark Messages as Read

```sql
UPDATE message_status 
SET status = 'read', timestamp = CURRENT_TIMESTAMP
WHERE message_id = $1 AND user_id = $2;
```

### 5. Search Messages

```sql
SELECT m.*, u.name as sender_name
FROM messages m
JOIN users u ON m.sender_id = u.user_id
JOIN chat_members cm ON m.chat_id = cm.chat_id
WHERE cm.user_id = $1 
    AND m.content ILIKE '%' || $2 || '%'
    AND m.is_deleted = false
ORDER BY m.created_at DESC
LIMIT 50;
```

### 6. Create Individual Chat

```sql
-- Insert chat
INSERT INTO chats (chat_type, created_by)
VALUES ('individual', $1)
RETURNING chat_id;

-- Add both users as members
INSERT INTO chat_members (chat_id, user_id)
VALUES 
    ($1, $2),
    ($1, $3);
```

### 7. Create Group Chat

```sql
-- Insert chat
INSERT INTO chats (chat_type, name, created_by)
VALUES ('group', $1, $2)
RETURNING chat_id;

-- Add creator as admin
INSERT INTO chat_members (chat_id, user_id, role)
VALUES ($1, $2, 'admin');
```

### 8. Send Message

```sql
-- Insert message
INSERT INTO messages (chat_id, sender_id, message_type, content, media_url)
VALUES ($1, $2, $3, $4, $5)
RETURNING message_id, created_at;

-- Create status for all recipients
INSERT INTO message_status (message_id, user_id, status)
SELECT $1, user_id, 'sent'
FROM chat_members
WHERE chat_id = $2 AND user_id != $3;
```

### 9. Get Online Users

```sql
SELECT user_id, name, profile_pic_url
FROM users
WHERE is_online = true
AND user_id IN (
    SELECT contact_user_id 
    FROM contacts 
    WHERE user_id = $1
);
```

### 10. Block/Unblock User

```sql
UPDATE contacts
SET is_blocked = $1
WHERE user_id = $2 AND contact_user_id = $3;
```

---

## Simple Tech Stack for 5K Users

```
Frontend: React (Web) / React Native (Mobile)
    ↓
Backend: Node.js + Express
    ↓
WebSocket: Socket.io
    ↓
Database: PostgreSQL
    ↓
Cache: Redis (optional, add later)
    ↓
Storage: Local filesystem or AWS S3
```

---

## Node.js Connection Setup

### Install Dependencies

```bash
npm install pg
npm install express socket.io
npm install jsonwebtoken bcrypt
```

### Database Connection Pool

```javascript
// db.js
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'chatapp',
  user: 'your_username',
  password: 'your_password',
  max: 20, // maximum number of connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
```

### Example API Endpoint

```javascript
// routes/messages.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Get messages for a chat
router.get('/chats/:chatId/messages', async (req, res) => {
  try {
    const { chatId } = req.params;
    const { offset = 0, limit = 50 } = req.query;
    
    const result = await db.query(
      `SELECT 
        m.*,
        u.name as sender_name,
        u.profile_pic_url as sender_pic
      FROM messages m
      JOIN users u ON m.sender_id = u.user_id
      WHERE m.chat_id = $1 
        AND m.is_deleted = false
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3`,
      [chatId, limit, offset]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send message
router.post('/messages', async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { chatId, senderId, messageType, content, mediaUrl } = req.body;
    
    // Insert message
    const messageResult = await client.query(
      `INSERT INTO messages (chat_id, sender_id, message_type, content, media_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [chatId, senderId, messageType, content, mediaUrl]
    );
    
    const message = messageResult.rows[0];
    
    // Create status for all recipients
    await client.query(
      `INSERT INTO message_status (message_id, user_id, status)
       SELECT $1, user_id, 'sent'
       FROM chat_members
       WHERE chat_id = $2 AND user_id != $3`,
      [message.message_id, chatId, senderId]
    );
    
    await client.query('COMMIT');
    
    res.json(message);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  } finally {
    client.release();
  }
});

module.exports = router;
```

---

## Performance Tips for PostgreSQL

### 1. Regular VACUUM

Keep database clean and optimized:

```sql
VACUUM ANALYZE messages;
VACUUM ANALYZE message_status;
```

### 2. Connection Pooling

Use pg-pool with appropriate settings:
- Max 20 connections is enough for 5K users
- Set idle timeout to 30 seconds
- Enable connection timeout

### 3. Proper Indexes

All necessary indexes are provided in the schema above. Monitor query performance:

```sql
-- Check slow queries
SELECT * FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 4. Query Optimization

```sql
-- Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE
SELECT * FROM messages WHERE chat_id = 'some-uuid';
```

### 5. Partitioning (Only if Needed Later)

If you exceed 10M+ messages, consider partitioning:

```sql
-- Partition by month
CREATE TABLE messages_2025_11 PARTITION OF messages
FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE messages_2025_12 PARTITION OF messages
FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
```

---

## When to Add Redis

Add Redis only when you notice:

- ❌ Slow "who's online" queries
- ❌ Need faster unread count updates
- ❌ Want to cache recent chat lists
- ❌ Session management getting slow

For 5K users, you might **never need it**.

### Redis Use Cases (If Needed)

```javascript
// Store online users
await redis.sadd('online_users', userId);
await redis.expire('online_users', 300); // 5 minutes

// Cache unread counts
await redis.set(`unread:${userId}`, count, 'EX', 60);

// Cache recent chats
await redis.setex(`chats:${userId}`, 300, JSON.stringify(chats));
```

---

## Cost Estimation for 5K Users

| Component | Cost/Month | Notes |
|-----------|-----------|-------|
| **Database** | $10-20 | Small VPS or managed PostgreSQL |
| **Server** | $20-40 | 2GB RAM, 2 CPU cores |
| **Storage** | $5-10 | 100GB for media |
| **Total** | **$35-70** | Can run on single $40/month server |

### Hosting Options

1. **DigitalOcean Droplet**: $24/month (2GB RAM, 1 CPU, 50GB SSD)
2. **AWS Lightsail**: $20/month (2GB RAM, 1 CPU, 60GB SSD)
3. **Heroku**: $25/month (Hobby dyno + Postgres)
4. **Railway**: $20/month (Pay as you go)

---

## Backup Strategy

### Automated Daily Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
DB_NAME="chatapp"

# Create backup
pg_dump $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress
gzip $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql.gz"
```

### Setup Cron Job

```bash
# Run daily at 2 AM
0 2 * * * /path/to/backup.sh
```

---

## Monitoring

### Key Metrics to Monitor

1. **Database Performance**
   - Query execution time
   - Number of connections
   - Database size

2. **Application Performance**
   - Message delivery time
   - API response time
   - WebSocket connections

3. **System Resources**
   - CPU usage
   - Memory usage
   - Disk space

### PostgreSQL Monitoring Queries

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Database size
SELECT pg_size_pretty(pg_database_size('chatapp'));

-- Table sizes
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::text)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC;

-- Slow queries
SELECT 
    query,
    mean_exec_time,
    calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Scaling Path

### Current Setup (5K users)
- Single PostgreSQL server
- Local media storage
- Simple Node.js server

### If Growing to 50K users
- Add read replicas for PostgreSQL
- Move media to S3/CloudFlare R2
- Add Redis for caching
- Multiple application servers with load balancer

### If Growing to 500K+ users
- PostgreSQL sharding
- Message queue (RabbitMQ)
- Microservices architecture
- CDN for media delivery
- Consider MongoDB/Cassandra migration

---

## Database Comparison (For Reference)

| Feature | PostgreSQL | MongoDB | Cassandra |
|---------|-----------|---------|-----------|
| **Write Speed** | ⚡ Good | ⚡⚡ Very Good | ⚡⚡⚡ Excellent |
| **Read Speed** | ⚡⚡ Very Good | ⚡⚡⚡ Excellent | ⚡⚡ Very Good |
| **Horizontal Scaling** | ⚡ Moderate | ⚡⚡ Very Good | ⚡⚡⚡ Excellent |
| **Learning Curve** | 🟢 Easy | 🟢 Easy | 🔴 Hard |
| **Query Flexibility** | ⚡⚡⚡ Excellent | 🟢 Good | 🔴 Limited |
| **Consistency** | Strong | Strong | Eventual |
| **Best For** | 5K-100K users | 100K-10M users | 10M+ users |
| **Cost (5K users)** | $10-20/mo | $20-30/mo | $50+/mo |

---

## Summary

✅ **Use PostgreSQL** - Perfect for your scale  
✅ **Single database** - Simpler to manage  
✅ **SQL queries** - Easier to build features  
✅ **Room to grow** - Can handle 100K+ users easily  
✅ **Lower costs** - One database, less infrastructure  
✅ **Start simple** - Add complexity only when needed  

### Quick Start Commands

```bash
# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Create database
sudo -u postgres psql
CREATE DATABASE chatapp;
CREATE USER chatapp_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE chatapp TO chatapp_user;

# Run schema
psql -U chatapp_user -d chatapp -f schema.sql
```

---

## Next Steps

1. ✅ Set up PostgreSQL database
2. ✅ Create tables using provided schema
3. ✅ Build authentication API
4. ✅ Implement WebSocket for real-time messaging
5. ✅ Build message sending/receiving
6. ✅ Add media upload functionality
7. ✅ Implement read receipts
8. ✅ Add group chat support

**You have everything you need to build a production-ready messaging app for 5K users!** 🚀














------------------------------------------------------------------------------------------------------------------------------------------------------------------
# 📱 WhatsApp Chatting App – Database Schema Design

A simple relational schema design for a WhatsApp-like messaging app.

---

## 🧍 1. `users` Table
Stores all user accounts.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Unique user ID |
| `name` | VARCHAR | User’s display name |
| `phone_number` | VARCHAR | User’s phone number |
| `profile_pic` | TEXT | Profile picture URL |
| `status` | VARCHAR | “Available”, “Busy”, etc. |
| `created_at` | DATETIME | When the account was created |

**Example:**

| id | name | phone_number | status |
|----|------|---------------|--------|
| 1 | Alice | +911234567890 | Busy |
| 2 | Bob | +919876543210 | Available |

---

## 💬 2. `chats` Table
Represents 1-on-1 or group chat.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Unique chat ID |
| `is_group` | BOOLEAN | `false` for private chat, `true` for group |
| `group_name` | VARCHAR | Only used if group chat |
| `group_icon` | TEXT | Optional group icon |
| `created_by` | INT (FK → users.id) | Who created the chat |
| `created_at` | DATETIME | When chat was created |

**Example:**

| id | is_group | group_name | created_by |
|----|-----------|-------------|-------------|
| 1 | false | NULL | NULL |
| 2 | true | Friends Group | 1 |

---

## 👥 3. `chat_members` Table
Stores which users belong to which chat.

| Column | Type | Description |
|--------|------|-------------|
| `chat_id` | INT (FK → chats.id) | Which chat |
| `user_id` | INT (FK → users.id) | Member of the chat |
| `role` | ENUM('admin', 'member') | Role in group |
| `joined_at` | DATETIME | When they joined |

**Example:**

| chat_id | user_id | role |
|----------|----------|------|
| 1 | 1 | member |
| 1 | 2 | member |
| 2 | 1 | admin |
| 2 | 2 | member |

---

## 📨 4. `messages` Table
Stores all text/media messages.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Message ID |
| `chat_id` | INT (FK → chats.id) | Which chat |
| `sender_id` | INT (FK → users.id) | Who sent it |
| `message_type` | ENUM('text', 'image', 'video', 'audio', 'file') | Type of message |
| `content` | TEXT | Message text or file URL |
| `reply_to` | INT (FK → messages.id, nullable) | If it’s a reply |
| `sent_at` | DATETIME | Time sent |
| `status` | ENUM('sent', 'delivered', 'read') | Message delivery status |

**Example:**

| id | chat_id | sender_id | type | content | status |
|----|----------|------------|-------|----------|---------|
| 1 | 1 | 1 | text | Hey Bob! | delivered |
| 2 | 1 | 2 | text | Hi Alice! | read |

---

## ✅ 5. `message_status` (optional)
Tracks read receipts for group messages per user.

| Column | Type | Description |
|--------|------|-------------|
| `message_id` | INT (FK → messages.id) | Message |
| `user_id` | INT (FK → users.id) | Receiver |
| `status` | ENUM('sent', 'delivered', 'read') | Status for this user |
| `updated_at` | DATETIME | When status updated |

---

---

## 📁 Example Flow

1️⃣ **Alice sends “Hi Bob!”**  
→ Insert into `messages` with `chat_id=1`, `sender_id=1`, `content="Hi Bob!"`.

2️⃣ **Bob reads it**  
→ Update `messages.status = "read"` or update row in `message_status`.

---
