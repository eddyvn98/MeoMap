-- View: Thống kê báo cáo vi phạm của người dùng
-- Tổng hợp số lượng báo cáo đã xử lý và đang chờ xử lý

CREATE VIEW public.user_report_stats AS
SELECT
  target_id AS user_id,
  COUNT(*) FILTER (WHERE status = 'accepted'::text)::integer AS accepted_reports,
  COUNT(*) FILTER (WHERE status = 'pending'::text)::integer AS pending_reports
FROM adoption_reports
GROUP BY target_id;
