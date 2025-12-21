-- ============================================================
-- FIX: Wallet Functions - Sửa logic 3 ví riêng biệt
-- ============================================================

-- ================================================================
-- 1. FIX: confirm_topup_payment - Nạp tiền vào balance_main
-- ================================================================

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
  v_new_balance_main INTEGER;
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
    transaction_id = COALESCE(p_transaction_id, 'TXN_' || TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS')),
    payment_description = COALESCE(p_payment_description, 'Nạp tiền qua chuyển khoản - ' || p_order_code),
    paid_at = NOW(),
    confirmed_at = NOW()
  WHERE id = v_topup.id;

  -- 4. Increase balance_main (ĐÃ SỬA: từ balance_coc → balance_main)
  UPDATE public.profiles
  SET balance_main = balance_main + v_topup.amount
  WHERE id = v_topup.user_id
  RETURNING balance_main INTO v_new_balance_main;

  -- 5. Create transaction log
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    type,
    note,
    deposit_id
  ) VALUES (
    v_topup.user_id,
    v_topup.amount,
    'topup',
    'Nạp tiền vào ví chính - ' || p_order_code,
    NULL -- topup is not a deposit
  );

  RETURN jsonb_build_object(
    'success', true,
    'topup_id', v_topup.id,
    'amount', v_topup.amount,
    'balance_main_after', v_new_balance_main,
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
-- 2. FIX: purchase_product - Ưu tiên trừ balance_main
-- ================================================================

CREATE OR REPLACE FUNCTION public.purchase_product(
  p_user_id UUID,
  p_product_id UUID,
  p_quantity INTEGER DEFAULT 1,
  p_user_voucher_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product RECORD;
  v_user_voucher RECORD;
  v_user_profile RECORD;
  v_price_at_purchase INTEGER;
  v_subtotal INTEGER;
  v_voucher_amount INTEGER := 0;
  v_wallet_used INTEGER := 0;
  v_payment_method TEXT;
  v_balance_after_main INTEGER;
  v_balance_after_coc INTEGER;
  v_balance_after_thuong INTEGER;
  v_purchase_id UUID;
BEGIN
  -- 1. Validate product
  SELECT * INTO v_product FROM public.products
  WHERE id = p_product_id AND status = 'active'
  LIMIT 1;

  IF v_product IS NULL THEN
    RAISE EXCEPTION 'Sản phẩm không tồn tại hoặc không còn bán';
  END IF;

  -- 2. Check stock
  IF v_product.stock > -1 AND v_product.stock < p_quantity THEN
    RAISE EXCEPTION 'Không đủ hàng trong kho. Hiện có: %', v_product.stock;
  END IF;

  v_price_at_purchase := v_product.price;
  v_subtotal := v_price_at_purchase * p_quantity;

  -- 3. Get user's wallet (balance_main + balance_thuong + balance_coc)
  SELECT * INTO v_user_profile FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_user_profile IS NULL THEN
    RAISE EXCEPTION 'User không tồn tại';
  END IF;

  -- 4. Process voucher nếu có
  IF p_user_voucher_id IS NOT NULL THEN
    SELECT uv.*, v.amount INTO v_user_voucher
    FROM public.user_vouchers uv
    JOIN public.vouchers v ON uv.voucher_id = v.id
    WHERE uv.id = p_user_voucher_id 
      AND uv.user_id = p_user_id 
      AND uv.status = 'active'
    LIMIT 1;

    IF v_user_voucher IS NULL THEN
      RAISE EXCEPTION 'Voucher không hợp lệ hoặc đã được sử dụng';
    END IF;

    v_voucher_amount := LEAST(v_user_voucher.amount, v_subtotal);
  END IF;

  -- 5. Tính số tiền cần trừ từ ví
  v_wallet_used := v_subtotal - v_voucher_amount;

  -- 6. ĐÃ SỬA: Ưu tiên trừ balance_main → balance_thuong (KHÔNG dùng balance_coc)
  v_balance_after_coc := v_user_profile.balance_coc; -- Không động tới cọc
  
  IF v_wallet_used > 0 THEN
    -- Case 1: balance_main đủ
    IF v_user_profile.balance_main >= v_wallet_used THEN
      v_balance_after_main := v_user_profile.balance_main - v_wallet_used;
      v_balance_after_thuong := v_user_profile.balance_thuong;
      v_payment_method := 'main';
      
    -- Case 2: main + thuong
    ELSIF (v_user_profile.balance_main + v_user_profile.balance_thuong) >= v_wallet_used THEN
      v_balance_after_main := 0;
      v_balance_after_thuong := v_user_profile.balance_thuong - (v_wallet_used - v_user_profile.balance_main);
      v_payment_method := 'main_thuong';
      
    ELSE
      RAISE EXCEPTION 'Số dư không đủ. Cần: %, Có: % (main: %, thuong: %)', 
        v_wallet_used,
        (v_user_profile.balance_main + v_user_profile.balance_thuong),
        v_user_profile.balance_main,
        v_user_profile.balance_thuong;
    END IF;
  ELSE
    v_balance_after_main := v_user_profile.balance_main;
    v_balance_after_thuong := v_user_profile.balance_thuong;
    v_payment_method := 'voucher';
  END IF;

  -- 7. Update user balances
  UPDATE public.profiles
  SET balance_main = v_balance_after_main,
      balance_coc = v_balance_after_coc,
      balance_thuong = v_balance_after_thuong,
      updated_at = now()
  WHERE id = p_user_id;

  -- 8. Create purchase record
  INSERT INTO public.purchases (
    user_id,
    product_id,
    quantity,
    price_at_purchase,
    total_amount,
    payment_method,
    wallet_used,
    voucher_id,
    voucher_amount,
    status,
    notes
  ) VALUES (
    p_user_id,
    p_product_id,
    p_quantity,
    v_price_at_purchase,
    v_subtotal,
    v_payment_method,
    v_wallet_used,
    v_user_voucher.voucher_id,
    v_voucher_amount,
    'completed',
    p_notes
  ) RETURNING id INTO v_purchase_id;

  -- 9. Mark voucher as used
  IF p_user_voucher_id IS NOT NULL THEN
    UPDATE public.user_vouchers
    SET status = 'used',
        used_at = now()
    WHERE id = p_user_voucher_id;
  END IF;

  -- 10. Deduct stock
  IF v_product.stock > -1 THEN
    UPDATE public.products
    SET stock = stock - p_quantity
    WHERE id = p_product_id;
  END IF;

  -- 11. Log transactions
  IF v_wallet_used > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id,
      type,
      amount,
      note,
      deposit_id
    ) VALUES (
      p_user_id,
      'purchase_product',
      v_wallet_used,
      'Mua: ' || v_product.name || ' (từ ví ' || v_payment_method || ')',
      NULL
    );
  END IF;

  IF v_voucher_amount > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id,
      type,
      amount,
      note,
      deposit_id
    ) VALUES (
      p_user_id,
      'use_voucher',
      v_voucher_amount,
      'Dùng voucher mua: ' || v_product.name,
      NULL
    );
  END IF;

  -- 12. Return success
  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'product_name', v_product.name,
    'total_amount', v_subtotal,
    'voucher_used', v_voucher_amount,
    'wallet_used', v_wallet_used,
    'payment_method', v_payment_method,
    'balance_main_after', v_balance_after_main,
    'balance_coc_after', v_balance_after_coc,
    'balance_thuong_after', v_balance_after_thuong
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
-- 3. FIX: decrease_balance_coc - Cọc trừ từ balance_main
-- ================================================================
-- LƯU Ý: Function này dùng để CỌC (deposit), nên trừ từ balance_main
-- Khi hoàn cọc sẽ vào balance_coc (function increase_balance_coc giữ nguyên)

CREATE OR REPLACE FUNCTION public.decrease_balance_coc(
  p_user_id UUID,
  p_amount INTEGER,
  p_note TEXT DEFAULT NULL
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
  -- 1. Get current balance_main
  SELECT balance_main INTO v_old_balance_main
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_old_balance_main IS NULL THEN
    RAISE EXCEPTION 'User không tồn tại';
  END IF;

  -- 2. Check if enough balance in main wallet
  IF v_old_balance_main < p_amount THEN
    RAISE EXCEPTION 'Số dư ví chính không đủ. Hiện có: %, cần: %', v_old_balance_main, p_amount;
  END IF;

  -- 3. Decrease balance_main (ĐÃ SỬA: từ balance_coc → balance_main)
  UPDATE public.profiles
  SET balance_main = balance_main - p_amount
  WHERE id = p_user_id
  RETURNING balance_main INTO v_new_balance_main;

  -- 4. Log transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    type,
    note,
    deposit_id
  ) VALUES (
    p_user_id,
    p_amount,
    'deposit_lock',
    COALESCE(p_note, 'Khóa tiền cọc từ ví chính'),
    NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'old_balance_main', v_old_balance_main,
    'new_balance_main', v_new_balance_main,
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
-- 4. GIỮ NGUYÊN: increase_balance_coc - Hoàn cọc vào balance_coc
-- ================================================================
-- Function này đúng rồi: hoàn cọc vào balance_coc (chỉ quy đổi voucher)

-- ================================================================
-- 5. FIX: Withdrawal - Chỉ rút từ balance_main + balance_thuong
-- ================================================================
-- (Balance_coc KHÔNG cho rút, chỉ quy đổi voucher)

CREATE OR REPLACE FUNCTION public.create_withdrawal_request_p2p(
  p_user_id UUID,
  p_amount INTEGER,
  p_bank_name TEXT,
  p_bank_account TEXT,
  p_account_holder TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_order_code TEXT;
  v_withdrawal_id UUID;
  v_available_balance INTEGER;
BEGIN
  -- 1. Validate amount
  IF p_amount < 50000 THEN
    RAISE EXCEPTION 'Số tiền rút tối thiểu là 50.000 đ';
  END IF;

  -- 2. Get user wallet (CHỈ balance_main + balance_thuong, KHÔNG dùng balance_coc)
  SELECT 
    id,
    display_name,
    balance_main,
    balance_thuong,
    (balance_main + balance_thuong) as available_balance
  INTO v_user
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'User không tồn tại';
  END IF;

  v_available_balance := v_user.available_balance;

  -- 3. Check if enough balance (KHÔNG tính balance_coc)
  IF v_available_balance < p_amount THEN
    RAISE EXCEPTION 'Số dư không đủ. Có thể rút: % (main: %, thưởng: %)', 
      v_available_balance,
      v_user.balance_main,
      v_user.balance_thuong;
  END IF;

  -- 4. Generate order code
  v_order_code := 'WD' || TO_CHAR(NOW(), 'YYMMDD') || '_' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));

  -- 5. Create withdrawal request
  INSERT INTO public.withdrawal_requests (
    user_id,
    amount,
    bank_name,
    bank_account,
    account_holder,
    order_code,
    status,
    notes
  ) VALUES (
    p_user_id,
    p_amount,
    p_bank_name,
    p_bank_account,
    p_account_holder,
    v_order_code,
    'pending',
    p_notes
  ) RETURNING id INTO v_withdrawal_id;

  -- 6. Deduct from main first, then thuong
  IF v_user.balance_main >= p_amount THEN
    -- Trừ hết từ main
    UPDATE public.profiles
    SET balance_main = balance_main - p_amount
    WHERE id = p_user_id;
  ELSE
    -- Trừ hết main, phần còn lại từ thuong
    UPDATE public.profiles
    SET balance_main = 0,
        balance_thuong = balance_thuong - (p_amount - v_user.balance_main)
    WHERE id = p_user_id;
  END IF;

  -- 7. Log transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    amount,
    type,
    note,
    deposit_id
  ) VALUES (
    p_user_id,
    p_amount,
    'withdrawal',
    'Rút tiền - ' || v_order_code,
    NULL
  );

  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', v_withdrawal_id,
    'order_code', v_order_code
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
-- VERIFICATION
-- ================================================================

SELECT 'Migration completed successfully!' as status;
