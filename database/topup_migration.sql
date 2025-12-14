-- ================================================================
-- BẢNG TOPUP_REQUESTS: Lịch sử nạp tiền vào ví
-- ================================================================

CREATE TABLE IF NOT EXISTS public.topup_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Payment info
  amount INTEGER NOT NULL, -- Số tiền nạp (VND)
  payment_method TEXT DEFAULT 'payos', -- 'payos', 'vnpay', 'manual'
  
  -- PayOS transaction info
  order_code TEXT UNIQUE, -- Mã đơn hàng ngắn: TU123456
  payment_link_id TEXT, -- ID payment link từ PayOS (nếu có)
  checkout_url TEXT, -- URL thanh toán (nếu có)
  qr_code TEXT, -- Base64 QR code từ PayOS (nếu có)
  qr_code_url TEXT, -- URL QR code VietQR (chứa STK + amount + order_code)
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'success', 'cancelled', 'failed'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE, -- Khi user thanh toán xong
  confirmed_at TIMESTAMP WITH TIME ZONE, -- Khi webhook xác nhận
  cancelled_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Transaction tracking
  transaction_id TEXT, -- ID giao dịch từ PayOS webhook
  payment_description TEXT, -- Mô tả từ PayOS
  
  -- Metadata
  notes TEXT,
  metadata JSONB, -- Lưu thêm thông tin (IP, device, etc)
  
  CONSTRAINT topup_requests_pkey PRIMARY KEY (id),
  CONSTRAINT topup_requests_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ADD MISSING COLUMNS if they don't exist
ALTER TABLE public.topup_requests ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
ALTER TABLE public.topup_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

CREATE INDEX IF NOT EXISTS topup_requests_user_id_idx ON public.topup_requests(user_id);
CREATE INDEX IF NOT EXISTS topup_requests_status_idx ON public.topup_requests(status);
CREATE INDEX IF NOT EXISTS topup_requests_order_code_idx ON public.topup_requests(order_code);
CREATE INDEX IF NOT EXISTS topup_requests_created_at_idx ON public.topup_requests(created_at DESC);

-- ================================================================
-- RLS POLICIES
-- ================================================================

ALTER TABLE public.topup_requests ENABLE ROW LEVEL SECURITY;

-- Xóa policies cũ nếu đã tồn tại
DROP POLICY IF EXISTS "Topup: Users See Own" ON public.topup_requests;
DROP POLICY IF EXISTS "Topup: Users Can Insert" ON public.topup_requests;
DROP POLICY IF EXISTS "Topup: Users Can Update Own" ON public.topup_requests;

-- Users can see their own topup requests
CREATE POLICY "Topup: Users See Own"
  ON public.topup_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create topup requests
CREATE POLICY "Topup: Users Can Insert"
  ON public.topup_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own topup requests (for cancellation)
CREATE POLICY "Topup: Users Can Update Own"
  ON public.topup_requests
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ================================================================
-- FUNCTION: Generate unique order code
-- ================================================================

CREATE OR REPLACE FUNCTION public.generate_topup_order_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_date TEXT;
  v_random TEXT;
  v_order_code TEXT;
  v_exists BOOLEAN;
BEGIN
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  LOOP
    -- Generate random 6-digit number
    v_random := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    v_order_code := 'TOPUP-' || v_date || '-' || v_random;
    
    -- Check if exists
    SELECT EXISTS(
      SELECT 1 FROM public.topup_requests WHERE order_code = v_order_code
    ) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  RETURN v_order_code;
END;
$$;
