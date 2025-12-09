-- ================================================================
-- SQL MIGRATION: THÊM CỘT wallet_used & cash_amount VÀO BẢNG deposits
-- ================================================================
-- Chạy SQL này trong Supabase SQL Editor
-- ================================================================

-- Thêm cột wallet_used (số tiền dùng từ ví)
ALTER TABLE public.deposits 
ADD COLUMN IF NOT EXISTS wallet_used INT4 DEFAULT 0;

-- Thêm cột cash_amount (số tiền cần chuyển khoản)
ALTER TABLE public.deposits 
ADD COLUMN IF NOT EXISTS cash_amount INT4 DEFAULT 0;

-- Cập nhật giá trị mặc định cho các deposit cũ (cash_amount = amount)
UPDATE public.deposits 
SET cash_amount = amount 
WHERE cash_amount = 0 AND amount > 0;

-- Thêm comment để dễ hiểu
COMMENT ON COLUMN public.deposits.wallet_used IS 'Số tiền đã dùng từ ví của người nhận';
COMMENT ON COLUMN public.deposits.cash_amount IS 'Số tiền cần chuyển khoản qua ngân hàng';

-- ================================================================
-- TEST QUERY
-- ================================================================
-- Kiểm tra cột đã được thêm:
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'deposits' 
  AND column_name IN ('wallet_used', 'cash_amount');

-- ================================================================
-- ROLLBACK (nếu cần xoá)
-- ================================================================
-- ALTER TABLE public.deposits DROP COLUMN IF EXISTS wallet_used;
-- ALTER TABLE public.deposits DROP COLUMN IF EXISTS cash_amount;
-- ================================================================
