-- Migration to make the 'name' column nullable in the users table
-- This allows users to register with phone number only and add their name later
-- Run this migration: psql -U your_username -d your_database -f migrations/make_name_nullable.sql

BEGIN;

-- Make name column nullable
ALTER TABLE users 
  ALTER COLUMN name DROP NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.name IS 'User display name (can be set after registration)';

COMMIT;

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '✓ Migration completed successfully! The name column is now nullable.';
END $$;
