-- Migration: Remove foreign key constraint from adoption_activities
-- This allows adoption_activities to be used for lost pets (sightings) without adoption_request

-- Step 1: Drop the foreign key constraint
ALTER TABLE adoption_activities 
DROP CONSTRAINT IF EXISTS adoption_activities_adoption_request_fkey;

-- Step 2: Make adoption_request_id nullable (for lost pet sightings that don't have adoption requests)
ALTER TABLE adoption_activities 
ALTER COLUMN adoption_request_id DROP NOT NULL;

-- Step 3: Add a new activity type for sightings
ALTER TABLE adoption_activities 
DROP CONSTRAINT IF EXISTS valid_activity_type;

ALTER TABLE adoption_activities 
ADD CONSTRAINT valid_activity_type CHECK (
  activity_type = ANY (
    ARRAY[
      'request_sent'::text,
      'request_accepted'::text,
      'request_rejected'::text,
      'meeting_confirmed'::text,
      'delivery_prepared'::text,
      'delivery_scanned'::text,
      'receiver_checkin_confirmed'::text,
      'owner_checkin_confirmed'::text,
      'reminder_sent'::text,
      'rating_submitted'::text,
      'request_completed'::text,
      'meeting_confirmation_reminder'::text,
      'meeting_confirmation_timeout'::text,
      'no_show_recorded'::text,
      'notification_sent'::text,
      'sighting'::text  -- NEW: for lost pet sightings
    ]
  )
);

-- Step 4: Add pet_id column as alternative reference (for lost pets)
ALTER TABLE adoption_activities 
ADD COLUMN IF NOT EXISTS pet_id uuid REFERENCES pets(id) ON DELETE CASCADE;

-- Step 5: Add index for pet_id
CREATE INDEX IF NOT EXISTS idx_adoption_activities_pet_id 
ON adoption_activities(pet_id);

-- Step 6: Add check constraint to ensure either adoption_request_id or pet_id is provided
ALTER TABLE adoption_activities 
ADD CONSTRAINT adoption_activities_reference_check 
CHECK (
  (adoption_request_id IS NOT NULL AND pet_id IS NULL) OR 
  (adoption_request_id IS NULL AND pet_id IS NOT NULL)
);

COMMENT ON COLUMN adoption_activities.adoption_request_id IS 'Reference to adoption request (nullable for lost pet sightings)';
COMMENT ON COLUMN adoption_activities.pet_id IS 'Direct reference to pet (for lost pet sightings without adoption request)';
COMMENT ON CONSTRAINT adoption_activities_reference_check ON adoption_activities IS 'Ensure either adoption_request_id or pet_id is provided, but not both';
