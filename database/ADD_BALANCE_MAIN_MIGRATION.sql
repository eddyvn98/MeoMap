-- ============================================================
-- MIGRATION: Add balance_main column
-- ============================================================
-- Mục đích: Tách riêng 3 loại ví:
--   1. balance_main   - Ví chính (nạp/rút tự do, mua hàng, cọc)
--   2. balance_coc    - Ví cọc (chỉ nhận hoàn cọc, quy đổi voucher, KHÔNG rút)
--   3. balance_thuong - Ví thưởng (rescue/lost, có thể rút/mua hàng)
-- ============================================================

-- 1. Thêm cột balance_main vào bảng profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS balance_main INTEGER DEFAULT 0 CHECK (balance_main >= 0);

-- 2. Comment để làm rõ ý nghĩa các cột
COMMENT ON COLUMN public.profiles.balance_main IS 'Ví chính - nạp/rút tự do, dùng mua hàng và cọc';
COMMENT ON COLUMN public.profiles.balance_coc IS 'Ví cọc - chỉ nhận hoàn cọc, quy đổi voucher, KHÔNG rút được';
COMMENT ON COLUMN public.profiles.balance_thuong IS 'Ví thưởng - từ rescue/lost, có thể rút hoặc mua hàng';

-- 3. Migrate existing balance_coc sang balance_main
-- (Giả định: tiền hiện tại trong balance_coc là từ nạp tiền, nên chuyển sang main)
UPDATE public.profiles
SET balance_main = balance_coc,
    balance_coc = 0
WHERE balance_coc > 0;

-- 4. Index cho performance
CREATE INDEX IF NOT EXISTS idx_profiles_balance_main ON public.profiles(balance_main);

-- 5. Verification
SELECT 
  COUNT(*) as total_users,
  SUM(balance_main) as total_balance_main,
  SUM(balance_coc) as total_balance_coc,
  SUM(balance_thuong) as total_balance_thuong
FROM public.profiles;
