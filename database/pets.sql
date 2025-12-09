-- Bảng thông tin thú cưng
-- Lưu trữ thông tin thú cưng được đăng tải (lost/adopt)

-- CREATE TABLE IF NOT EXISTS public.pets (
--   name text NULL,
--   status text NOT NULL,
--   district text NULL,
--   lat double precision NULL,
--   lng double precision NULL,
--   description text NULL,
--   image_url text NULL,
--   created_at timestamp with time zone NULL,
--   id uuid NOT NULL DEFAULT gen_random_uuid(),
--   owner_id uuid NULL,
--   category text NULL DEFAULT 'lost'::text,
--   max_deposit integer NULL,
--   updated_at timestamp with time zone NULL DEFAULT now(),
--   CONSTRAINT pets_pkey PRIMARY KEY (id),
--   CONSTRAINT pets_status_check CHECK (
--     (
--       status = ANY (
--         ARRAY[
--           'available'::text,
--           'in_contact'::text,
--           'delivered'::text,
--           'cancelled'::text,
--           'pending'::text,
--           'confirmed'::text
--         ]
--       )
--     )
--   )
-- ) TABLESPACE pg_default;

-- CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON pets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- ENABLE RLS AND CREATE POLICIES
-- ================================================================

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view all pets
CREATE POLICY "Anyone can view pets"
  ON public.pets FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert pets
CREATE POLICY "Authenticated users can insert pets"
  ON public.pets FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can only update their own pets
CREATE POLICY "Users can update own pets"
  ON public.pets FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can only delete their own pets
CREATE POLICY "Users can delete own pets"
  ON public.pets FOR DELETE
  USING (auth.uid() = owner_id);
