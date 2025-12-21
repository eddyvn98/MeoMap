-- ================================================================
-- AUTO REVIEW AND REFUND VOUCHER SYSTEM
-- ================================================================
-- Flow: Sau khi nhận mèo (delivered):
-- 1. Sau 3 ngày, nhắc nhở người nhận đánh giá
-- 2. Nếu không đánh giá → auto đánh giá tốt (good)
-- 3. Nếu đánh giá tốt → hoàn tiền deposit về voucher cho người nhận
-- 4. Nếu đánh giá xấu → hoàn tiền deposit về voucher cho chủ bài
-- ================================================================

-- STEP 1: Thêm cột auto_reviewed vào bảng adoption_ratings
ALTER TABLE public.adoption_ratings
ADD COLUMN IF NOT EXISTS auto_reviewed boolean DEFAULT false;

COMMENT ON COLUMN public.adoption_ratings.auto_reviewed IS 'True nếu đánh giá được tạo tự động sau 3 ngày';

-- STEP 2: Thêm cột refunded_as_voucher vào bảng deposits
ALTER TABLE public.deposits
ADD COLUMN IF NOT EXISTS refunded_as_voucher boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS refunded_to_user_id uuid NULL,
ADD COLUMN IF NOT EXISTS refund_voucher_id uuid NULL;

COMMENT ON COLUMN public.deposits.refunded_as_voucher IS 'True nếu deposit đã được hoàn về dưới dạng voucher';
COMMENT ON COLUMN public.deposits.refunded_to_user_id IS 'User ID nhận voucher hoàn tiền (receiver nếu rating good, owner nếu rating bad)';
COMMENT ON COLUMN public.deposits.refund_voucher_id IS 'ID của user_voucher được tạo khi hoàn tiền';

-- STEP 3: Function tạo rating tự động (good) sau 3 ngày
CREATE OR REPLACE FUNCTION auto_create_good_rating(
  p_adoption_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_rating_id uuid;
  v_deposit_id uuid;
BEGIN
  -- Lấy thông tin adoption request
  SELECT * INTO v_request
  FROM public.adoption_requests
  WHERE id = p_adoption_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adoption request not found');
  END IF;
  
  -- Kiểm tra đã 3 ngày chưa
  IF (NOW() - v_request.delivered_at) < INTERVAL '3 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not yet 3 days since delivery');
  END IF;
  
  -- Kiểm tra đã có rating chưa
  IF EXISTS (
    SELECT 1 FROM public.adoption_ratings
    WHERE deposit_id IN (
      SELECT id FROM public.deposits
      WHERE adoption_request_id = p_adoption_request_id
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating already exists');
  END IF;
  
  -- Lấy deposit_id
  SELECT id INTO v_deposit_id
  FROM public.deposits
  WHERE adoption_request_id = p_adoption_request_id
  LIMIT 1;
  
  IF v_deposit_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deposit not found');
  END IF;
  
  -- Tạo rating tự động = good (score = 1 = good)
  INSERT INTO public.adoption_ratings (
    deposit_id,
    pet_id,
    rater_id,
    target_id,
    score,
    comment,
    auto_reviewed
  ) VALUES (
    v_deposit_id,
    v_request.pet_id,
    v_request.owner_id,  -- Chủ bài đánh giá
    v_request.requester_id,  -- Người nhận
    1,  -- score = 1 = good
    'Tự động đánh giá tốt sau 3 ngày (không có đánh giá thủ công)',
    true
  )
  RETURNING id INTO v_rating_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'rating_id', v_rating_id,
    'deposit_id', v_deposit_id,
    'auto_reviewed', true
  );
END;
$$;

-- STEP 4: Function hoàn tiền deposit về voucher dựa trên rating
CREATE OR REPLACE FUNCTION refund_deposit_as_voucher(
  p_adoption_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_deposit RECORD;
  v_rating RECORD;
  v_receiver_user_id uuid;
  v_voucher_code text;
  v_user_voucher_id uuid;
  v_available_voucher_id uuid;
BEGIN
  -- Lấy thông tin adoption request
  SELECT * INTO v_request
  FROM public.adoption_requests
  WHERE id = p_adoption_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adoption request not found');
  END IF;
  
  -- Lấy deposit
  SELECT * INTO v_deposit
  FROM public.deposits
  WHERE adoption_request_id = p_adoption_request_id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deposit not found');
  END IF;
  
  -- Kiểm tra đã refund chưa
  IF v_deposit.refunded_as_voucher = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Deposit already refunded as voucher');
  END IF;
  
  -- Lấy rating
  SELECT * INTO v_rating
  FROM public.adoption_ratings
  WHERE deposit_id = v_deposit.id
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rating not found');
  END IF;
  
  -- Xác định người nhận voucher dựa trên rating
  -- score = 1 (good) → receiver nhận voucher
  -- score = 0 hoặc -1 (bad) → owner nhận voucher
  IF v_rating.score >= 1 THEN
    v_receiver_user_id := v_request.requester_id;  -- Người nhận mèo
  ELSE
    v_receiver_user_id := v_request.owner_id;  -- Chủ bài
  END IF;
  
  -- Tìm voucher khả dụng có giá trị bằng deposit amount
  SELECT id, code INTO v_available_voucher_id, v_voucher_code
  FROM public.vouchers
  WHERE amount = v_deposit.amount
    AND active = true
  LIMIT 1;
  
  -- Nếu không có voucher phù hợp, tạo mới
  IF v_available_voucher_id IS NULL THEN
    INSERT INTO public.vouchers (code, amount, description, active)
    VALUES (
      'REFUND_' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 8)),
      v_deposit.amount,
      'Voucher hoàn tiền từ deposit nhận nuôi',
      true
    )
    RETURNING id, code INTO v_available_voucher_id, v_voucher_code;
  END IF;
  
  -- Tạo user_voucher cho người nhận
  INSERT INTO public.user_vouchers (
    user_id,
    voucher_id,
    source_type,
    status
  ) VALUES (
    v_receiver_user_id,
    v_available_voucher_id,
    'refund_deposit',
    'active'
  )
  RETURNING id INTO v_user_voucher_id;
  
  -- Cập nhật deposit
  UPDATE public.deposits
  SET 
    refunded_as_voucher = true,
    refunded_to_user_id = v_receiver_user_id,
    refund_voucher_id = v_user_voucher_id,
    status = 'refunded',
    updated_at = NOW()
  WHERE id = v_deposit.id;
  
  -- Log transaction
  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    source_type,
    description,
    deposit_id,
    created_at
  ) VALUES (
    v_receiver_user_id,
    'refund_deposit_as_voucher',
    v_deposit.amount,
    'deposit',
    CASE 
      WHEN v_rating.score >= 1 THEN 'Hoàn tiền deposit về voucher (đánh giá tốt)'
      ELSE 'Hoàn tiền deposit về voucher (đánh giá xấu - bồi thường cho chủ bài)'
    END,
    v_deposit.id,
    NOW()
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'deposit_id', v_deposit.id,
    'receiver_user_id', v_receiver_user_id,
    'voucher_code', v_voucher_code,
    'user_voucher_id', v_user_voucher_id,
    'amount', v_deposit.amount,
    'rating_score', v_rating.score
  );
END;
$$;

-- STEP 5: Function tổng hợp - Auto review + refund voucher
CREATE OR REPLACE FUNCTION auto_review_and_refund_deposit(
  p_adoption_request_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rating_result jsonb;
  v_refund_result jsonb;
  v_request RECORD;
BEGIN
  -- Lấy thông tin adoption request
  SELECT * INTO v_request
  FROM public.adoption_requests
  WHERE id = p_adoption_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adoption request not found');
  END IF;
  
  -- Kiểm tra status phải là delivered hoặc completed
  IF v_request.status NOT IN ('delivered', 'completed') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request must be delivered or completed');
  END IF;
  
  -- Kiểm tra đã 3 ngày chưa
  IF (NOW() - v_request.delivered_at) < INTERVAL '3 days' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not yet 3 days since delivery');
  END IF;
  
  -- Bước 1: Tạo rating tự động nếu chưa có
  v_rating_result := auto_create_good_rating(p_adoption_request_id);
  
  -- Nếu rating đã tồn tại hoặc đã được tạo, tiếp tục refund
  IF (v_rating_result->>'success')::boolean = true 
     OR (v_rating_result->>'error')::text = 'Rating already exists' THEN
    
    -- Bước 2: Hoàn tiền về voucher
    v_refund_result := refund_deposit_as_voucher(p_adoption_request_id);
    
    -- Update adoption request status = completed
    IF (v_refund_result->>'success')::boolean = true THEN
      UPDATE public.adoption_requests
      SET 
        status = 'completed',
        status_updated_at = NOW()
      WHERE id = p_adoption_request_id;
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'adoption_request_id', p_adoption_request_id,
      'rating_result', v_rating_result,
      'refund_result', v_refund_result
    );
  ELSE
    RETURN v_rating_result;
  END IF;
END;
$$;

-- STEP 6: Function để check và auto-process các request đã quá 3 ngày
-- (Có thể chạy định kỳ bằng cron job hoặc trigger)
CREATE OR REPLACE FUNCTION process_overdue_adoption_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_result jsonb;
  v_processed_count integer := 0;
  v_results jsonb[] := '{}';
BEGIN
  -- Tìm các request đã delivered > 3 ngày và chưa complete
  FOR v_request IN 
    SELECT * FROM public.adoption_requests
    WHERE status = 'delivered'
      AND delivered_at IS NOT NULL
      AND (NOW() - delivered_at) >= INTERVAL '3 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.deposits
        WHERE adoption_request_id = adoption_requests.id
          AND refunded_as_voucher = true
      )
  LOOP
    -- Xử lý auto review + refund
    v_result := auto_review_and_refund_deposit(v_request.id);
    
    IF (v_result->>'success')::boolean = true THEN
      v_processed_count := v_processed_count + 1;
      v_results := array_append(v_results, v_result);
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'processed_count', v_processed_count,
    'results', to_jsonb(v_results)
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION auto_create_good_rating(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION refund_deposit_as_voucher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_review_and_refund_deposit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION process_overdue_adoption_requests() TO authenticated;

-- Comments
COMMENT ON FUNCTION auto_create_good_rating IS 'Tự động tạo đánh giá tốt sau 3 ngày nếu chưa có đánh giá';
COMMENT ON FUNCTION refund_deposit_as_voucher IS 'Hoàn tiền deposit về voucher cho receiver (nếu rating tốt) hoặc owner (nếu rating xấu)';
COMMENT ON FUNCTION auto_review_and_refund_deposit IS 'Tổng hợp: Auto review + refund voucher sau 3 ngày';
COMMENT ON FUNCTION process_overdue_adoption_requests IS 'Batch process tất cả request đã quá 3 ngày (chạy định kỳ)';
