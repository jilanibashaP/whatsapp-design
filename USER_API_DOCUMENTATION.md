# User API Documentation

This document provides details about all user-related API endpoints.

## Base URL
```
http://localhost:3000/api/users
```

---

## Endpoints

### 1. Request OTP (Login/Register)

**Endpoint:** `POST /api/users/request-otp`

**Description:** Request an OTP for phone number verification. If the phone number doesn't exist, a new user will be created automatically.

**Request Body:**
```json
{
  "phone_number": "+917569185865"
}
```

**Request Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone_number | string | Yes | Phone number with country code (e.g., +917569185865) |

**Success Response (200 OK):**
```json
{
  "message": "OTP generated successfully. Please verify to login.",
  "phone_number": "+917569185865",
  "otp": "123456"
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| message | string | Success message |
| phone_number | string | Formatted phone number |
| otp | string | 6-digit OTP (always included for testing) |

**Error Responses:**

- **400 Bad Request** - Missing phone number
```json
{
  "message": "Phone number is required"
}
```

- **500 Internal Server Error** - Server error
```json
{
  "message": "Server error during login"
}
```

**Notes:**
- OTP is valid for 5 minutes
- OTP is stored in the database
- Maximum 3 verification attempts allowed
- Phone number is automatically formatted with country code if missing

**Example:**
```bash
curl -X POST http://localhost:3000/api/users/request-otp \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+917569185865"}'
```

---

### 2. Verify OTP

**Endpoint:** `POST /api/users/verify-otp`

**Description:** Verify the OTP sent to the phone number and receive a JWT token for authentication.

**Request Body:**
```json
{
  "phone_number": "+917569185865",
  "otp": "123456"
}
```

**Request Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone_number | string | Yes | Phone number with country code |
| otp | string | Yes | 6-digit OTP received |

**Success Response (200 OK):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "phone_number": "+917569185865",
    "name": null,
    "profile_pic": null,
    "about": null,
    "email": null
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| message | string | Success message |
| token | string | JWT token (valid for 7 days) |
| user | object | User details |
| user.id | integer | User ID |
| user.phone_number | string | User's phone number |
| user.name | string\|null | User's display name |
| user.profile_pic | string\|null | Profile picture URL |
| user.about | string\|null | User's about/status |
| user.email | string\|null | User's email |

**Error Responses:**

- **400 Bad Request** - Missing phone number
```json
{
  "message": "Phone number is required"
}
```

- **400 Bad Request** - Missing OTP
```json
{
  "message": "OTP is required"
}
```

- **400 Bad Request** - No OTP found
```json
{
  "message": "No OTP found. Please request a new OTP."
}
```

- **400 Bad Request** - Invalid OTP
```json
{
  "message": "Invalid OTP. Please try again.",
  "attemptsRemaining": 2
}
```

- **400 Bad Request** - Too many attempts
```json
{
  "message": "Too many failed attempts. Please request a new OTP."
}
```

- **404 Not Found** - User not found
```json
{
  "message": "User not found. Please register first."
}
```

- **500 Internal Server Error** - Server error
```json
{
  "message": "Server error during OTP verification"
}
```

**Notes:**
- OTP expires after 5 minutes (expiry check currently disabled)
- Maximum 3 verification attempts allowed
- After successful verification, OTP is cleared from database
- User is marked as verified (`is_verified: true`)
- JWT token is valid for 7 days

**Example:**
```bash
curl -X POST http://localhost:3000/api/users/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+917569185865",
    "otp": "123456"
  }'
```

---

### 3. Update User Details

**Endpoint:** `PUT /api/users/update`

**Description:** Update user profile information such as name, profile picture, about/status, and email.

**Request Body:**
```json
{
  "phone_number": "+917569185865",
  "name": "John Doe",
  "profile_pic": "https://example.com/profile.jpg",
  "about": "Hey there! I'm using WhatsApp",
  "email": "john@example.com"
}
```

**Request Parameters:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone_number | string | Yes | Phone number with country code |
| name | string | No | User's display name |
| profile_pic | string | No | Profile picture URL |
| about | string | No | User's status/about text |
| email | string | No | User's email address |

**Success Response (200 OK):**
```json
{
  "message": "User details updated successfully",
  "user": {
    "id": 1,
    "name": "John Doe",
    "phone_number": "+917569185865",
    "profile_pic": "https://example.com/profile.jpg",
    "about": "Hey there! I'm using WhatsApp",
    "email": "john@example.com",
    "created_at": "2025-11-10T07:33:40.444Z",
    "last_seen": null,
    "is_online": false,
    "otp": null,
    "otp_expiry": null,
    "otp_attempts": 0,
    "is_verified": true
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| message | string | Success message |
| user | object | Complete updated user object |

**Error Responses:**

- **400 Bad Request** - Missing phone number
```json
{
  "message": "Phone number is required"
}
```

- **404 Not Found** - User not found
```json
{
  "message": "User not found"
}
```

- **500 Internal Server Error** - Server error
```json
{
  "message": "Server error"
}
```

**Notes:**
- All fields except `phone_number` are optional
- Only provided fields will be updated
- Existing values remain unchanged for fields not included in the request
- No authentication required (consider adding authentication in production)

**Example:**
```bash
curl -X PUT http://localhost:3000/api/users/update \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+917569185865",
    "name": "John Doe",
    "about": "Hey there! I am using WhatsApp"
  }'
```

---

## Authentication Flow

### Complete Login/Registration Flow:

1. **Request OTP**
   ```
   POST /api/users/request-otp
   Body: { "phone_number": "+917569185865" }
   ```
   ↓
2. **Receive OTP** (in response and optionally via SMS)
   ```json
   { "otp": "123456" }
   ```
   ↓
3. **Verify OTP**
   ```
   POST /api/users/verify-otp
   Body: { "phone_number": "+917569185865", "otp": "123456" }
   ```
   ↓
4. **Receive JWT Token**
   ```json
   { "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
   ```
   ↓
5. **Update Profile (Optional)**
   ```
   PUT /api/users/update
   Body: { "phone_number": "+917569185865", "name": "John Doe" }
   ```

---

## Error Handling

All error responses follow this format:
```json
{
  "message": "Error description here"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (validation errors)
- `404` - Not Found (user not found)
- `500` - Internal Server Error

---

## Testing with Postman/Thunder Client

### 1. Request OTP
```
Method: POST
URL: http://localhost:3000/api/users/request-otp
Headers: Content-Type: application/json
Body (raw JSON):
{
  "phone_number": "+917569185865"
}
```

### 2. Verify OTP
```
Method: POST
URL: http://localhost:3000/api/users/verify-otp
Headers: Content-Type: application/json
Body (raw JSON):
{
  "phone_number": "+917569185865",
  "otp": "123456"
}
```

### 3. Update User
```
Method: PUT
URL: http://localhost:3000/api/users/update
Headers: Content-Type: application/json
Body (raw JSON):
{
  "phone_number": "+917569185865",
  "name": "John Doe",
  "about": "Hello World"
}
```

---

## Notes for Production

⚠️ **Security Considerations:**
- Add authentication middleware to `/update` endpoint
- Remove OTP from response in production mode
- Implement rate limiting for OTP requests
- Add HTTPS/SSL encryption
- Validate phone number format
- Implement CAPTCHA for OTP requests
- Add proper JWT token validation middleware

⚠️ **OTP Expiry:**
- OTP expiry check is currently commented out
- Uncomment the expiry validation before deploying to production

---

## Environment Variables Required

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=whatsapp_db
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
SMS_MODE=development
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_SNS_SENDER_ID=YourApp
```
