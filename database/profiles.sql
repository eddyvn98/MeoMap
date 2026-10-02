-- Core user profile table for simplified MeoMap.
-- No wallet or platform-managed balance fields.

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  display_name text NULL,
  avatar_url text NULL,
  phone text NULL,
  zalo text NULL,
  role text NULL DEFAULT 'user'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  email text NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;
