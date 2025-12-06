-- Migration: Add cancel delivery support
-- Run this in Supabase SQL Editor

-- 1. Add new columns to deposits table
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS delivery_status TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS delivery_cancel_reason TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS delivery_cancelled_by UUID;

-- 2. Create wallet table if not exists
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit BIGINT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Create function to increase wallet credit
CREATE OR REPLACE FUNCTION increase_wallet_credit(
  p_user_id UUID,
  p_amount BIGINT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update wallet
  INSERT INTO wallets (user_id, credit, updated_at)
  VALUES (p_user_id, p_amount, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    credit = wallets.credit + p_amount,
    updated_at = NOW();
END;
$$;

-- 4. Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'deposits' 
  AND column_name IN ('delivery_status', 'delivery_cancel_reason', 'delivery_cancelled_by');

-- 5. Verify function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'increase_wallet_credit';
