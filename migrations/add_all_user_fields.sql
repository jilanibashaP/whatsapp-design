-- Comprehensive migration to add all new user attributes
-- This migration adds: email, presence fields (last_seen, is_online), and OTP fields
-- Run this migration: psql -U your_username -d your_database -f migrations/add_all_user_fields.sql

-- Start transaction for atomic migration
BEGIN;

-- Add email field if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='email'
  ) THEN
    ALTER TABLE users ADD COLUMN email VARCHAR(255);
    RAISE NOTICE 'Column email added';
  ELSE
    RAISE NOTICE 'Column email already exists';
  END IF;
END $$;

-- Add presence tracking fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='last_seen'
  ) THEN
    ALTER TABLE users ADD COLUMN last_seen TIMESTAMP NULL;
    RAISE NOTICE 'Column last_seen added';
  ELSE
    RAISE NOTICE 'Column last_seen already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='is_online'
  ) THEN
    ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Column is_online added';
  ELSE
    RAISE NOTICE 'Column is_online already exists';
  END IF;
END $$;

-- Add OTP verification fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='otp'
  ) THEN
    ALTER TABLE users ADD COLUMN otp VARCHAR(6) NULL;
    RAISE NOTICE 'Column otp added';
  ELSE
    RAISE NOTICE 'Column otp already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='otp_expiry'
  ) THEN
    ALTER TABLE users ADD COLUMN otp_expiry TIMESTAMP NULL;
    RAISE NOTICE 'Column otp_expiry added';
  ELSE
    RAISE NOTICE 'Column otp_expiry already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='otp_attempts'
  ) THEN
    ALTER TABLE users ADD COLUMN otp_attempts INTEGER DEFAULT 0;
    RAISE NOTICE 'Column otp_attempts added';
  ELSE
    RAISE NOTICE 'Column otp_attempts already exists';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='is_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'Column is_verified added';
  ELSE
    RAISE NOTICE 'Column is_verified already exists';
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone_otp ON users(phone_number, otp);
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen);

-- Add comments for documentation
COMMENT ON COLUMN users.email IS 'User email address (optional)';
COMMENT ON COLUMN users.last_seen IS 'Last time user was active';
COMMENT ON COLUMN users.is_online IS 'Current online status of the user';
COMMENT ON COLUMN users.otp IS 'Current OTP for verification (cleared after verification)';
COMMENT ON COLUMN users.otp_expiry IS 'Expiration time for the current OTP';
COMMENT ON COLUMN users.otp_attempts IS 'Number of failed OTP attempts';
COMMENT ON COLUMN users.is_verified IS 'Whether user has verified their phone number';

-- Update existing users (backward compatibility)
UPDATE users SET is_online = FALSE WHERE is_online IS NULL;
UPDATE users SET otp_attempts = 0 WHERE otp_attempts IS NULL;
UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL;

COMMIT;

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
END $$;
