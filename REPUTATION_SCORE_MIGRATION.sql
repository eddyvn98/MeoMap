-- ================================================================
-- SQL MIGRATION: TẠO VIEW USER_REPUTATION_SCORE
-- ================================================================
-- Mục đích: Tính điểm uy tín dựa trên số lần OK và Không OK
-- Công thức: ok_trades * 10 - bad_trades * 20
-- ================================================================

-- Bước 1: Tạo hoặc thay thế view user_reputation_score
CREATE OR REPLACE VIEW public.user_reputation_score AS
SELECT 
  target_id AS user_id,
  (
    COUNT(*) FILTER (WHERE score = 1) * 10 
    - COUNT(*) FILTER (WHERE score = 0) * 20
  ) AS reputation_score
FROM public.adoption_ratings
GROUP BY target_id;

-- Bước 2: Cấp quyền đọc cho authenticated users
GRANT SELECT ON public.user_reputation_score TO authenticated;
GRANT SELECT ON public.user_reputation_score TO anon;

-- ================================================================
-- GIẢI THÍCH CÔNG THỨC ĐIỂM UY TÍN
-- ================================================================
-- Điểm cơ bản:
-- - Mỗi lần OK (score = 1): +10 điểm
-- - Mỗi lần Không OK (score = 0): -20 điểm
--
-- Ví dụ:
-- - 5 OK, 0 Không OK → 50 điểm (5 sao)
-- - 4 OK, 1 Không OK → 20 điểm (4 sao)
-- - 3 OK, 2 Không OK → -10 điểm (1 sao)
-- - 2 OK, 3 Không OK → -40 điểm (1 sao)
--
-- Cách quy đổi sao (trong code frontend):
-- - >= 40 điểm: ⭐⭐⭐⭐⭐ (5 sao)
-- - >= 20 điểm: ⭐⭐⭐⭐ (4 sao)
-- - >= 10 điểm: ⭐⭐⭐ (3 sao)
-- - >= 0 điểm:  ⭐⭐ (2 sao)
-- - < 0 điểm:   ⭐ (1 sao)
-- ================================================================

-- ================================================================
-- TEST QUERY
-- ================================================================
-- Chạy query này để test xem view đã hoạt động chưa:
SELECT 
  user_id,
  reputation_score
FROM public.user_reputation_score
ORDER BY reputation_score DESC
LIMIT 10;

-- ================================================================
-- ROLLBACK (nếu cần xoá view)
-- ================================================================
-- DROP VIEW IF EXISTS public.user_reputation_score;
-- ================================================================
