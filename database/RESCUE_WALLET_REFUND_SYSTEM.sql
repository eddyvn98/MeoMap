-- ================================================================
-- HỆ THỐNG HOÀN TIỀN VÍ KHI KHÔNG CÓ NGƯỜI NHẬN CA CỨU HỘ
-- ================================================================
-- ⚠️ LƯU Ý: user_wallet và case_wallet đã tồn tại, không cần tạo lại
-- Chỉ tạo bảng refund_transactions và trigger hoàn tiền

-- Xoá bảng refund_transactions cũ nếu có (để tránh lỗi khi chạy lại script)
-- Phải xoá trigger trước, sau đó xoá function, rồi xoá table
DROP TRIGGER IF EXISTS refund_on_case_closed ON public.pets CASCADE;
DROP FUNCTION IF EXISTS public.refund_donations_if_no_rescuer() CASCADE;
DROP TABLE IF EXISTS public.refund_transactions CASCADE;

-- Bảng lưu trữ các giao dịch hoàn tiền (refund transactions) - MỚI
CREATE TABLE public.refund_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL, -- số tiền hoàn lại (VND)
  reason text DEFAULT 'Không có người nhận ca cứu hộ', -- lý do hoàn tiền
  refunded_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT refund_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT refund_transactions_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.pets(id) ON DELETE CASCADE,
  CONSTRAINT refund_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS refund_transactions_case_id_idx ON public.refund_transactions(case_id);
CREATE INDEX IF NOT EXISTS refund_transactions_user_id_idx ON public.refund_transactions(user_id);
CREATE INDEX IF NOT EXISTS refund_transactions_refunded_at_idx ON public.refund_transactions(refunded_at DESC);

-- Enable RLS
ALTER TABLE public.refund_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view refunds
CREATE POLICY "Anyone can view refund transactions"
  ON public.refund_transactions FOR SELECT
  USING (true);

-- Policy: Only system/backend can insert refunds
CREATE POLICY "System can insert refund transactions"
  ON public.refund_transactions FOR INSERT
  WITH CHECK (true);

-- ================================================================
-- TRIGGER: Tự động hoàn tiền khi case được đóng mà không có rescuer
-- ================================================================

-- Function để xử lý hoàn tiền
CREATE OR REPLACE FUNCTION public.refund_donations_if_no_rescuer()
RETURNS TRIGGER AS $$
BEGIN
  -- Nếu case đang bị đóng (completed_at được set) và không có rescuer
  -- thì hoàn tiền từ case_wallet về ví của những người đã đóng góp
  
  IF NEW.completed_at IS NOT NULL AND NEW.rescuer_id IS NULL THEN
    -- Lấy tất cả những quyên góp "qua hệ thống"
    WITH donations_to_refund AS (
      SELECT 
        d.id,
        d.user_id,
        d.amount,
        d.case_id
      FROM public.donations d
      WHERE d.case_id = NEW.id
        AND d.method = 'system'
        AND d.user_id IS NOT NULL
    )
    -- Cộng tiền vào ví người dùng
    UPDATE public.user_wallet 
    SET balance = balance + (
      SELECT COALESCE(SUM(amount), 0)
      FROM donations_to_refund
      WHERE user_id = public.user_wallet.user_id
    )
    WHERE user_id IN (SELECT DISTINCT user_id FROM donations_to_refund);
    
    -- Ghi nhận các giao dịch hoàn tiền
    INSERT INTO public.refund_transactions (case_id, user_id, amount, reason)
    SELECT 
      d.case_id,
      d.user_id,
      d.amount,
      'Không có người nhận ca cứu hộ - hoàn tiền'
    FROM public.donations d
    WHERE d.case_id = NEW.id
      AND d.method = 'system'
      AND d.user_id IS NOT NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tạo trigger trên bảng pets
CREATE TRIGGER refund_on_case_closed
AFTER UPDATE ON public.pets
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION public.refund_donations_if_no_rescuer();

-- ================================================================
-- GRANT PERMISSIONS
-- ================================================================
GRANT SELECT, INSERT ON public.refund_transactions TO authenticated;
