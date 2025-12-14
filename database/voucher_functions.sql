-- ================================================================
-- SQL FUNCTIONS: Quy đổi tiền cọc/thưởng thành voucher
-- ================================================================

-- ================================================================
-- FUNCTION: convert_balance_coc_to_voucher
-- Quy đổi tiền cọc thành voucher (1:1 - số tiền cọc = giá voucher)
-- ================================================================

CREATE OR REPLACE FUNCTION public.convert_balance_coc_to_voucher(
  p_user_id UUID,
  p_amount INTEGER,
  p_voucher_code TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance_coc INTEGER;
  v_new_balance_coc INTEGER;
  v_voucher_id UUID;
  v_user_voucher_id UUID;
  v_conversion_id UUID;
BEGIN
  -- Lấy balance_coc với lock
  SELECT balance_coc INTO v_current_balance_coc
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_balance_coc IS NULL THEN
    RAISE EXCEPTION 'User không tồn tại';
  END IF;

  -- Kiểm tra đủ balance_coc
  IF v_current_balance_coc < p_amount THEN
    RAISE EXCEPTION 'Không đủ tiền cọc. Số dư hiện tại: %, cần: %', v_current_balance_coc, p_amount;
  END IF;

  -- Lấy voucher từ code
  SELECT id INTO v_voucher_id
  FROM public.vouchers
  WHERE code = p_voucher_code
  LIMIT 1;

  IF v_voucher_id IS NULL THEN
    RAISE EXCEPTION 'Mã voucher không hợp lệ: %', p_voucher_code;
  END IF;

  -- Trừ balance_coc
  v_new_balance_coc := v_current_balance_coc - p_amount;
  UPDATE public.profiles
  SET balance_coc = v_new_balance_coc,
      updated_at = now()
  WHERE id = p_user_id;

  -- Tạo user_voucher (ghi nhận quyền sở hữu voucher)
  INSERT INTO public.user_vouchers (
    user_id,
    voucher_id,
    status,
    source_type,
    notes
  ) VALUES (
    p_user_id,
    v_voucher_id,
    'active',
    'conversion_deposit',
    p_note || ' (balance_coc conversion)'
  ) RETURNING id INTO v_user_voucher_id;

  -- Ghi lại quá trình quy đổi
  INSERT INTO public.voucher_conversions (
    user_id,
    amount,
    source_type,
    user_voucher_id,
    notes
  ) VALUES (
    p_user_id,
    p_amount,
    'balance_coc',
    v_user_voucher_id,
    p_note
  ) RETURNING id INTO v_conversion_id;

  -- Log transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    source_type,
    note
  ) VALUES (
    p_user_id,
    'convert_to_voucher',
    p_amount,
    'coc',
    'Quy đổi tiền cọc thành voucher: ' || p_voucher_code
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance_coc', v_new_balance_coc,
    'amount_converted', p_amount,
    'voucher_code', p_voucher_code,
    'user_voucher_id', v_user_voucher_id,
    'conversion_id', v_conversion_id,
    'message', 'Quy đổi thành voucher thành công'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END $$;

-- ================================================================
-- FUNCTION: convert_balance_thuong_to_voucher
-- Quy đổi tiền thưởng thành voucher (1:1)
-- ================================================================

CREATE OR REPLACE FUNCTION public.convert_balance_thuong_to_voucher(
  p_user_id UUID,
  p_amount INTEGER,
  p_voucher_code TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance_thuong INTEGER;
  v_new_balance_thuong INTEGER;
  v_voucher_id UUID;
  v_user_voucher_id UUID;
  v_conversion_id UUID;
BEGIN
  -- Lấy balance_thuong với lock
  SELECT balance_thuong INTO v_current_balance_thuong
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_current_balance_thuong IS NULL THEN
    RAISE EXCEPTION 'User không tồn tại';
  END IF;

  -- Kiểm tra đủ balance_thuong
  IF v_current_balance_thuong < p_amount THEN
    RAISE EXCEPTION 'Không đủ tiền thưởng. Số dư hiện tại: %, cần: %', v_current_balance_thuong, p_amount;
  END IF;

  -- Lấy voucher từ code
  SELECT id INTO v_voucher_id
  FROM public.vouchers
  WHERE code = p_voucher_code
  LIMIT 1;

  IF v_voucher_id IS NULL THEN
    RAISE EXCEPTION 'Mã voucher không hợp lệ: %', p_voucher_code;
  END IF;

  -- Trừ balance_thuong
  v_new_balance_thuong := v_current_balance_thuong - p_amount;
  UPDATE public.profiles
  SET balance_thuong = v_new_balance_thuong,
      updated_at = now()
  WHERE id = p_user_id;

  -- Tạo user_voucher
  INSERT INTO public.user_vouchers (
    user_id,
    voucher_id,
    status,
    source_type,
    notes
  ) VALUES (
    p_user_id,
    v_voucher_id,
    'active',
    'conversion_bounty',
    p_note || ' (balance_thuong conversion)'
  ) RETURNING id INTO v_user_voucher_id;

  -- Ghi lại quá trình quy đổi
  INSERT INTO public.voucher_conversions (
    user_id,
    amount,
    source_type,
    user_voucher_id,
    notes
  ) VALUES (
    p_user_id,
    p_amount,
    'balance_thuong',
    v_user_voucher_id,
    p_note
  ) RETURNING id INTO v_conversion_id;

  -- Log transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    source_type,
    note
  ) VALUES (
    p_user_id,
    'convert_to_voucher',
    p_amount,
    'thuong',
    'Quy đổi tiền thưởng thành voucher: ' || p_voucher_code
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance_thuong', v_new_balance_thuong,
    'amount_converted', p_amount,
    'voucher_code', p_voucher_code,
    'user_voucher_id', v_user_voucher_id,
    'conversion_id', v_conversion_id,
    'message', 'Quy đổi thành voucher thành công'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END $$;

-- ================================================================
-- FUNCTION: get_user_vouchers
-- Lấy danh sách voucher của user
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_user_vouchers(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  code TEXT,
  amount INTEGER,
  description TEXT,
  status TEXT,
  acquired_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  source_type TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uv.id,
    v.code,
    v.amount,
    v.description,
    uv.status,
    uv.acquired_at,
    uv.expires_at,
    uv.source_type
  FROM public.user_vouchers uv
  JOIN public.vouchers v ON uv.voucher_id = v.id
  WHERE uv.user_id = p_user_id AND uv.status = 'active'
  ORDER BY uv.acquired_at DESC;
END $$;
