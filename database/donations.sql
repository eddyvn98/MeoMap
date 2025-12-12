-- Bảng ghi nhận các quyên góp cho ca cứu hộ
-- Đơn giản, không có approval/voting logic

CREATE TABLE IF NOT EXISTS public.donations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  user_id uuid NULL, -- nullable cho góp ẩn danh
  amount integer NOT NULL, -- số tiền (VND)
  method text NOT NULL CHECK (method IN ('direct', 'system')), -- 'direct' = chuyển thẳng, 'system' = qua hệ thống
  anonymous boolean NOT NULL DEFAULT false, -- true = ẩn danh (không hiển thị tên), false = hiển thị tên
  receipt_url text NULL, -- URL ảnh biên lai (nếu chuyển thẳng)
  note text NULL, -- ghi chú từ người góp
  token text NOT NULL DEFAULT substring(md5(gen_random_uuid()::text) for 6), -- mã tham chiếu 6 ký tự để phân luồng tiền
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT donations_pkey PRIMARY KEY (id),
  CONSTRAINT donations_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.pets(id) ON DELETE CASCADE
);

-- Index để tìm nhanh donation theo case
CREATE INDEX IF NOT EXISTS donations_case_id_idx ON public.donations(case_id);
CREATE INDEX IF NOT EXISTS donations_user_id_idx ON public.donations(user_id);
CREATE INDEX IF NOT EXISTS donations_created_at_idx ON public.donations(created_at DESC);
CREATE INDEX IF NOT EXISTS donations_token_idx ON public.donations(token);

-- ================================================================
-- ENABLE RLS
-- ================================================================
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Policy: Ai cũng có thể xem donations
CREATE POLICY "Anyone can view donations"
  ON public.donations FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert donations
CREATE POLICY "Authenticated users can insert donations"
  ON public.donations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can only update their own donations (update receipt_url, note)
CREATE POLICY "Users can update own donations"
  ON public.donations FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Donations cannot be deleted (for audit trail)
-- No DELETE policy = no one can delete

-- ================================================================
-- Bảng ví cho ca cứu hộ
-- Theo dõi số dư tiền qua hệ thống
-- ================================================================

CREATE TABLE IF NOT EXISTS public.case_wallet (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0, -- số dư (VND)
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT case_wallet_pkey PRIMARY KEY (id),
  CONSTRAINT case_wallet_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.pets(id) ON DELETE CASCADE
);

-- ================================================================
-- ENABLE RLS for case_wallet
-- ================================================================
ALTER TABLE public.case_wallet ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view wallet (for transparency)
CREATE POLICY "Anyone can view case wallet"
  ON public.case_wallet FOR SELECT
  USING (true);

-- Policy: Only case owner can update wallet (withdraw, mark as closed)
-- Actually, system/backend should update this automatically
-- For now, allow system to update (no restriction)
CREATE POLICY "Anyone can update wallet"
  ON public.case_wallet FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Cannot insert/delete wallet directly
-- Wallet is created automatically when pet is created as rescue category
