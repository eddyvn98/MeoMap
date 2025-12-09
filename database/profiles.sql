-- Bảng thông tin người dùng
-- Lưu trữ profile, ví tiền, và thông tin liên hệ

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  display_name text NULL,
  avatar_url text NULL,
  phone text NULL,
  zalo text NULL,
  role text NULL DEFAULT 'user'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  wallet_credit integer NOT NULL DEFAULT 0,
  email text NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE
) TABLESPACE pg_default;
