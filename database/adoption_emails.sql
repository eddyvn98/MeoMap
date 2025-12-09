-- Create adoption_emails table to log all email notifications
-- This helps track which emails were sent, when, and to whom

CREATE TABLE IF NOT EXISTS adoption_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  adoption_request_id UUID NOT NULL REFERENCES adoption_requests(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  email_type VARCHAR(50) NOT NULL, -- 'delivery_notification', 'reminder_1day', 'reminder_7day', 'reminder_overdue', 'receiver_reminder'
  subject TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_adoption_emails_request_id ON adoption_emails(adoption_request_id);
CREATE INDEX idx_adoption_emails_recipient ON adoption_emails(recipient_email);
CREATE INDEX idx_adoption_emails_type ON adoption_emails(email_type);
CREATE INDEX idx_adoption_emails_sent_at ON adoption_emails(sent_at DESC);

-- Add email_sent_count column to adoption_activities for tracking
ALTER TABLE adoption_activities ADD COLUMN IF NOT EXISTS email_log_id UUID REFERENCES adoption_emails(id) ON DELETE SET NULL;
