-- Migration to ensure users table is ready for OTP-based authentication
-- Run this if you need to update your existing users table

-- Ensure phone_number is unique and required
ALTER TABLE users 
  ALTER COLUMN phone_number SET NOT NULL;

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_phone_number_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);
  END IF;
END $$;

-- Make password optional (for OTP-based auth)
ALTER TABLE users 
  ALTER COLUMN password DROP NOT NULL;

-- Add email column if not exists (optional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='email'
  ) THEN
    ALTER TABLE users ADD COLUMN email VARCHAR(255);
  END IF;
END $$;

-- Add index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);

COMMENT ON COLUMN users.phone_number IS 'Phone number with country code (e.g., +1234567890)';
COMMENT ON COLUMN users.password IS 'Optional: Only used if switching from OTP to password auth';
