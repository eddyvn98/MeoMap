-- Migration: Add check-in confirmation columns for adoption post-delivery workflow
-- This adds support for tracking 1-day, 7-day, and 30-day check-ins after delivery

ALTER TABLE adoption_requests
ADD COLUMN IF NOT EXISTS receiver_confirmed_checkin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS receiver_confirmed_checkin_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS owner_confirmed_checkin boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS owner_confirmed_checkin_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS checkin_required_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS checkin_days integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS status_updated_at timestamp with time zone DEFAULT now();

-- Update adoption_requests_status_check constraint to include 'completed' status
ALTER TABLE adoption_requests
DROP CONSTRAINT IF EXISTS adoption_requests_status_check;

ALTER TABLE adoption_requests
ADD CONSTRAINT adoption_requests_status_check CHECK (
  status = ANY (
    ARRAY[
      'pending'::text,
      'accepted'::text,
      'rejected'::text,
      'ready_to_deliver'::text,
      'delivered'::text,
      'completed'::text,
      'cancelled'::text
    ]
  )
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_adoption_requests_status_delivered 
ON adoption_requests(status) WHERE status = 'delivered';

CREATE INDEX IF NOT EXISTS idx_adoption_requests_requester_status 
ON adoption_requests(requester_id, status);

CREATE INDEX IF NOT EXISTS idx_adoption_requests_owner_status 
ON adoption_requests(owner_id, status);

CREATE INDEX IF NOT EXISTS idx_adoption_requests_checkin_required 
ON adoption_requests(checkin_required_at) WHERE checkin_required_at IS NOT NULL;
