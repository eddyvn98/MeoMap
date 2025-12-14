-- ================================================================
-- SQL FUNCTIONS: Mua hàng với voucher
-- ================================================================

-- ================================================================
-- FUNCTION: purchase_product
-- Mua sản phẩm, có thể dùng voucher hoặc ví
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
  v_balance_after_coc INTEGER;
  v_balance_after_thuong INTEGER;
  v_purchase_id UUID;
  v_quantity_to_deduct INTEGER;
BEGIN
  -- 1. Validate product
  SELECT * INTO v_product FROM public.products
  WHERE id = p_product_id AND status = 'active'
  LIMIT 1;

  IF v_product IS NULL THEN
    RAISE EXCEPTION 'Sản phẩm không tồn tại hoặc không còn bán';
  END IF;

  -- 2. Check stock nếu có giới hạn
  IF v_product.stock > -1 AND v_product.stock < p_quantity THEN
    RAISE EXCEPTION 'Không đủ hàng trong kho. Hiện có: %', v_product.stock;
  END IF;

  v_price_at_purchase := v_product.price;
  v_subtotal := v_price_at_purchase * p_quantity;

  -- 3. Get user's wallet (balance_coc + balance_thuong)
  SELECT * INTO v_user_profile FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE; -- Lock for update

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

    -- Giá trị voucher không vượt quá tổng tiền
    v_voucher_amount := LEAST(v_user_voucher.amount, v_subtotal);
  END IF;

  -- 5. Tính số tiền cần trừ từ ví
  v_wallet_used := v_subtotal - v_voucher_amount;

  -- 6. Check if balance_coc enough first, then balance_thuong
  IF v_wallet_used > 0 THEN
    -- Ưu tiên trừ từ balance_coc
    IF v_user_profile.balance_coc >= v_wallet_used THEN
      v_balance_after_coc := v_user_profile.balance_coc - v_wallet_used;
      v_balance_after_thuong := v_user_profile.balance_thuong;
      v_payment_method := 'coc';
    -- Nếu coc không đủ, dùng coc + thuong
    ELSIF (v_user_profile.balance_coc + v_user_profile.balance_thuong) >= v_wallet_used THEN
      v_balance_after_coc := 0;
      v_balance_after_thuong := v_user_profile.balance_thuong - (v_wallet_used - v_user_profile.balance_coc);
      v_payment_method := 'mixed';
    ELSE
      RAISE EXCEPTION 'Số dư không đủ. Cần: %, Có: %', 
        v_wallet_used, 
        (v_user_profile.balance_coc + v_user_profile.balance_thuong);
    END IF;
  ELSE
    v_balance_after_coc := v_user_profile.balance_coc;
    v_balance_after_thuong := v_user_profile.balance_thuong;
    v_payment_method := 'voucher';
  END IF;

  -- 7. Update user balances
  UPDATE public.profiles
  SET balance_coc = v_balance_after_coc,
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

  -- 9. Mark voucher as used nếu dùng voucher
  IF p_user_voucher_id IS NOT NULL THEN
    UPDATE public.user_vouchers
    SET status = 'used',
        used_at = now()
    WHERE id = p_user_voucher_id;
  END IF;

  -- 10. Deduct stock nếu có giới hạn
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
      source_type,
      note
    ) VALUES (
      p_user_id,
      'purchase_product',
      v_wallet_used,
      CASE WHEN v_payment_method = 'coc' THEN 'coc' 
           WHEN v_payment_method = 'mixed' THEN 'coc' 
           ELSE 'thuong' 
      END,
      'Mua: ' || v_product.name
    );
  END IF;

  IF v_voucher_amount > 0 THEN
    INSERT INTO public.wallet_transactions (
      user_id,
      type,
      amount,
      source_type,
      note
    ) VALUES (
      p_user_id,
      'use_voucher',
      v_voucher_amount,
      'voucher',
      'Dùng voucher mua: ' || v_product.name
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
    'balance_coc_after', v_balance_after_coc,
    'balance_thuong_after', v_balance_after_thuong,
    'message', 'Mua hàng thành công!'
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END $$;

-- ================================================================
-- FUNCTION: get_purchases
-- Lấy lịch sử mua hàng của user
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_purchases(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  product_name TEXT,
  quantity INTEGER,
  price_at_purchase INTEGER,
  total_amount INTEGER,
  payment_method TEXT,
  voucher_amount INTEGER,
  purchased_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    pr.name,
    p.quantity,
    p.price_at_purchase,
    p.total_amount,
    p.payment_method,
    p.voucher_amount,
    p.purchased_at
  FROM public.purchases p
  JOIN public.products pr ON p.product_id = pr.id
  WHERE p.user_id = p_user_id AND p.status = 'completed'
  ORDER BY p.purchased_at DESC
  LIMIT p_limit OFFSET p_offset;
END $$;

-- ================================================================
-- FUNCTION: get_products
-- Lấy danh sách sản phẩm
-- ================================================================

CREATE OR REPLACE FUNCTION public.get_products(
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  price INTEGER,
  category TEXT,
  image_url TEXT,
  stock INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.id,
    pr.name,
    pr.description,
    pr.price,
    pr.category,
    pr.image_url,
    pr.stock,
    pr.status
  FROM public.products pr
  WHERE pr.status = 'active'
    AND (p_category IS NULL OR pr.category = p_category)
  ORDER BY pr.category, pr.name;
END $$;
