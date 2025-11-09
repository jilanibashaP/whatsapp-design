-- Add OTP verification fields to users table
-- Run this migration to support OTP storage in database

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS otp VARCHAR(6),
ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_otp ON users(phone_number, otp);

-- Update existing users to be verified (backward compatibility)
UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL OR is_verified = FALSE;

COMMENT ON COLUMN users.otp IS 'Current OTP for verification (cleared after verification)';
COMMENT ON COLUMN users.otp_expiry IS 'Expiration time for the current OTP';
COMMENT ON COLUMN users.otp_attempts IS 'Number of failed OTP attempts';
COMMENT ON COLUMN users.is_verified IS 'Whether user has verified their phone number';
