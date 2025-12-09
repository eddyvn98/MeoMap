-- Migration: Add max_deposit and updated_at columns to pets table
-- This allows pet owners to optionally set a suggested deposit amount
-- and track when pets are updated

-- Add max_deposit column
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS max_deposit INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.pets.max_deposit IS 'Optional suggested deposit amount set by owner. NULL or 0 means no deposit required.';

-- Add updated_at column
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.pets.updated_at IS 'Timestamp when the pet record was last updated.';

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pets_updated_at ON public.pets;
CREATE TRIGGER update_pets_updated_at
    BEFORE UPDATE ON public.pets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Example update: Set max_deposit for existing pets if needed
-- UPDATE public.pets SET max_deposit = 50000 WHERE category = 'adopt' AND max_deposit IS NULL;
