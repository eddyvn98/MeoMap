-- Add checkin_metadata column to adoption_requests
ALTER TABLE adoption_requests ADD COLUMN IF NOT EXISTS checkin_metadata JSONB;
