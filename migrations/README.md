# Database Migrations

This folder contains SQL migration scripts for updating the database schema.

## Available Migrations

### 1. `add_all_user_fields.sql` (Recommended - All-in-one)
Comprehensive migration that adds all new user attributes:
- `email` - User email address (optional)
- `last_seen` - Last time user was active
- `is_online` - Current online status
- `otp` - Current OTP for verification
- `otp_expiry` - OTP expiration time
- `otp_attempts` - Failed OTP attempt counter
- `is_verified` - Phone verification status

### 2. `make_name_nullable.sql` / `make-name-nullable.js` ⭐ IMPORTANT
Makes the `name` column nullable to allow users to register with phone number only:
- Removes NOT NULL constraint from `name` column
- Allows users to set their name after registration
- **Run this migration if you get "null value in column name violates not-null constraint" error**

```bash
# Using Node.js (recommended):
node migrations/make-name-nullable.js

# Using SQL:
psql -U your_username -d your_database -f migrations/make_name_nullable.sql
```

### 3. Individual Migrations (Legacy)
- `otp_auth_setup.sql` - Basic OTP setup
- `add_otp_fields_to_users.sql` - OTP fields only
- `add_presence_fields.sql` - Presence tracking fields only

## Running the Migration

### Option 1: Using Node.js Script (Recommended)
```bash
node migrations/run-migration.js
```

### Option 2: Using psql Command Line
```bash
psql -U your_username -d your_database -f migrations/add_all_user_fields.sql
```

### Option 3: Using pgAdmin or Database GUI
1. Open pgAdmin or your preferred PostgreSQL GUI
2. Connect to your database
3. Open the Query Tool
4. Load and execute `migrations/add_all_user_fields.sql`

## Before Running Migration

1. **Backup your database:**
   ```bash
   pg_dump -U your_username -d your_database > backup_$(date +%Y%m%d).sql
   ```

2. **Verify database connection settings** in `.env`:
   - DB_HOST
   - DB_PORT
   - DB_NAME
   - DB_USER
   - DB_PASSWORD

## After Migration

The script will:
- ✅ Add all missing columns (skip if they already exist)
- ✅ Create indexes for better performance
- ✅ Set default values for existing records
- ✅ Add helpful column comments
- ✅ Display verification results

## Rollback (if needed)

To remove the added columns:
```sql
BEGIN;
ALTER TABLE users 
  DROP COLUMN IF EXISTS email,
  DROP COLUMN IF EXISTS last_seen,
  DROP COLUMN IF EXISTS is_online,
  DROP COLUMN IF EXISTS otp,
  DROP COLUMN IF EXISTS otp_expiry,
  DROP COLUMN IF EXISTS otp_attempts,
  DROP COLUMN IF EXISTS is_verified;
COMMIT;
```

## Notes

- All migrations are **idempotent** (safe to run multiple times)
- Wrapped in transactions for atomic execution
- Includes backward compatibility for existing data
- Creates indexes for query optimization
