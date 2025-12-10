-- =====================================================
-- 🎯 FINAL CLEANUP: CHỈ GIỮ SQL CẦN THIẾT CHO ADOPTION
-- =====================================================
--
-- Quy tắc:
-- ✅ GIỮ: profiles, pets, deposits, wallet_transactions
-- ❌ XÓA: adoption_requests, adoptions, adoption_ratings, 
--         adoption_feedback, adoption_emails, adoption_tickets,
--         adoption_reports, adoption_feedback, adoption_activities
-- ❓ GIỮI (ADVANCED): adoption_checkins (nếu muốn check-in sau 30 ngày)
--

-- =====================================================
-- PHẦN 1: XÓA CÁC BẢNG HOÀN TOÀN DỰA THỪA
-- =====================================================

-- Xóa adoption_requests - DÙNG deposits THAY
DROP TABLE IF EXISTS public.adoption_requests CASCADE;
DROP TABLE IF EXISTS public.adoption_activities CASCADE;

-- Xóa adoptions - DÙNG deposits.status='confirmed' THAY
DROP TABLE IF EXISTS public.adoptions CASCADE;

-- Xóa adoption_ratings - DÙNG deposits.owner_rating THAY
DROP TABLE IF EXISTS public.adoption_ratings CASCADE;

-- Xóa adoption_feedback - DÙNG deposits.owner_rating THAY
DROP TABLE IF EXISTS public.adoption_feedback CASCADE;

-- Xóa adoption_emails - KHÔNG CẦN TRONG Qktcs
DROP TABLE IF EXISTS public.adoption_emails CASCADE;

-- Xóa adoption_tickets - KHÔNG CẦN TRONG QKTCS
DROP TABLE IF EXISTS public.adoption_tickets CASCADE;

-- Xóa adoption_reports - KHÔNG CẦN TRONG QKTCS
DROP TABLE IF EXISTS public.adoption_reports CASCADE;

-- =====================================================
-- PHẦN 2: GIỮ adoption_checkins (NẾU CẦN CHECK-IN)
-- =====================================================

-- ⚠️ CHƯA XÓA adoption_checkins
-- 
-- Nếu muốn check-in người nhận nuôi sau 1, 7, 14, 30 ngày:
-- GIỮ adoption_checkins
--
-- Nếu không muốn check-in (quy trình đơn giản hóa):
-- XÓA: DROP TABLE IF EXISTS public.adoption_checkins CASCADE;

-- CHỌN: Để tôi xóa adoption_checkins luôn (đơn giản hóa tối đa)
DROP TABLE IF EXISTS public.adoption_checkins CASCADE;

-- =====================================================
-- PHẦN 3: KIỂM TRA CÁC BẢNG CÒN LẠI
-- =====================================================

-- Bảng CÒN DÙNG CHO ADOPTION FLOW:

-- 1. profiles - Thông tin user
--    Cột mới: user_qr_id (để scan QR)

-- 2. pets - Thông tin mèo
--    Cột status: available, reserved, delivered, ...

-- 3. deposits - TRUNG TÂM CỦA TOÀN BỘ ADOPTION FLOW
--    Cột chính:
--    - pet_id, receiver_id (người nhận), owner_id (chủ)
--    - amount (tiền cọc)
--    - status: pending, confirmed, cancelled, refunded
--    - confirmed_at (thời điểm xác nhận giao)
--    - owner_rating (đánh giá: good, bad, neutral)
--    - created_at, updated_at

-- 4. wallet_transactions - Lịch sử ví tiền
--    Liên kết: deposit_id

-- Bảng KHÁC (không dùng adoption):
-- - donations (từ thiện riêng)
-- - bounties (thưởng riêng)
-- - user_reputation, user_report_stats (view thống kê)

-- =====================================================
-- PHẦN 4: VERIFY SCHEMA MỚI
-- =====================================================

-- Xem tất cả bảng còn lại
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- =====================================================
-- ✅ HOÀN TẤT!
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FINAL CLEANUP HOÀN TẤT!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '❌ ĐÃ XÓA 9 BẢNG DỰA THỪA:';
  RAISE NOTICE '   • adoption_requests (cũ)';
  RAISE NOTICE '   • adoption_activities (audit log)';
  RAISE NOTICE '   • adoptions (lịch sử)';
  RAISE NOTICE '   • adoption_ratings (trùng rating)';
  RAISE NOTICE '   • adoption_feedback (trùng feedback)';
  RAISE NOTICE '   • adoption_emails (không dùng)';
  RAISE NOTICE '   • adoption_tickets (không dùng)';
  RAISE NOTICE '   • adoption_reports (không dùng)';
  RAISE NOTICE '   • adoption_checkins (check-in)';
  RAISE NOTICE '';
  RAISE NOTICE '✅ GIỮ LẠI 4 BẢNG CHÍNH:';
  RAISE NOTICE '   • profiles (user info + user_qr_id)';
  RAISE NOTICE '   • pets (pet info)';
  RAISE NOTICE '   • deposits (ADOPTION FLOW)';
  RAISE NOTICE '   • wallet_transactions (history)';
  RAISE NOTICE '';
  RAISE NOTICE '📊 DEPOSITS = TRUNG TÂM:';
  RAISE NOTICE '   ✅ 2 functions: confirm_delivery_by_qr(), rate_delivery()';
  RAISE NOTICE '   ✅ 1 view: user_reputation_stats';
  RAISE NOTICE '   ✅ 3 status: pending, confirmed, cancelled/refunded';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 WORKFLOW CUỐI CÙNG:';
  RAISE NOTICE '   1. User tạo deposit (pending)';
  RAISE NOTICE '   2. Owner duyệt (deposit vẫn pending)';
  RAISE NOTICE '   3. Receiver quét QR → confirm_delivery_by_qr()';
  RAISE NOTICE '   4. Owner đánh giá → rate_delivery()';
  RAISE NOTICE '   5. Done! (deposits.status=confirmed, owner_rating=good/bad)';
  RAISE NOTICE '========================================';
END $$;
