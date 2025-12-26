-- Migration to add user_contacts table for tracking synced contacts
-- This tracks which contacts a user has synced to their device
-- Run this migration: psql -U your_username -d your_database -f migrations/add_contact_sync_table.sql

BEGIN;

-- Create user_contacts table to track synced contacts
CREATE TABLE IF NOT EXISTS user_contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_synced_to_device BOOLEAN DEFAULT FALSE,
  synced_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, contact_user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_contacts_user_id ON user_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_contact_user_id ON user_contacts(contact_user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_synced ON user_contacts(user_id, is_synced_to_device);

-- Add comments
COMMENT ON TABLE user_contacts IS 'Tracks user contacts and their sync status';
COMMENT ON COLUMN user_contacts.user_id IS 'The user who owns this contact list';
COMMENT ON COLUMN user_contacts.contact_user_id IS 'The user being added as a contact';
COMMENT ON COLUMN user_contacts.is_synced_to_device IS 'Whether this contact has been synced to device contacts';
COMMENT ON COLUMN user_contacts.synced_at IS 'Timestamp when contact was synced to device';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_contacts_updated_at
  BEFORE UPDATE ON user_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_contacts_updated_at();

COMMIT;

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'user_contacts table created successfully!';
END $$;
