-- ================================================================
-- SQL FUNCTIONS: Nạp tiền vào ví (Top-up) - UPDATED
-- Short order code + VietQR integration
-- ================================================================

-- ================================================================
-- FUNCTION: generate_topup_order_code
-- Generate short order code: 6 random digits (123456)
-- ================================================================

DROP FUNCTION IF EXISTS public.generate_topup_order_code CASCADE;

CREATE OR REPLACE FUNCTION public.generate_topup_order_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate: 6 random digits (ví dụ: 123456)
    v_order_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Check if exists
    SELECT EXISTS(
      SELECT 1 FROM public.topup_requests WHERE order_code = v_order_code
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_order_code;
END;
$$;

-- ================================================================
-- FUNCTION: create_topup_request
-- Tạo yêu cầu nạp tiền với QR code VietQR
-- ================================================================

DROP FUNCTION IF EXISTS public.create_topup_request(UUID, INTEGER, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_topup_request(UUID, INTEGER, TEXT, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.create_topup_request(
  p_user_id UUID,
  p_amount INTEGER,
  p_payment_method TEXT DEFAULT 'manual',
  p_notes TEXT DEFAULT NULL,
  p_qr_code_url TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_code TEXT;
  v_topup_id UUID;
BEGIN
  -- 1. Validate amount (min 10,000 VND)
  IF p_amount < 10000 THEN
    RAISE EXCEPTION 'Số tiền nạp tối thiểu là 10,000đ';
  END IF;

  -- 2. Validate user exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User không tồn tại';
  END IF;

  -- 3. Generate unique order code
  v_order_code := generate_topup_order_code();

  -- 4. Create topup request
  INSERT INTO public.topup_requests (
    user_id,
    amount,
    payment_method,
    order_code,
    status,
    notes,
    qr_code_url
  ) VALUES (
    p_user_id,
    p_amount,
    p_payment_method,
    v_order_code,
    'pending',
    p_notes,
    p_qr_code_url
  )
  RETURNING id INTO v_topup_id;

  -- 5. Return result
  RETURN jsonb_build_object(
    'success', true,
    'topup_id', v_topup_id,
    'order_code', v_order_code,
    'amount', p_amount
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
-- FUNCTION: confirm_topup_payment
-- Xác nhận thanh toán từ SMS (app Android)
-- Verify order code + user match
-- ================================================================

DROP FUNCTION IF EXISTS public.confirm_topup_payment(TEXT, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.confirm_topup_payment(TEXT, UUID, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.confirm_topup_payment(
  p_order_code TEXT,
  p_user_id UUID,
  p_transaction_id TEXT DEFAULT NULL,
  p_payment_description TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topup RECORD;
  v_new_balance_coc INTEGER;
BEGIN
  -- 1. Get topup request with user verification
  SELECT * INTO v_topup
  FROM public.topup_requests
  WHERE order_code = p_order_code
    AND user_id = p_user_id
  FOR UPDATE;

  IF v_topup IS NULL THEN
    RAISE EXCEPTION 'Topup request không tồn tại hoặc không thuộc về user này';
  END IF;

  -- 2. Check if already confirmed
  IF v_topup.status = 'success' THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Topup đã được xác nhận trước đó',
      'topup_id', v_topup.id,
      'alreadyConfirmed', true
    );
  END IF;

  -- 3. Update topup status to success
  UPDATE public.topup_requests
  SET 
    status = 'success',
    transaction_id = p_transaction_id || '_' || TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS'),
    payment_description = COALESCE(p_payment_description, 'Nạp tiền qua chuyển khoản - ' || p_order_code),
    paid_at = NOW(),
    confirmed_at = NOW()
  WHERE id = v_topup.id;

  -- 4. Increase balance_coc
  UPDATE public.profiles
  SET balance_coc = balance_coc + v_topup.amount
  WHERE id = v_topup.user_id
  RETURNING balance_coc INTO v_new_balance_coc;

  -- 5. Create transaction log
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    source_type,
    transaction_type,
    related_id,
    description,
    balance_after
  ) VALUES (
    v_topup.user_id,
    v_topup.amount,
    'coc',
    'topup',
    v_topup.id,
    'Nạp tiền vào ví (' || p_order_code || ')',
    v_new_balance_coc
  );

  -- 6. Return success
  RETURN jsonb_build_object(
    'success', true,
    'topup_id', v_topup.id,
    'order_code', v_topup.order_code,
    'amount', v_topup.amount,
    'new_balance_coc', v_new_balance_coc,
    'message', 'Nạp tiền thành công'
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
-- FUNCTION: cancel_topup_request
-- Hủy yêu cầu nạp tiền (nếu user không thanh toán)
-- ================================================================

DROP FUNCTION IF EXISTS public.cancel_topup_request CASCADE;

CREATE OR REPLACE FUNCTION public.cancel_topup_request(
  p_topup_id UUID,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topup RECORD;
BEGIN
  -- 1. Get topup request
  SELECT * INTO v_topup
  FROM public.topup_requests
  WHERE id = p_topup_id AND user_id = p_user_id
  FOR UPDATE;

  IF v_topup IS NULL THEN
    RAISE EXCEPTION 'Topup request không tồn tại hoặc không thuộc về user này';
  END IF;

  -- 2. Check if can be cancelled
  IF v_topup.status NOT IN ('pending', 'processing') THEN
    RAISE EXCEPTION 'Không thể hủy topup có status: %', v_topup.status;
  END IF;

  -- 3. Update status
  UPDATE public.topup_requests
  SET 
    status = 'cancelled',
    cancelled_at = NOW()
  WHERE id = p_topup_id;

  -- 4. Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Đã hủy yêu cầu nạp tiền'
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
-- FUNCTION: get_topup_requests
-- Lấy danh sách topup requests của user
-- ================================================================

DROP FUNCTION IF EXISTS public.get_topup_requests CASCADE;

CREATE OR REPLACE FUNCTION public.get_topup_requests(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  amount INTEGER,
  payment_method TEXT,
  order_code TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  transaction_id TEXT,
  qr_code_url TEXT,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id,
    tr.amount,
    tr.payment_method,
    tr.order_code,
    tr.status,
    tr.created_at,
    tr.paid_at,
    tr.confirmed_at,
    tr.transaction_id,
    tr.qr_code_url,
    tr.notes
  FROM public.topup_requests tr
  WHERE tr.user_id = p_user_id
  ORDER BY tr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ================================================================
-- FUNCTION: verify_topup_order
-- Verify topup order code exists and is pending
-- Called before SMS confirmation
-- ================================================================

DROP FUNCTION IF EXISTS public.verify_topup_order CASCADE;

CREATE OR REPLACE FUNCTION public.verify_topup_order(
  p_order_code TEXT
)
RETURNS TABLE (
  topup_id UUID,
  user_id UUID,
  amount INTEGER,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id,
    tr.user_id,
    tr.amount,
    tr.status,
    tr.created_at
  FROM public.topup_requests tr
  WHERE tr.order_code = p_order_code
    AND tr.status IN ('pending', 'processing')
  LIMIT 1;
END;
$$;
-- ================================================================
-- FUNCTION: update_topup_qr_code
-- Update QR code URL after VietQR generation
-- ================================================================

DROP FUNCTION IF EXISTS public.update_topup_qr_code(BIGINT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.update_topup_qr_code(
  p_topup_id BIGINT,
  p_qr_code_url TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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