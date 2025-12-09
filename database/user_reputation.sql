-- View: Thống kê uy tín của người dùng
-- Tổng hợp số lượng giao dịch và đánh giá tốt/xấu

CREATE VIEW public.user_reputation AS
SELECT
  target_id AS user_id,
  COUNT(*)::integer AS total_trades,
  COUNT(*) FILTER (WHERE score = 1)::integer AS ok_trades,
  COUNT(*) FILTER (WHERE score = 0)::integer AS bad_trades
FROM adoption_ratings
GROUP BY target_id;
