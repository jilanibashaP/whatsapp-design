-- Insert dummy users for testing contact sync
-- This creates 20 test users with various names and phone numbers
-- Run this migration: psql -U your_username -d your_database -f migrations/insert_dummy_contacts.sql

BEGIN;

-- Insert dummy users (adjust if some already exist)
INSERT INTO users (name, phone_number, profile_pic, about, is_verified, is_online, created_at)
VALUES
  ('Alice Johnson', '+1234567890', 'https://i.pravatar.cc/150?img=1', 'Product Manager at Tech Corp', true, true, CURRENT_TIMESTAMP),
  ('Bob Smith', '+1234567891', 'https://i.pravatar.cc/150?img=2', 'Software Engineer', true, false, CURRENT_TIMESTAMP),
  ('Charlie Davis', '+1234567892', 'https://i.pravatar.cc/150?img=3', 'UX Designer', true, true, CURRENT_TIMESTAMP),
  ('Diana Prince', '+1234567893', 'https://i.pravatar.cc/150?img=4', 'Marketing Lead', true, false, CURRENT_TIMESTAMP),
  ('Ethan Hunt', '+1234567894', 'https://i.pravatar.cc/150?img=5', 'DevOps Engineer', true, true, CURRENT_TIMESTAMP),
  ('Fiona Green', '+1234567895', 'https://i.pravatar.cc/150?img=6', 'Data Scientist', true, false, CURRENT_TIMESTAMP),
  ('George Miller', '+1234567896', 'https://i.pravatar.cc/150?img=7', 'Business Analyst', true, true, CURRENT_TIMESTAMP),
  ('Hannah Lee', '+1234567897', 'https://i.pravatar.cc/150?img=8', 'HR Manager', true, false, CURRENT_TIMESTAMP),
  ('Ian Wright', '+1234567898', 'https://i.pravatar.cc/150?img=9', 'Frontend Developer', true, true, CURRENT_TIMESTAMP),
  ('Julia Roberts', '+1234567899', 'https://i.pravatar.cc/150?img=10', 'Backend Developer', true, false, CURRENT_TIMESTAMP),
  ('Kevin Brown', '+1234567800', 'https://i.pravatar.cc/150?img=11', 'QA Engineer', true, true, CURRENT_TIMESTAMP),
  ('Laura Palmer', '+1234567801', 'https://i.pravatar.cc/150?img=12', 'Project Manager', true, false, CURRENT_TIMESTAMP),
  ('Michael Scott', '+1234567802', 'https://i.pravatar.cc/150?img=13', 'Sales Director', true, true, CURRENT_TIMESTAMP),
  ('Nancy Drew', '+1234567803', 'https://i.pravatar.cc/150?img=14', 'Security Analyst', true, false, CURRENT_TIMESTAMP),
  ('Oliver Queen', '+1234567804', 'https://i.pravatar.cc/150?img=15', 'Full Stack Developer', true, true, CURRENT_TIMESTAMP),
  ('Piper Chapman', '+1234567805', 'https://i.pravatar.cc/150?img=16', 'Content Writer', true, false, CURRENT_TIMESTAMP),
  ('Quinn Fabray', '+1234567806', 'https://i.pravatar.cc/150?img=17', 'Graphic Designer', true, true, CURRENT_TIMESTAMP),
  ('Rachel Green', '+1234567807', 'https://i.pravatar.cc/150?img=18', 'Fashion Designer', true, false, CURRENT_TIMESTAMP),
  ('Steve Rogers', '+1234567808', 'https://i.pravatar.cc/150?img=19', 'Team Lead', true, true, CURRENT_TIMESTAMP),
  ('Tony Stark', '+1234567809', 'https://i.pravatar.cc/150?img=20', 'CTO', true, true, CURRENT_TIMESTAMP)
ON CONFLICT (phone_number) DO NOTHING;

-- Update last_seen for offline users (random times in past 24 hours)
UPDATE users 
SET last_seen = CURRENT_TIMESTAMP - (random() * INTERVAL '24 hours')
WHERE is_online = false 
  AND phone_number IN (
    '+1234567891', '+1234567893', '+1234567895', '+1234567897', 
    '+1234567899', '+1234567801', '+1234567803', '+1234567805', 
    '+1234567807'
  );

COMMIT;

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'Dummy contacts inserted successfully!';
  RAISE NOTICE 'Total users count: ';
END $$;

-- Show count
SELECT COUNT(*) as total_users FROM users;
