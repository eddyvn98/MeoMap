-- ================================================================
-- BẢNG VOUCHERS: Quản lý voucher trong hệ thống
-- ================================================================

-- Bảng vouchers (mã voucher)
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL, -- Giá trị voucher
  description TEXT,
  category TEXT DEFAULT 'deposit', -- 'deposit', 'service', 'item', etc
  created_by UUID, -- Người tạo (admin hoặc system)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT vouchers_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS vouchers_code_idx ON public.vouchers(code);
CREATE INDEX IF NOT EXISTS vouchers_category_idx ON public.vouchers(category);

-- ================================================================
-- BẢNG USER_VOUCHERS: Voucher của từng user
-- ================================================================

CREATE TABLE IF NOT EXISTS public.user_vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  voucher_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'used', 'expired', 'revoked'
  acquired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL = không hết hạn
  source_type TEXT, -- 'conversion_deposit', 'conversion_bounty', 'reward', 'purchase'
  source_id UUID, -- ID liên quan (conversion record, etc)
  notes TEXT,
  CONSTRAINT user_vouchers_pkey PRIMARY KEY (id),
  CONSTRAINT user_vouchers_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_vouchers_voucher_id_fkey FOREIGN KEY (voucher_id) 
    REFERENCES public.vouchers(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS user_vouchers_user_id_idx ON public.user_vouchers(user_id);
CREATE INDEX IF NOT EXISTS user_vouchers_status_idx ON public.user_vouchers(status);
CREATE INDEX IF NOT EXISTS user_vouchers_user_status_idx ON public.user_vouchers(user_id, status);

-- ================================================================
-- BẢNG VOUCHER_CONVERSIONS: Lịch sử quy đổi tiền cọc/thưởng thành voucher
-- ================================================================

CREATE TABLE IF NOT EXISTS public.voucher_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- Số tiền quy đổi
  source_type TEXT NOT NULL, -- 'balance_coc', 'balance_thuong'
  user_voucher_id UUID, -- FK đến user_vouchers
  converted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  CONSTRAINT voucher_conversions_pkey PRIMARY KEY (id),
  CONSTRAINT voucher_conversions_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT voucher_conversions_user_voucher_id_fkey FOREIGN KEY (user_voucher_id) 
    REFERENCES public.user_vouchers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS voucher_conversions_user_id_idx ON public.voucher_conversions(user_id);
CREATE INDEX IF NOT EXISTS voucher_conversions_source_type_idx ON public.voucher_conversions(source_type);

-- ================================================================
-- RLS POLICIES
-- ================================================================

-- Enable RLS
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_conversions ENABLE ROW LEVEL SECURITY;

-- Vouchers: Public read
CREATE POLICY "Vouchers: Public Read"
  ON public.vouchers
  FOR SELECT
  USING (true);

-- User_vouchers: Users can see their own
CREATE POLICY "User_vouchers: Users See Own"
  ON public.user_vouchers
  FOR SELECT
  USING (auth.uid() = user_id);

-- Voucher_conversions: Users can see their own
CREATE POLICY "Voucher_conversions: Users See Own"
  ON public.voucher_conversions
  FOR SELECT
  USING (auth.uid() = user_id);

-- ================================================================
-- SAMPLE DATA (Optional)
-- ================================================================

-- INSERT INTO public.vouchers (code, amount, description, category) VALUES
-- ('VOUCHER_50K', 50000, 'Voucher 50k', 'deposit'),
-- ('VOUCHER_100K', 100000, 'Voucher 100k', 'deposit'),
-- ('VOUCHER_200K', 200000, 'Voucher 200k', 'deposit');
