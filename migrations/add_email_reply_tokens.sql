-- Migration: Add email reply tokens table for bidirectional messaging
-- Date: 2024-09-08

CREATE TABLE IF NOT EXISTS email_reply_tokens (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  event_id VARCHAR NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_email TEXT NOT NULL,
  participant_name TEXT NOT NULL,
  organizer_email TEXT NOT NULL,
  organizer_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_email_reply_tokens_token ON email_reply_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_reply_tokens_event_id ON email_reply_tokens(event_id);
CREATE INDEX IF NOT EXISTS idx_email_reply_tokens_active ON email_reply_tokens(is_active, expires_at);

-- Add comment to the table
COMMENT ON TABLE email_reply_tokens IS 'Tokens for handling email replies in bidirectional messaging';