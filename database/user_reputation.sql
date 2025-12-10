-- View: Thống kê uy tín của người dùng
-- Nguồn dữ liệu: deposits (owner_rating)

CREATE OR REPLACE VIEW public.user_reputation AS
SELECT 
  receiver_id AS user_id,
  COUNT(*)::integer AS total_trades,
  COUNT(*) FILTER (WHERE owner_rating = 'good')::integer AS ok_trades,
  COUNT(*) FILTER (WHERE owner_rating = 'bad')::integer AS bad_trades
FROM public.deposits
WHERE confirmed_at IS NOT NULL
GROUP BY receiver_id;
