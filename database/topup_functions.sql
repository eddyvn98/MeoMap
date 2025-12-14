-- ================================================================
-- SQL FUNCTIONS: Nạp tiền vào ví (Top-up)
-- ================================================================

-- ================================================================
-- FUNCTION: create_topup_request
-- Tạo yêu cầu nạp tiền (trả về order_code để gọi PayOS)
-- ================================================================

CREATE OR REPLACE FUNCTION public.create_topup_request(
  p_user_id UUID,
  p_amount INTEGER,
  p_payment_method TEXT DEFAULT 'payos',
  p_notes TEXT DEFAULT NULL
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
    notes
  ) VALUES (
    p_user_id,
    p_amount,
    p_payment_method,
    v_order_code,
    'pending',
    p_notes
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
-- Xác nhận thanh toán thành công (gọi từ webhook PayOS)
-- Cộng tiền vào balance_coc
-- ================================================================

CREATE OR REPLACE FUNCTION public.confirm_topup_payment(
  p_order_code TEXT,
  p_transaction_id TEXT,
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
  -- 1. Get topup request
  SELECT * INTO v_topup
  FROM public.topup_requests
  WHERE order_code = p_order_code
  FOR UPDATE;

  IF v_topup IS NULL THEN
    RAISE EXCEPTION 'Topup request không tồn tại: %', p_order_code;
  END IF;

  -- 2. Check if already confirmed
  IF v_topup.status = 'success' THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Topup đã được xác nhận trước đó',
      'topup_id', v_topup.id
    );
  END IF;

  -- 3. Update topup status
  UPDATE public.topup_requests
  SET 
    status = 'success',
    transaction_id = p_transaction_id,
    payment_description = p_payment_description,
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
    COALESCE(p_payment_description, 'Nạp tiền vào ví qua ' || v_topup.payment_method),
    v_new_balance_coc
  );

  -- 6. Return success
  RETURN jsonb_build_object(
    'success', true,
    'topup_id', v_topup.id,
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
    tr.notes
  FROM public.topup_requests tr
  WHERE tr.user_id = p_user_id
  ORDER BY tr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ================================================================
-- FUNCTION: update_topup_payment_info
-- Cập nhật thông tin PayOS (payment_link_id, checkout_url, qr_code)
-- Gọi sau khi tạo payment link từ PayOS
-- ================================================================

CREATE OR REPLACE FUNCTION public.update_topup_payment_info(
  p_topup_id UUID,
  p_payment_link_id TEXT,
  p_checkout_url TEXT,
  p_qr_code TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.topup_requests
  SET 
    payment_link_id = p_payment_link_id,
    checkout_url = p_checkout_url,
    qr_code = p_qr_code,
    status = 'processing'
  WHERE id = p_topup_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Topup request không tồn tại';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Đã cập nhật thông tin thanh toán'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
