-- Migration: Add category column to pets table
-- This ensures all pets have a category field for proper filtering and display

-- Check if category column exists, if not add it
ALTER TABLE public.pets
ADD COLUMN category text DEFAULT 'adopt';

-- Create index for faster category queries
CREATE INDEX IF NOT EXISTS idx_pets_category ON public.pets(category);

-- Verify by listing all pets with their categories
SELECT id, name, category, status FROM public.pets LIMIT 10;
