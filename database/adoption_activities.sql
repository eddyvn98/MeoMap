-- Table to track all adoption workflow activities and history
CREATE TABLE public.adoption_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  adoption_request_id uuid NOT NULL,
  activity_type text NOT NULL,
  actor_id uuid NOT NULL,
  actor_type text DEFAULT 'requester',
  description text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT adoption_activities_pkey PRIMARY KEY (id),
  CONSTRAINT adoption_activities_adoption_request_fkey 
    FOREIGN KEY (adoption_request_id) REFERENCES adoption_requests (id) ON DELETE CASCADE,
  CONSTRAINT adoption_activities_actor_fkey 
    FOREIGN KEY (actor_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT valid_activity_type CHECK (
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
        'notification_sent'::text
      ]
    )
  ),
  CONSTRAINT valid_actor_type CHECK (
    actor_type = ANY (
      ARRAY[
        'requester'::text,
        'owner'::text,
        'admin'::text
      ]
    )
  )
) TABLESPACE pg_default;

-- Indexes for querying activities
CREATE INDEX IF NOT EXISTS idx_adoption_activities_request_id 
ON adoption_activities(adoption_request_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_adoption_activities_created_at 
ON adoption_activities(created_at DESC) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_adoption_activities_actor_id 
ON adoption_activities(actor_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_adoption_activities_type 
ON adoption_activities(activity_type) TABLESPACE pg_default;
