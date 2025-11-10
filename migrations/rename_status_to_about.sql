-- Migration: Rename status column to about
-- This changes the user status message field from 'status' to 'about'
-- Run this migration: psql -U your_username -d your_database -f migrations/rename_status_to_about.sql

BEGIN;

-- Check if 'status' column exists and 'about' doesn't already have data
DO $$
BEGIN
  -- Check if we need to rename
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='users' AND column_name='status'
  ) THEN
    -- If 'about' column already exists, merge data then drop 'status'
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='users' AND column_name='about'
    ) THEN
      -- Copy status data to about where about is null
      UPDATE users SET about = status WHERE about IS NULL AND status IS NOT NULL;
      RAISE NOTICE 'Merged status data into about column';
    ELSE
      -- Simply rename the column
      ALTER TABLE users RENAME COLUMN status TO about;
      RAISE NOTICE 'Renamed status column to about';
    END IF;
  ELSE
    RAISE NOTICE 'Status column does not exist, nothing to rename';
  END IF;
END $$;

-- Ensure about column has correct data type
ALTER TABLE users ALTER COLUMN about TYPE VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN users.about IS 'User status message/about text (e.g., "Hey there! I am using WhatsApp")';

-- Drop the old index if it exists and create a new one
DROP INDEX IF EXISTS idx_users_status;
CREATE INDEX IF NOT EXISTS idx_users_about ON users(about);

COMMIT;

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully! status → about';
END $$;
