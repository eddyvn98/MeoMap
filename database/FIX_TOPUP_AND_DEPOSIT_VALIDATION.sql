-- ================================================================
-- FIX: Topup Table + Deposit Balance Validation
-- ================================================================
-- Issues Fixed:
-- 1. Missing topup_requests table (error: relation "public.topups" does not exist)
-- 2. Deposit creation without balance validation
-- 3. Ensure all wallet spending operations check balance
-- ================================================================

-- ================================================================
-- 1. CREATE TOPUP_REQUESTS TABLE (if not exists)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.topup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Payment info
  amount INTEGER NOT NULL, -- Số tiền nạp (VND)
  payment_method TEXT DEFAULT 'payos', -- 'payos', 'vnpay', 'manual'
  
  -- PayOS transaction info
  order_code TEXT UNIQUE, -- Mã đơn hàng ngắn: TU123456
  payment_link_id TEXT, -- ID payment link từ PayOS (nếu có)
  checkout_url TEXT, -- URL thanh toán (nếu có)
  qr_code TEXT, -- Base64 QR code từ PayOS (nếu có)
  qr_code_url TEXT, -- URL QR code VietQR (chứa STK + amount + order_code)
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'success', 'cancelled', 'failed'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE, -- Khi user thanh toán xong
  confirmed_at TIMESTAMP WITH TIME ZONE, -- Khi webhook xác nhận
  cancelled_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Transaction tracking
  transaction_id TEXT, -- ID giao dịch từ PayOS webhook
  payment_description TEXT, -- Mô tả từ PayOS
  
  -- Metadata
  notes TEXT,
  metadata JSONB, -- Lưu thêm thông tin (IP, device, etc)
  
  CONSTRAINT topup_requests_pkey PRIMARY KEY (id),
  CONSTRAINT topup_requests_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ADD MISSING COLUMNS if they don't exist
ALTER TABLE public.topup_requests ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE public.topup_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

CREATE INDEX IF NOT EXISTS topup_requests_user_id_idx ON public.topup_requests(user_id);
CREATE INDEX IF NOT EXISTS topup_requests_status_idx ON public.topup_requests(status);
CREATE INDEX IF NOT EXISTS topup_requests_order_code_idx ON public.topup_requests(order_code);
CREATE INDEX IF NOT EXISTS topup_requests_created_at_idx ON public.topup_requests(created_at DESC);

-- ================================================================
-- RLS POLICIES for topup_requests
-- ================================================================

ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

-- Xóa policies cũ nếu đã tồn tại
DROP POLICY IF EXISTS "Topup: Users See Own" ON public.topup_requests;
DROP POLICY IF EXISTS "Topup: Users Can Insert" ON public.topup_requests;
DROP POLICY IF EXISTS "Topup: Users Can Update Own" ON public.topup_requests;

-- Users can see their own topup requests
CREATE POLICY "Topup: Users See Own"
  ON public.topup_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create topup requests
CREATE POLICY "Topup: Users Can Insert"
  ON public.topup_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own topup requests (for cancellation)
CREATE POLICY "Topup: Users Can Update Own"
  ON public.topup_requests
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- 2. VERIFY BALANCE CHECK IN decrease_balance_coc
-- ================================================================
-- This function is called when creating deposits
-- It MUST check if balance_main >= amount before deducting

CREATE OR REPLACE FUNCTION public.decrease_balance_coc(
  p_user_id UUID,
  p_amount INTEGER,
  p_note TEXT DEFAULT NULL,
  p_deposit_id UUID DEFAULT NULL,
  p_source TEXT DEFAULT 'deposit'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance_main INTEGER;
  v_old_balance_main INTEGER;
BEGIN
  -- 1. Get current balance_main with lock
  SELECT balance_main INTO v_old_balance_main
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_old_balance_main IS NULL THEN
    RAISE EXCEPTION 'User không tồn tại';
  END IF;

  -- 2. CRITICAL: Check if enough balance in main wallet
  IF v_old_balance_main < p_amount THEN
    RAISE EXCEPTION 'Số dư ví chính không đủ. Hiện có: %, cần: %', v_old_balance_main, p_amount;
  END IF;

  -- 3. Decrease balance_main (deposits deduct from main wallet)
  UPDATE public.profiles
  SET balance_main = balance_main - p_amount,
      updated_at = now()
  WHERE id = p_user_id
  RETURNING balance_main INTO v_new_balance_main;

  -- 4. Log transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    source_type,
    transaction_type,
    description,
    balance_after,
    related_id
  ) VALUES (
    p_user_id,
    p_amount,
    'main',
    'deposit_lock',
    COALESCE(p_note, 'Khóa tiền cọc từ ví chính'),
    v_new_balance_main,
    p_deposit_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_balance_main', v_old_balance_main,
    'new_balance_main', v_new_balance_main,
    'balance_after', v_new_balance_main,
    'amount_locked', p_amount
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- ================================================================
-- 3. SUMMARY OF BALANCE VALIDATIONS
-- ================================================================

-- All wallet spending operations now have proper validation:
-- 
-- ✅ decrease_balance_coc (deposits):
--    - Checks balance_main >= amount
--    - Called from PetDetailPage with frontend validation
--
-- ✅ convert_balance_coc_to_voucher:
--    - Checks balance_coc >= amount (in voucher_functions.sql)
--
-- ✅ convert_balance_thuong_to_voucher:
--    - Checks balance_thuong >= amount (in voucher_functions.sql)
--
-- ✅ purchase_product:
--    - Checks (balance_coc + balance_thuong) >= wallet_used
--    - Uses balance_coc first, then balance_thuong (in store_functions.sql)
--
-- ✅ create_withdrawal_request_p2p:
--    - Checks (balance_main + balance_thuong) >= amount
--    - Does NOT allow withdrawal from balance_coc (coc is for voucher conversion only)

-- ================================================================
-- 4. FIX: update_topup_qr_code function parameter type
-- ================================================================
-- Issue: Function used BIGINT but table uses UUID for id column

DROP FUNCTION IF EXISTS public.update_topup_qr_code(BIGINT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_topup_qr_code(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.update_topup_qr_code(
  p_topup_id UUID,
  p_qr_code_url TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE public.topup_requests
  SET qr_code_url = p_qr_code_url,
      updated_at = NOW()
  WHERE id = p_topup_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  IF v_updated_count = 0 THEN
    RAISE EXCEPTION 'Topup request not found';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'QR code updated successfully'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- ================================================================
-- 5. VERIFICATION QUERIES
-- ================================================================

-- Check if topup_requests table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'topup_requests'
) AS topup_table_exists;

-- Check if decrease_balance_coc function has proper validation
SELECT prosrc 
FROM pg_proc 
WHERE proname = 'decrease_balance_coc'
AND prosrc LIKE '%balance_main < p_amount%';

-- Count active deposits
SELECT 
  COUNT(*) as total_deposits,
  SUM(amount) as total_amount,
  COUNT(*) FILTER (WHERE payment_status = 'success') as paid_deposits,
  COUNT(*) FILTER (WHERE payment_status = 'pending') as pending_deposits
FROM deposits;

-- Check user balances
SELECT 
  COUNT(*) as total_users,
  SUM(balance_main) as total_balance_main,
  SUM(balance_coc) as total_balance_coc,
  SUM(balance_thuong) as total_balance_thuong,
  COUNT(*) FILTER (WHERE balance_main > 0) as users_with_main_balance,
  COUNT(*) FILTER (WHERE balance_coc > 0) as users_with_coc_balance,
  COUNT(*) FILTER (WHERE balance_thuong > 0) as users_with_thuong_balance
FROM profiles;

-- ================================================================
-- END OF FIX
-- ================================================================
