-- ================================================================
-- SQL MIGRATION: TẠO BẢNG WALLET_TRANSACTIONS (LỊCH SỬ GIA DỊCH VÍ)
-- ================================================================
-- Bạn cần chạy SQL này trong Supabase SQL Editor
-- ================================================================

-- Bước 1: Tạo bảng wallet_transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Type of transaction
  type TEXT NOT NULL, -- 'refund_deposit', 'withdrawal', 'top_up', etc.
  
  -- Amount
  amount INT4 NOT NULL, -- Số tiền (đơn vị: VND)
  
  -- Reference
  deposit_id UUID REFERENCES public.deposits(id) ON DELETE SET NULL,
  
  -- Note
  note TEXT, -- Ghi chú chi tiết
  
  -- Thời gian
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT type_check CHECK (type IN ('refund_deposit', 'withdrawal', 'top_up', 'use_for_deposit'))
);

-- Bước 2: Tạo indexes
CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX idx_wallet_transactions_deposit_id ON public.wallet_transactions(deposit_id);
CREATE INDEX idx_wallet_transactions_created_at ON public.wallet_transactions(created_at DESC);

-- Bước 3: Cấp quyền RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: User chỉ xem transaction của chính mình
CREATE POLICY wallet_transactions_view_own ON public.wallet_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Chỉ backend/trigger mới có thể insert
CREATE POLICY wallet_transactions_insert_system ON public.wallet_transactions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Không update/delete
CREATE POLICY wallet_transactions_no_modify ON public.wallet_transactions
  FOR UPDATE
  USING (false);

-- Bước 4: Cấp quyền
GRANT SELECT ON public.wallet_transactions TO authenticated;

-- ================================================================
-- TRIGGER: Tự động tạo wallet_transactions khi increase_wallet_credit
-- ================================================================

-- Create or replace the function with transaction logging
CREATE OR REPLACE FUNCTION public.increase_wallet_credit(
  p_user_id UUID,
  p_amount INT4,
  p_type TEXT DEFAULT 'refund_deposit',
  p_deposit_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update wallet credit
  UPDATE public.profiles
  SET wallet_credit = wallet_credit + p_amount
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO public.wallet_transactions (user_id, type, amount, deposit_id, note)
  VALUES (p_user_id, p_type, p_amount, p_deposit_id, p_note);
END;
$$;

-- ================================================================
-- FUNCTION: TRỪ TIỀN VÍ (decrease_wallet_credit)
-- ================================================================

-- Create function to decrease wallet credit (for using wallet to pay deposit)
CREATE OR REPLACE FUNCTION public.decrease_wallet_credit(
  p_user_id UUID,
  p_amount INT4,
  p_type TEXT DEFAULT 'use_for_deposit',
  p_deposit_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has enough credit
  DECLARE
    current_credit INT4;
  BEGIN
    SELECT wallet_credit INTO current_credit
    FROM public.profiles
    WHERE id = p_user_id;
    
    IF current_credit < p_amount THEN
      RAISE EXCEPTION 'Không đủ tiền trong ví. Số dư hiện tại: %, cần: %', current_credit, p_amount;
    END IF;
  END;

  -- Decrease wallet credit
  UPDATE public.profiles
  SET wallet_credit = wallet_credit - p_amount
  WHERE id = p_user_id;

  -- Log transaction (negative amount to show it's a deduction)
  INSERT INTO public.wallet_transactions (user_id, type, amount, deposit_id, note)
  VALUES (p_user_id, p_type, -p_amount, p_deposit_id, p_note);
END;
$$;

-- ================================================================
-- TEST QUERY
-- ================================================================
-- Kiểm tra xem bảng đã được tạo:
SELECT * FROM public.wallet_transactions LIMIT 1;

-- ================================================================
-- ROLLBACK (nếu cần xoá)
-- ================================================================
-- DROP TABLE IF EXISTS public.wallet_transactions;
-- DROP FUNCTION IF EXISTS public.increase_wallet_credit(UUID, INT4, TEXT, UUID, TEXT);
-- DROP FUNCTION IF EXISTS public.decrease_wallet_credit(UUID, INT4, TEXT, UUID, TEXT);
-- ================================================================
