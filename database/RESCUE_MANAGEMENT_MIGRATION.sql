-- Rescue management schema for simplified MeoMap
-- MeoMap does not hold or settle money. Rescue support is direct between users.

CREATE TABLE IF NOT EXISTS public.rescue_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  rescuer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rescue_appeals_case_id ON public.rescue_appeals(case_id);
CREATE INDEX IF NOT EXISTS idx_rescue_appeals_rescuer_id ON public.rescue_appeals(rescuer_id);

CREATE TABLE IF NOT EXISTS public.rescue_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  rescuer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  video_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rescue_updates_case_id ON public.rescue_updates(case_id);
CREATE INDEX IF NOT EXISTS idx_rescue_updates_rescuer_id ON public.rescue_updates(rescuer_id);

ALTER TABLE public.pets
  ADD COLUMN IF NOT EXISTS rescuer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT,
  ADD COLUMN IF NOT EXISTS completion_images TEXT[],
  ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS bank_name VARCHAR(200),
  ADD COLUMN IF NOT EXISTS bank_qr_code_url TEXT;

CREATE INDEX IF NOT EXISTS idx_pets_rescuer_id ON public.pets(rescuer_id);

-- Safely claim a rescue case without giving arbitrary UPDATE permission on pets.
CREATE OR REPLACE FUNCTION public.claim_rescue_case(p_case_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.pets
  SET rescuer_id = auth.uid(), updated_at = NOW()
  WHERE id = p_case_id
    AND category = 'rescue'
    AND rescuer_id IS NULL
    AND COALESCE(status, '') NOT IN ('closed', 'delivered', 'completed');

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;

-- Rescuer can only change their own direct-support contact details.
CREATE OR REPLACE FUNCTION public.update_rescue_support_info(
  p_case_id UUID,
  p_bank_account_number TEXT,
  p_bank_account_name TEXT,
  p_bank_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.pets
  SET
    bank_account_number = NULLIF(TRIM(p_bank_account_number), ''),
    bank_account_name = NULLIF(TRIM(p_bank_account_name), ''),
    bank_name = NULLIF(TRIM(p_bank_name), ''),
    updated_at = NOW()
  WHERE id = p_case_id
    AND category = 'rescue'
    AND rescuer_id = auth.uid();

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;

-- Either the original poster or assigned rescuer may close a rescue case.
CREATE OR REPLACE FUNCTION public.close_rescue_case_simple(p_case_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.pets
  SET status = 'delivered', completed_at = NOW(), updated_at = NOW()
  WHERE id = p_case_id
    AND category = 'rescue'
    AND (owner_id = auth.uid() OR rescuer_id = auth.uid())
    AND COALESCE(status, '') NOT IN ('closed', 'delivered', 'completed');

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected = 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_rescue_case(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_rescue_support_info(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_rescue_case_simple(UUID) TO authenticated;

GRANT SELECT ON public.rescue_appeals TO anon, authenticated;
GRANT INSERT, UPDATE ON public.rescue_appeals TO authenticated;
GRANT SELECT ON public.rescue_updates TO anon, authenticated;
GRANT INSERT, UPDATE ON public.rescue_updates TO authenticated;

ALTER TABLE public.rescue_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rescue_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view rescue appeals" ON public.rescue_appeals;
CREATE POLICY "Anyone can view rescue appeals"
ON public.rescue_appeals FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Assigned rescuer can create appeal" ON public.rescue_appeals;
CREATE POLICY "Assigned rescuer can create appeal"
ON public.rescue_appeals FOR INSERT
TO authenticated
WITH CHECK (
  rescuer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.pets
    WHERE pets.id = case_id
      AND pets.rescuer_id = auth.uid()
      AND pets.category = 'rescue'
  )
);

DROP POLICY IF EXISTS "Assigned rescuer can update appeal" ON public.rescue_appeals;
CREATE POLICY "Assigned rescuer can update appeal"
ON public.rescue_appeals FOR UPDATE
TO authenticated
USING (rescuer_id = auth.uid())
WITH CHECK (rescuer_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view rescue updates" ON public.rescue_updates;
CREATE POLICY "Anyone can view rescue updates"
ON public.rescue_updates FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Assigned rescuer can create update" ON public.rescue_updates;
CREATE POLICY "Assigned rescuer can create update"
ON public.rescue_updates FOR INSERT
TO authenticated
WITH CHECK (
  rescuer_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.pets
    WHERE pets.id = case_id
      AND pets.rescuer_id = auth.uid()
      AND pets.category = 'rescue'
  )
);
