-- ================================================================
-- SQL MIGRATION: TÁCH WALLET THÀNH 2 LOẠI SỐ DƯ
-- Balance_COC (Cọc - không rút) vs Balance_THUONG (Thưởng - được rút)
-- ================================================================
-- Chạy SQL này trong Supabase SQL Editor
-- ================================================================

-- ================================================================
-- BƯỚC 1: Thêm cột cho 2 loại số dư vào profiles
-- ================================================================

-- Cột balance_coc: Số dư cọc (từ nộp cọc + hoàn cọc)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS balance_coc INTEGER DEFAULT 0;

-- Cột balance_thuong: Số dư thưởng (từ Lost/Rescue)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS balance_thuong INTEGER DEFAULT 0;

-- Giữ lại cột cũ wallet_credit để migrate dữ liệu
-- ALTER TABLE public.profiles
-- ADD COLUMN IF NOT EXISTS wallet_credit INT DEFAULT 0;

-- ================================================================
-- BƯỚC 2: Tạo bảng withdrawal_requests cho rút tiền thủ công
-- ================================================================

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, completed, rejected
  bank_account TEXT NOT NULL, -- Số tài khoản/STK
  bank_name TEXT, -- Tên ngân hàng
  account_holder TEXT, -- Tên chủ tài khoản
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  transaction_ref TEXT, -- Reference từ ngân hàng
  notes TEXT, -- Ghi chú từ admin
  CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id),
  CONSTRAINT withdrawal_requests_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS withdrawal_requests_user_id_idx 
  ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS withdrawal_requests_status_idx 
  ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS withdrawal_requests_requested_at_idx 
  ON public.withdrawal_requests(requested_at DESC);

-- ================================================================
-- BƯỚC 3: Enable RLS cho withdrawal_requests
-- ================================================================

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Policy: User chỉ xem request của chính mình
CREATE POLICY withdrawal_requests_view_own ON public.withdrawal_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: User chỉ tạo request của chính mình
CREATE POLICY withdrawal_requests_insert_own ON public.withdrawal_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Không cho phép update/delete từ client
CREATE POLICY withdrawal_requests_no_modify ON public.withdrawal_requests
  FOR UPDATE
  USING (false);

-- ================================================================
-- BƯỚC 4: Thêm cột type vào wallet_transactions để track loại tiền
-- ================================================================

ALTER TABLE public.wallet_transactions
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'coc'; -- 'coc' hoặc 'thuong'

-- ================================================================
-- BƯỚC 5: MIGRATE DATA (nếu có wallet_credit cũ)
-- ================================================================

-- Nếu đã có wallet_credit, gán hết vào balance_thuong
-- (Giả định wallet_credit cũ là từ các giao dịch thưởng)
-- UPDATE public.profiles
-- SET balance_thuong = COALESCE(wallet_credit, 0)
-- WHERE balance_thuong = 0 AND wallet_credit > 0;

-- ================================================================
-- BƯỚC 6: Tạo RPC function để rút tiền (tạo withdrawal request)
-- ================================================================

CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
  p_user_id UUID,
  p_amount INTEGER,
  p_bank_account TEXT,
  p_bank_name TEXT DEFAULT NULL,
  p_account_holder TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance_thuong INTEGER;
  v_request_id UUID;
BEGIN
  -- 1. Kiểm tra balance_thuong
  SELECT balance_thuong FROM profiles
  WHERE id = p_user_id
  FOR UPDATE
  INTO v_balance_thuong;

  IF v_balance_thuong IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- 2. Kiểm tra đủ tiền thưởng
  IF v_balance_thuong < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance_thuong',
      'current_balance', v_balance_thuong,
      'requested', p_amount
    );
  END IF;

  -- 3. Tạo withdrawal request
  INSERT INTO public.withdrawal_requests (
    user_id,
    amount,
    bank_account,
    bank_name,
    account_holder,
    status
  ) VALUES (
    p_user_id,
    p_amount,
    p_bank_account,
    p_bank_name,
    p_account_holder,
    'pending'
  )
  RETURNING id INTO v_request_id;

  -- 4. PENDING: Chưa trừ balance (chỉ trừ khi admin approve)
  -- Trừ balance_thuong khi admin completed withdrawal

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'amount', p_amount,
    'status', 'pending',
    'message', 'Yêu cầu rút tiền đã gửi, vui lòng chờ admin duyệt'
  );
END $$;

-- ================================================================
-- BƯỚC 7: Tạo RPC function để tăng/giảm từng loại balance
-- ================================================================

-- Hàm tăng balance_coc (khi hoàn cọc)
CREATE OR REPLACE FUNCTION public.increase_balance_coc(
  p_user_id UUID,
  p_amount INTEGER,
  p_deposit_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Kiểm tra user tồn tại
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Tăng balance_coc
  UPDATE profiles
  SET balance_coc = balance_coc + p_amount
  WHERE id = p_user_id
  RETURNING balance_coc INTO v_new_balance;

  -- Log transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    source_type,
    deposit_id,
    note
  ) VALUES (
    p_user_id,
    'refund_deposit',
    p_amount,
    'coc',
    p_deposit_id,
    p_note
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance_coc', v_new_balance,
    'amount_added', p_amount
  );
END $$;

-- Hàm giảm balance_coc (khi nộp cọc)
CREATE OR REPLACE FUNCTION public.decrease_balance_coc(
  p_user_id UUID,
  p_amount INTEGER,
  p_deposit_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lấy balance_coc (với lock)
  SELECT balance_coc FROM profiles
  WHERE id = p_user_id
  FOR UPDATE
  INTO v_current_balance;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Kiểm tra đủ tiền
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance_coc',
      'current_balance', v_current_balance,
      'required', p_amount
    );
  END IF;

  -- Giảm balance_coc
  UPDATE profiles
  SET balance_coc = balance_coc - p_amount
  WHERE id = p_user_id
  RETURNING balance_coc INTO v_new_balance;

  -- Log transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    source_type,
    deposit_id,
    note
  ) VALUES (
    p_user_id,
    'use_for_deposit',
    p_amount,
    'coc',
    p_deposit_id,
    p_note
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance_coc', v_new_balance,
    'amount_deducted', p_amount
  );
END $$;

-- Hàm tăng balance_thuong (khi nhận thưởng Lost/Rescue)
CREATE OR REPLACE FUNCTION public.increase_balance_thuong(
  p_user_id UUID,
  p_amount INTEGER,
  p_source TEXT DEFAULT 'bounty', -- 'bounty', 'rescue', 'event'
  p_related_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Kiểm tra user tồn tại
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Tăng balance_thuong
  UPDATE profiles
  SET balance_thuong = balance_thuong + p_amount
  WHERE id = p_user_id
  RETURNING balance_thuong INTO v_new_balance;

  -- Log transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    source_type,
    note
  ) VALUES (
    p_user_id,
    p_source,
    p_amount,
    'thuong',
    p_note
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance_thuong', v_new_balance,
    'amount_added', p_amount
  );
END $$;

-- Hàm xử lý withdrawal approved (trừ balance_thuong khi admin duyệt)
CREATE OR REPLACE FUNCTION public.approve_withdrawal_request(
  p_request_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_amount INTEGER;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lấy thông tin withdrawal request
  SELECT user_id, amount FROM withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE
  INTO v_user_id, v_amount;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Withdrawal request not found'
    );
  END IF;

  -- Kiểm tra balance_thuong
  SELECT balance_thuong FROM profiles
  WHERE id = v_user_id
  FOR UPDATE
  INTO v_current_balance;

  IF v_current_balance < v_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance_thuong',
      'current_balance', v_current_balance
    );
  END IF;

  -- Trừ balance_thuong
  UPDATE profiles
  SET balance_thuong = balance_thuong - v_amount
  WHERE id = v_user_id
  RETURNING balance_thuong INTO v_new_balance;

  -- Cập nhật status withdrawal request
  UPDATE withdrawal_requests
  SET status = 'approved', approved_at = now()
  WHERE id = p_request_id;

  -- Log transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    source_type,
    note
  ) VALUES (
    v_user_id,
    'withdrawal_approved',
    v_amount,
    'thuong',
    'Admin duyệt yêu cầu rút tiền'
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance_thuong', v_new_balance,
    'amount_withdrawn', v_amount,
    'message', 'Yêu cầu rút tiền đã được duyệt'
  );
END $$;

-- ================================================================
-- BƯỚC 8: Cấp quyền
-- ================================================================

GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.increase_balance_coc TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrease_balance_coc TO authenticated;
GRANT EXECUTE ON FUNCTION public.increase_balance_thuong TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal_request TO service_role;

-- ================================================================
-- BƯỚC 9: Test queries
-- ================================================================

-- Check cột đã được thêm
/*
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('profiles', 'withdrawal_requests')
  AND column_name IN ('balance_coc', 'balance_thuong')
ORDER BY table_name, ordinal_position;

-- Check RPC functions
SELECT proname FROM pg_proc
WHERE proname IN (
  'create_withdrawal_request',
  'increase_balance_coc',
  'decrease_balance_coc',
  'increase_balance_thuong',
  'approve_withdrawal_request'
);

-- Test: Tạo withdrawal request
SELECT public.create_withdrawal_request(
  'USER_UUID',
  50000,
  'ACCOUNT_NUMBER',
  'Vietcombank',
  'Nguyen Van A'
);

-- Test: Check user balance
SELECT id, balance_coc, balance_thuong FROM profiles
WHERE id = 'USER_UUID';
*/

-- ================================================================
-- END OF MIGRATION
-- ================================================================
