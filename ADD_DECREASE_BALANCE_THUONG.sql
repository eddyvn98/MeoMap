-- Add decrease_balance_thuong function to support bounty system
-- This function is needed to deduct balance_thuong when users post bounties

CREATE OR REPLACE FUNCTION public.decrease_balance_thuong(
  p_user_id UUID,
  p_amount INTEGER,
  p_case_id UUID DEFAULT NULL,
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
  -- Kiểm tra user tồn tại và lấy balance hiện tại
  SELECT balance_thuong 
  FROM profiles 
  WHERE id = p_user_id
  INTO v_current_balance;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Kiểm tra đủ balance
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'current_balance', v_current_balance,
      'required_amount', p_amount
    );
  END IF;

  -- Trừ balance_thuong
  UPDATE profiles
  SET balance_thuong = balance_thuong - p_amount
  WHERE id = p_user_id
  RETURNING balance_thuong INTO v_new_balance;

  -- Log transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    source_type,
    note,
    case_id
  ) VALUES (
    p_user_id,
    'bounty_locked',
    -p_amount,  -- Số âm để thể hiện tiền ra
    'thuong',
    COALESCE(p_note, 'Treo thưởng cho ca cứu hộ'),
    p_case_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance,
    'amount_deducted', p_amount
  );
END $$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.decrease_balance_thuong TO authenticated;

COMMENT ON FUNCTION public.decrease_balance_thuong IS 'Trừ balance_thuong khi người dùng treo thưởng cho ca cứu hộ';
