-- Migration: Add last_seen field to users table for presence tracking
-- Run this if your users table doesn't have the last_seen column

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_seen DATETIME DEFAULT NULL;

-- Create index for faster presence queries
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Update existing users to have offline status
UPDATE users SET status = 'offline' WHERE status IS NULL OR status = '';

-- Optional: Add more status-related columns for rich presence
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online);
