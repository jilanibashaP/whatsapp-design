-- Create corporate_contacts table (company directory)
-- This is the master list of all company employees/teammates
-- Run this migration: psql -U your_username -d your_database -f migrations/create_corporate_contacts.sql

BEGIN;

-- Drop existing user_contacts table to rebuild
DROP TABLE IF EXISTS user_contacts CASCADE;

-- Create corporate_contacts table
CREATE TABLE IF NOT EXISTS corporate_contacts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255),
  department VARCHAR(100),
  job_title VARCHAR(100),
  profile_pic TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_contacts table (tracks which corporate contacts each user added)
CREATE TABLE IF NOT EXISTS user_contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  corporate_contact_id INTEGER NOT NULL REFERENCES corporate_contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, corporate_contact_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_corporate_contacts_phone ON corporate_contacts(phone_number);
CREATE INDEX IF NOT EXISTS idx_corporate_contacts_active ON corporate_contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_user_contacts_user_id ON user_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_corporate_id ON user_contacts(corporate_contact_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_corporate_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_corporate_contacts_updated_at
  BEFORE UPDATE ON corporate_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_corporate_contacts_updated_at();

-- Add comments
COMMENT ON TABLE corporate_contacts IS 'Company directory - master list of all employees';
COMMENT ON TABLE user_contacts IS 'Tracks which corporate contacts each user has added to their in-app contact list';

COMMIT;

-- Insert dummy corporate contacts (20 employees)
BEGIN;

INSERT INTO corporate_contacts (name, phone_number, email, department, job_title, profile_pic, is_active)
VALUES
  ('Alice Johnson', '+1234567890', 'alice.j@company.com', 'Engineering', 'Senior Software Engineer', 'https://i.pravatar.cc/150?img=1', true),
  ('Bob Smith', '+1234567891', 'bob.s@company.com', 'Engineering', 'Full Stack Developer', 'https://i.pravatar.cc/150?img=2', true),
  ('Charlie Davis', '+1234567892', 'charlie.d@company.com', 'Design', 'UX Designer', 'https://i.pravatar.cc/150?img=3', true),
  ('Diana Prince', '+1234567893', 'diana.p@company.com', 'Marketing', 'Marketing Manager', 'https://i.pravatar.cc/150?img=4', true),
  ('Ethan Hunt', '+1234567894', 'ethan.h@company.com', 'Engineering', 'DevOps Engineer', 'https://i.pravatar.cc/150?img=5', true),
  ('Fiona Green', '+1234567895', 'fiona.g@company.com', 'Data Science', 'Data Scientist', 'https://i.pravatar.cc/150?img=6', true),
  ('George Miller', '+1234567896', 'george.m@company.com', 'Product', 'Business Analyst', 'https://i.pravatar.cc/150?img=7', true),
  ('Hannah Lee', '+1234567897', 'hannah.l@company.com', 'HR', 'HR Manager', 'https://i.pravatar.cc/150?img=8', true),
  ('Ian Wright', '+1234567898', 'ian.w@company.com', 'Engineering', 'Frontend Developer', 'https://i.pravatar.cc/150?img=9', true),
  ('Julia Roberts', '+1234567899', 'julia.r@company.com', 'Engineering', 'Backend Developer', 'https://i.pravatar.cc/150?img=10', true),
  ('Kevin Brown', '+1234567800', 'kevin.b@company.com', 'QA', 'QA Engineer', 'https://i.pravatar.cc/150?img=11', true),
  ('Laura Palmer', '+1234567801', 'laura.p@company.com', 'Product', 'Product Manager', 'https://i.pravatar.cc/150?img=12', true),
  ('Michael Scott', '+1234567802', 'michael.s@company.com', 'Sales', 'Sales Director', 'https://i.pravatar.cc/150?img=13', true),
  ('Nancy Drew', '+1234567803', 'nancy.d@company.com', 'Security', 'Security Analyst', 'https://i.pravatar.cc/150?img=14', true),
  ('Oliver Queen', '+1234567804', 'oliver.q@company.com', 'Engineering', 'Tech Lead', 'https://i.pravatar.cc/150?img=15', true),
  ('Piper Chapman', '+1234567805', 'piper.c@company.com', 'Marketing', 'Content Writer', 'https://i.pravatar.cc/150?img=16', true),
  ('Quinn Fabray', '+1234567806', 'quinn.f@company.com', 'Design', 'Graphic Designer', 'https://i.pravatar.cc/150?img=17', true),
  ('Rachel Green', '+1234567807', 'rachel.g@company.com', 'Design', 'UI/UX Designer', 'https://i.pravatar.cc/150?img=18', true),
  ('Steve Rogers', '+1234567808', 'steve.r@company.com', 'Engineering', 'Engineering Manager', 'https://i.pravatar.cc/150?img=19', true),
  ('Tony Stark', '+1234567809', 'tony.s@company.com', 'Executive', 'CTO', 'https://i.pravatar.cc/150?img=20', true)
ON CONFLICT (phone_number) DO NOTHING;

COMMIT;

DO $$
BEGIN
  RAISE NOTICE 'Corporate contacts table created and populated successfully!';
END $$;
