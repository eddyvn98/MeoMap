-- ================================================================
-- DEPOSITS TABLE - RLS POLICIES
-- ================================================================
-- Thêm Row Level Security policies cho bảng deposits
-- Run this in Supabase SQL Editor
-- ================================================================

-- Enable RLS nếu chưa có
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- SELECT POLICY: Cho phép xem deposits liên quan đến user
-- ================================================================

DROP POLICY IF EXISTS "deposits_select_policy" ON public.deposits;

CREATE POLICY "deposits_select_policy"
  ON public.deposits
  FOR SELECT
  USING (
    auth.uid() = owner_id OR 
    auth.uid() = receiver_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ================================================================
-- INSERT POLICY: Cho phép người dùng tạo deposit mới
-- ================================================================

DROP POLICY IF EXISTS "deposits_insert_policy" ON public.deposits;

CREATE POLICY "deposits_insert_policy"
  ON public.deposits
  FOR INSERT
  WITH CHECK (
    -- User phải là receiver (người đặt cọc) hoặc system
    auth.uid() = receiver_id OR
    -- Hoặc là system/function call (cho các RPC functions)
    auth.uid() IS NULL
  );

-- ================================================================
-- UPDATE POLICY: Cho phép cập nhật deposits
-- ================================================================

DROP POLICY IF EXISTS "deposits_update_policy" ON public.deposits;

CREATE POLICY "deposits_update_policy"
  ON public.deposits
  FOR UPDATE
  USING (
    -- Owner có thể cập nhật (xác nhận, từ chối)
    auth.uid() = owner_id OR
    -- Receiver có thể cập nhật (hủy, xác nhận giao)
    auth.uid() = receiver_id OR
    -- Admin có thể cập nhật
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    auth.uid() = owner_id OR
    auth.uid() = receiver_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ================================================================
-- DELETE POLICY: Chỉ admin có thể xóa
-- ================================================================

DROP POLICY IF EXISTS "deposits_delete_policy" ON public.deposits;

CREATE POLICY "deposits_delete_policy"
  ON public.deposits
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ================================================================
-- VERIFICATION: Check policies đã được tạo
-- ================================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'deposits'
ORDER BY policyname;

-- ================================================================
-- DONE!
-- ================================================================
-- ✅ Bây giờ users có thể:
--    - Tạo deposit mới (INSERT) khi họ là receiver
--    - Xem deposits mà họ là owner hoặc receiver (SELECT)
--    - Cập nhật deposits mà họ liên quan (UPDATE)
--    - Chỉ admin mới xóa được (DELETE)
-- ================================================================
