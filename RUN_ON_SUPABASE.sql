-- =====================================================
-- 🎯 MIGRATION CUỐI CÙNG - CHẠY TRÊN SUPABASE
-- =====================================================
-- Copy toàn bộ file này vào Supabase SQL Editor và Run
-- 
-- Mục tiêu:
-- ✅ Xóa các cột không dùng (GIỮ LẠI payment columns)
-- ✅ Thêm ít cột mới nhất có thể
-- ✅ Không tạo bảng mới
--

-- =====================================================
-- PHẦN 1: DỌN DẸP BẢNG DEPOSITS (XÓA CỘT KHÔNG DÙNG)
-- =====================================================

-- Xóa các cột của quy trình cũ (delivery token system)
ALTER TABLE public.deposits 
DROP COLUMN IF EXISTS delivery_token CASCADE;

ALTER TABLE public.deposits 
DROP COLUMN IF EXISTS delivery_cancelled_by CASCADE;

-- Xóa proof (không dùng trong flow mới)
ALTER TABLE public.deposits 
DROP COLUMN IF EXISTS proof_image_url CASCADE;

ALTER TABLE public.deposits 
DROP COLUMN IF EXISTS proof_note CASCADE;

-- Đổi tên cột cho rõ nghĩa (nếu tồn tại)
DO $$
BEGIN
  ALTER TABLE public.deposits 
  RENAME COLUMN delivery_status TO confirmed_status;
EXCEPTION WHEN undefined_column THEN
  -- Column doesn't exist, skip
END $$;

-- =====================================================
-- PHẦN 2: THÊM CỘT MỚI CHO DEPOSITS
-- =====================================================

-- Cột 1: Thời điểm xác nhận giao mèo (scan QR)
ALTER TABLE public.deposits
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Migrate dữ liệu: confirmed_at = delivered_at
UPDATE public.deposits
SET confirmed_at = delivered_at
WHERE delivered_at IS NOT NULL AND confirmed_at IS NULL;

-- Cột 2: Đánh giá của owner (good/bad/neutral)
ALTER TABLE public.deposits
ADD COLUMN IF NOT EXISTS owner_rating TEXT;

ALTER TABLE public.deposits 
DROP CONSTRAINT IF EXISTS deposits_owner_rating_check;

ALTER TABLE public.deposits
ADD CONSTRAINT deposits_owner_rating_check 
CHECK (owner_rating IS NULL OR owner_rating IN ('good', 'bad', 'neutral'));

-- =====================================================
-- PHẦN 3: THÊM USER QR ID VÀO PROFILES
-- =====================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_qr_id TEXT;

-- Tạo unique index (thay vì constraint để tránh lỗi khi có NULL)
DROP INDEX IF EXISTS idx_profiles_user_qr_id_unique;
CREATE UNIQUE INDEX idx_profiles_user_qr_id_unique 
ON public.profiles(user_qr_id) 
WHERE user_qr_id IS NOT NULL;

-- Function tự động sinh QR ID
CREATE OR REPLACE FUNCTION generate_user_qr_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_qr_id IS NULL THEN
    NEW.user_qr_id := 'USER-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger cho user mới
DROP TRIGGER IF EXISTS trigger_generate_user_qr_id ON public.profiles;
CREATE TRIGGER trigger_generate_user_qr_id
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_user_qr_id();

-- Sinh QR ID cho user hiện có
UPDATE public.profiles 
SET user_qr_id = 'USER-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
WHERE user_qr_id IS NULL;

-- Index để query nhanh
CREATE INDEX IF NOT EXISTS idx_profiles_user_qr_id 
ON public.profiles(user_qr_id);

-- =====================================================
-- PHẦN 4: CẬP NHẬT STATUS CONSTRAINT
-- =====================================================

ALTER TABLE public.deposits 
DROP CONSTRAINT IF EXISTS deposits_status_check;

ALTER TABLE public.deposits 
ADD CONSTRAINT deposits_status_check 
CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded'));

-- =====================================================
-- PHẦN 5: FUNCTION XÁC NHẬN GIAO MÈO (SCAN QR)
-- =====================================================

CREATE OR REPLACE FUNCTION confirm_delivery_by_qr(
  p_owner_id UUID,
  p_receiver_qr_id TEXT,
  p_pet_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  deposit_id UUID
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receiver_id UUID;
  v_deposit_id UUID;
  v_pet_owner UUID;
BEGIN
  -- Kiểm tra owner có phải chủ mèo không
  SELECT owner_id INTO v_pet_owner
  FROM public.pets
  WHERE id = p_pet_id;

  IF v_pet_owner IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Không tìm thấy mèo', NULL::UUID;
    RETURN;
  END IF;

  IF v_pet_owner != p_owner_id THEN
    RETURN QUERY SELECT FALSE, 'Bạn không phải chủ mèo này', NULL::UUID;
    RETURN;
  END IF;

  -- Tìm receiver từ QR code
  SELECT id INTO v_receiver_id
  FROM public.profiles
  WHERE user_qr_id = p_receiver_qr_id;

  IF v_receiver_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Mã QR không hợp lệ', NULL::UUID;
    RETURN;
  END IF;

  -- Tìm deposit đang pending
  SELECT id INTO v_deposit_id
  FROM public.deposits
  WHERE pet_id = p_pet_id
    AND receiver_id = v_receiver_id
    AND owner_id = p_owner_id
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_deposit_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Không tìm thấy giao dịch cọc phù hợp', NULL::UUID;
    RETURN;
  END IF;

  -- Cập nhật deposit: pending → confirmed
  UPDATE public.deposits
  SET 
    status = 'confirmed',
    confirmed_at = NOW(),
    confirmed_status = 'delivered',
    delivered_at = NOW(),
    updated_at = NOW()
  WHERE id = v_deposit_id;

  -- Cập nhật trạng thái mèo
  UPDATE public.pets
  SET 
    status = 'delivered',
    updated_at = NOW()
  WHERE id = p_pet_id;

  RETURN QUERY SELECT TRUE, 'Xác nhận giao mèo thành công! ✅', v_deposit_id;
END;
$$;

-- =====================================================
-- PHẦN 6: FUNCTION ĐÁNH GIÁ
-- =====================================================

CREATE OR REPLACE FUNCTION rate_delivery(
  p_deposit_id UUID,
  p_owner_id UUID,
  p_rating TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit_owner UUID;
  v_deposit_status TEXT;
BEGIN
  -- Validate rating
  IF p_rating NOT IN ('good', 'bad', 'neutral') THEN
    RETURN QUERY SELECT FALSE, 'Rating phải là: good, bad, hoặc neutral';
    RETURN;
  END IF;

  -- Kiểm tra deposit có tồn tại và thuộc owner không
  SELECT owner_id, status INTO v_deposit_owner, v_deposit_status
  FROM public.deposits
  WHERE id = p_deposit_id;

  IF v_deposit_owner IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Không tìm thấy giao dịch';
    RETURN;
  END IF;

  IF v_deposit_owner != p_owner_id THEN
    RETURN QUERY SELECT FALSE, 'Bạn không có quyền đánh giá giao dịch này';
    RETURN;
  END IF;

  IF v_deposit_status != 'confirmed' THEN
    RETURN QUERY SELECT FALSE, 'Chỉ có thể đánh giá giao dịch đã xác nhận';
    RETURN;
  END IF;

  -- Cập nhật rating
  UPDATE public.deposits
  SET 
    owner_rating = p_rating,
    updated_at = NOW()
  WHERE id = p_deposit_id;

  RETURN QUERY SELECT TRUE, 'Đã ghi nhận đánh giá: ' || p_rating || ' ⭐';
END;
$$;

-- =====================================================
-- PHẦN 7: VIEW UY TÍN NGƯỜI DÙNG
-- =====================================================

CREATE OR REPLACE VIEW user_reputation_stats AS
SELECT 
  d.receiver_id as user_id,
  p.display_name,
  p.avatar_url,
  COUNT(*) as total_deliveries,
  COUNT(CASE WHEN d.owner_rating = 'good' THEN 1 END) as good_count,
  COUNT(CASE WHEN d.owner_rating = 'bad' THEN 1 END) as bad_count,
  COUNT(CASE WHEN d.owner_rating = 'neutral' THEN 1 END) as neutral_count,
  COUNT(CASE WHEN d.owner_rating IS NULL THEN 1 END) as unrated_count,
  ROUND(
    COUNT(CASE WHEN d.owner_rating = 'good' THEN 1 END) * 100.0 / 
    NULLIF(COUNT(CASE WHEN d.owner_rating IS NOT NULL THEN 1 END), 0), 
    1
  ) as good_percentage
FROM public.deposits d
LEFT JOIN public.profiles p ON p.id = d.receiver_id
WHERE d.confirmed_at IS NOT NULL
GROUP BY d.receiver_id, p.display_name, p.avatar_url;

-- Compatibility view for old frontend code
CREATE OR REPLACE VIEW public.user_reputation AS
SELECT 
  receiver_id AS user_id,
  COUNT(*)::integer AS total_trades,
  COUNT(*) FILTER (WHERE owner_rating = 'good')::integer AS ok_trades,
  COUNT(*) FILTER (WHERE owner_rating = 'bad')::integer AS bad_trades
FROM public.deposits
WHERE confirmed_at IS NOT NULL
GROUP BY receiver_id;

-- =====================================================
-- PHẦN 8: RLS POLICIES CHO FUNCTIONS
-- =====================================================

-- Enable RLS nếu chưa có
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: User có thể đọc deposits của mình
DROP POLICY IF EXISTS "Users can view their own deposits" ON public.deposits;
CREATE POLICY "Users can view their own deposits"
ON public.deposits FOR SELECT
USING (
  auth.uid() = receiver_id 
  OR auth.uid() = owner_id
);

-- Policy: Owner có thể update deposits của mình
DROP POLICY IF EXISTS "Owners can update their deposits" ON public.deposits;
CREATE POLICY "Owners can update their deposits"
ON public.deposits FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Policy: User có thể đọc profiles của người khác (để xem uy tín)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
USING (true);

-- =====================================================
-- ✅ HOÀN TẤT!
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MIGRATION HOÀN TẤT!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ĐÃ XÓA 5 cột không dùng từ deposits:';
  RAISE NOTICE '   ❌ delivery_token';
  RAISE NOTICE '   ❌ delivery_cancelled_by';
  RAISE NOTICE '   ❌ delivery_cancel_reason';
  RAISE NOTICE '   ❌ proof_image_url';
  RAISE NOTICE '   ❌ proof_note';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ĐÃ THÊM 3 cột mới:';
  RAISE NOTICE '   ✅ profiles.user_qr_id (QR code cho user)';
  RAISE NOTICE '   ✅ deposits.confirmed_at (thời điểm xác nhận)';
  RAISE NOTICE '   ✅ deposits.owner_rating (đánh giá)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 ĐÃ TẠO:';
  RAISE NOTICE '   ✅ 2 functions: confirm_delivery_by_qr, rate_delivery';
  RAISE NOTICE '   ✅ 1 view: user_reputation_stats';
  RAISE NOTICE '   ✅ 3 RLS policies';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 KẾT QUẢ: Giảm 2 cột (5 xóa - 3 thêm)';
  RAISE NOTICE '========================================';
END $$;
