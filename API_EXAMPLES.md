# API Request Body Examples

This file contains example request bodies for the WhatsApp-like messaging app API endpoints.

## Authentication

All chat and message endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Chat Endpoints

### 1. Create Private Chat

**Endpoint:** `POST /api/chats`

**Description:** Creates a one-on-one private chat between two users.

**Request Body:**
```json
{
  "user_id": 1,
  "is_group": false,
  "other_user_id": 2
}
```

**Field Descriptions:**
- `user_id` (integer, required): Your user ID (the authenticated user creating the chat)
- `is_group` (boolean, required): Must be `false` for private chat
- `other_user_id` (integer, required): The ID of the user you want to chat with

---

### 2. Create Group Chat

**Endpoint:** `POST /api/chats`

**Description:** Creates a group chat with multiple members.

**Request Body:**
```json
{
  "user_id": 1,
  "is_group": true,
  "group_name": "Project Team",
  "group_description": "Team discussion for Project X",
  "group_icon": "https://example.com/icons/team.png",
  "members": [2, 3, 4, 5]
}
```

**Field Descriptions:**
- `user_id` (integer, required): Your user ID (the authenticated user creating the chat)
- `is_group` (boolean, required): Must be `true` for group chat
- `group_name` (string, required): Name of the group
- `group_description` (string, optional): Description of the group
- `group_icon` (string/URL, optional): URL to the group icon/avatar
- `members` (array of integers, required): Array of user IDs to add to the group (minimum 1 member, excluding yourself)

**Example - Simple Group:**
```json
{
  "user_id": 1,
  "is_group": true,
  "group_name": "Family",
  "members": [2, 3]
}
```

**Example - Group with All Details:**
```json
{
  "user_id": 1,
  "is_group": true,
  "group_name": "Weekend Trip Planning",
  "group_description": "Planning our weekend getaway to the mountains",
  "group_icon": "https://cdn.example.com/groups/weekend-trip.jpg",
  "members": [5, 7, 9, 12, 15]
}
```

---

### 3. Get User Chats

**Endpoint:** `GET /api/chats`

**Description:** Retrieves all chats (private and group) for the authenticated user.

**Request Body:** None (GET request)

**Query Parameters:** None

---

## Chat Members

Chat members are automatically managed when creating chats:

### Private Chat Members
- Automatically adds both users (creator and other_user_id)
- Both users have 'member' role by default

### Group Chat Members
- Automatically adds the creator as admin
- Adds all specified members from the members array
- Creator has 'admin' role, others have 'member' role

---

## Database Schema Reference

### Chat Table Fields
```javascript
{
  id: INTEGER (auto-generated),
  is_group: BOOLEAN (default: false),
  group_name: STRING (required for groups),
  group_icon: TEXT (optional),
  group_description: TEXT (optional),
  created_by: INTEGER (user ID),
  created_at: DATE (auto-generated)
}
```

### Chat Member Table Fields
```javascript
{
  chat_id: INTEGER (primary key),
  user_id: INTEGER (primary key),
  role: ENUM('admin', 'member') (default: 'member'),
  joined_at: DATE (auto-generated)
}
```

---

## Complete API Testing Examples

### Example 1: Create a Private Chat
```bash
curl -X POST http://localhost:3000/api/chats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "user_id": 1,
    "is_group": false,
    "other_user_id": 5
  }'
```

### Example 2: Create a Work Group
```bash
curl -X POST http://localhost:3000/api/chats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "user_id": 1,
    "is_group": true,
    "group_name": "Marketing Team",
    "group_description": "Marketing department discussions",
    "group_icon": "https://example.com/marketing-icon.png",
    "members": [2, 3, 4, 6, 8]
  }'
```

### Example 3: Get All Chats
```bash
curl -X GET http://localhost:3000/api/chats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Response Format

All responses follow this format:

**Success Response:**
```json
{
  "success": true,
  "data": {
    "chat": {
      "id": 1,
      "is_group": true,
      "group_name": "Project Team",
      "group_description": "Team discussion for Project X",
      "group_icon": "https://example.com/icons/team.png",
      "created_by": 1,
      "created_at": "2025-11-07T10:30:00.000Z"
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Group name and at least one member are required for group chat"
}
```

---

## Testing with Postman

### 1. Create a Private Chat
- Method: POST
- URL: `http://localhost:3000/api/chats`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer <your_token>`
- Body (raw JSON):
```json
{
  "user_id": 1,
  "is_group": false,
  "other_user_id": 2
}
```

### 2. Create a Group Chat
- Method: POST
- URL: `http://localhost:3000/api/chats`
- Headers:
  - `Content-Type: application/json`
  - `Authorization: Bearer <your_token>`
- Body (raw JSON):
```json
{
  "user_id": 1,
  "is_group": true,
  "group_name": "Friends Circle",
  "group_description": "Our awesome friends group",
  "members": [2, 3, 4]
}
```

### 3. Get All Chats
- Method: GET
- URL: `http://localhost:3000/api/chats`
- Headers:
  - `Authorization: Bearer <your_token>`

---

## Notes

1. **User IDs**: Make sure the user IDs in the `members` array or `other_user_id` exist in your database.

2. **Creator as Member**: The chat creator is automatically added to the group, so you don't need to include your own user ID in the members array.

3. **Duplicate Prevention**: For private chats, the system automatically checks if a chat already exists between two users and returns the existing chat instead of creating a duplicate.

4. **Group Requirements**: 
   - Group name is required
   - At least one member is required (in addition to the creator)
   - Group icon and description are optional

5. **Role Assignment**:
   - Group creator automatically gets 'admin' role
   - All other members get 'member' role by default
   - Private chat members both get 'member' role
