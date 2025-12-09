-- ================================================================
-- QUICK SETUP: CHẠY TẤT CẢ SQL TRONG SUPABASE SQL EDITOR
-- ================================================================
-- Copy toàn bộ nội dung file này và paste vào Supabase SQL Editor
-- Bấm RUN để tạo view user_reputation_score
-- ================================================================

-- Tạo view tính điểm uy tín
CREATE OR REPLACE VIEW public.user_reputation_score AS
SELECT 
  target_id AS user_id,
  (
    COUNT(*) FILTER (WHERE score = 1) * 10 
    - COUNT(*) FILTER (WHERE score = 0) * 20
  ) AS reputation_score
FROM public.adoption_ratings
GROUP BY target_id;

-- Cấp quyền truy cập
GRANT SELECT ON public.user_reputation_score TO authenticated;
GRANT SELECT ON public.user_reputation_score TO anon;

-- ================================================================
-- TEST: Kiểm tra xem view đã hoạt động chưa
-- ================================================================
SELECT 
  user_id,
  reputation_score
FROM public.user_reputation_score
ORDER BY reputation_score DESC
LIMIT 5;

-- ================================================================
-- KẾT QUẢ MONG ĐỢI
-- ================================================================
-- Nếu thành công, bạn sẽ thấy danh sách user_id với reputation_score
-- Nếu chưa có đánh giá nào, kết quả sẽ trống (đây là bình thường)
-- ================================================================
