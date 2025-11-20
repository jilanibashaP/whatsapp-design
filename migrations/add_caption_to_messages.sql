-- Add caption field to messages table for image/video captions
-- This allows users to add text captions to media messages (like WhatsApp)

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS caption TEXT;
