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
| `email` |  VARCHAR | 

**Example:**

| id | name | phone_number | status |
|----|------|---------------|--------|
| 1 | Alice | +911234567890 | Busy |
| 2 | Bob | +919876543210 | Available |

---
# 📋 Chats Table Documentation

## Purpose
Tracks conversation threads between users (private or group chats).

---

## When to Create Records

### Create in `chats` table when:
- **Private Chat**: When two users send their **first message** to each other
  - Check if a chat already exists between these two users
  - If not, create a new record with `is_group = false`
- **Group Chat**: When a user **creates a new group**
  - Create immediately with `is_group = true`
  - Set `group_name` and `created_by`

### Create in `chat_participants` table when:
- **Private Chat**: Right after creating the chat record
  - Add both users as participants
- **Group Chat**: 
  - Add the creator immediately
  - Add other members when they are invited/added to the group

---

## Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Unique chat ID |
| `is_group` | BOOLEAN | `false` = private, `true` = group |
| `group_name` | VARCHAR | Group name (NULL for private chats) |
| `group_icon` | TEXT | Optional icon URL |
| `created_by` | INT (FK) | User who created the group |
| `created_at` | DATETIME | Creation timestamp |

---

## Example Data

### Users Table
| id | name |
|----|------|
| 1 | Alice |
| 2 | Bob |
| 3 | Charlie |

### Example 1: Private Chat (Alice ↔ Bob)

**chats table:**
| id | is_group | group_name | created_by | created_at |
|----|----------|------------|------------|------------|
| 1 | false | NULL | NULL | 2025-11-07 12:00 |

**chat_participants table:**
| id | chat_id | user_id |
|----|---------|---------|
| 1 | 1 | 1 (Alice) |
| 2 | 1 | 2 (Bob) |

---

### Example 2: Group Chat (Alice, Bob, Charlie)

**chats table:**
| id | is_group | group_name | created_by | created_at |
|----|----------|------------|------------|------------|
| 2 | true | Friends Group | 1 | 2025-11-07 12:10 |

**chat_participants table:**
| id | chat_id | user_id |
|----|---------|---------|
| 3 | 2 | 1 (Alice) |
| 4 | 2 | 2 (Bob) |
| 5 | 2 | 3 (Charlie) |

---

# 📨 Messages Table

## Purpose
Stores all messages (text, images, videos, files) sent in chats.

---

## When to Create Records

### Create in `messages` table when:
- A user **sends any message** (text, image, video, etc.)
- Instantly create the record with `status = 'sent'`
- Link to the correct `chat_id` and `sender_id`

### Create in `message_status` table when:
- A message is sent **in a group chat**
- Create one record per recipient (excluding sender)
- Updates when each user receives/reads the message
- **Not needed for private chats** (use `messages.status` directly)

---

## Schema

### messages table

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT (PK) | Message ID |
| `chat_id` | INT (FK) | Which chat (→ chats.id) |
| `sender_id` | INT (FK) | Who sent it (→ users.id) |
| `message_type` | ENUM | 'text', 'image', 'video', 'audio', 'file' |
| `content` | TEXT | Message text or file URL |
| `reply_to` | INT (FK) | Reply to message ID (nullable) |
| `sent_at` | DATETIME | When sent |
| `status` | ENUM | 'sent', 'delivered', 'read' |

### message_status table (for group chats)

| Column | Type | Description |
|--------|------|-------------|
| `message_id` | INT (FK) | Message ID (→ messages.id) |
| `user_id` | INT (FK) | Receiver (→ users.id) |
| `status` | ENUM | 'sent', 'delivered', 'read' |
| `updated_at` | DATETIME | When status changed |

---

## Example Data

### Example 1: Private Chat Messages

**messages table:**
| id | chat_id | sender_id | message_type | content | status | sent_at |
|----|---------|-----------|--------------|---------|--------|---------|
| 1 | 1 | 1 (Alice) | text | Hey Bob! | delivered | 2025-11-07 12:05 |
| 2 | 1 | 2 (Bob) | text | Hi Alice! | read | 2025-11-07 12:06 |
| 3 | 1 | 1 (Alice) | image | https://cdn.com/pic.jpg | read | 2025-11-07 12:07 |

---

### Example 2: Group Chat Messages with Status Tracking

**messages table:**
| id | chat_id | sender_id | message_type | content | sent_at |
|----|---------|-----------|--------------|---------|---------|
| 4 | 2 | 1 (Alice) | text | Hello everyone! | 2025-11-07 12:15 |

**message_status table:**
| message_id | user_id | status | updated_at |
|------------|---------|--------|------------|
| 4 | 2 (Bob) | read | 2025-11-07 12:16 |
| 4 | 3 (Charlie) | delivered | 2025-11-07 12:15 |

> **Note**: Alice (sender) is not in `message_status` because she sent the message.

## 📁 Example Flow

1️⃣ **Alice sends “Hi Bob!”**  
→ Insert into `messages` with `chat_id=1`, `sender_id=1`, `content="Hi Bob!"`.

2️⃣ **Bob reads it**  
→ Update `messages.status = "read"` or update row in `message_status`.

---
