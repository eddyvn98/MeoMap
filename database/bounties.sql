-- Bảng TIỀN TREO THƯỞNG / HỖ TRỢ BAN ĐẦU
-- Mục đích: Thu hút người cứu, tạo động lực ban đầu
-- Đặc điểm: Người cứu có quyền nhận hoặc từ chối
--           Nếu từ chối hoặc không ai cứu → hoàn lại donor

CREATE TABLE IF NOT EXISTS public.bounties (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  user_id uuid NULL, -- nullable cho treo thưởng ẩn danh
  amount integer NOT NULL, -- số tiền (VND)
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'accepted', 'rejected', 'refunded', 'transferred')),
  token text NOT NULL DEFAULT substring(md5(gen_random_uuid()::text) for 6), -- mã tham chiếu 6 ký tự để phân biệt khoản treo thưởng
  -- available: đang treo, chưa ai nhận
  -- accepted: người cứu đã nhận
  -- rejected: người cứu từ chối
  -- refunded: trả lại cho donor
  -- transferred: đã chuyển cho người cứu khi kết thúc ca
  reason text NULL, -- ghi chú khi từ chối/hoàn lại
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT bounties_pkey PRIMARY KEY (id),
  CONSTRAINT bounties_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.pets(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX IF NOT EXISTS bounties_case_id_idx ON public.bounties(case_id);
CREATE INDEX IF NOT EXISTS bounties_user_id_idx ON public.bounties(user_id);
CREATE INDEX IF NOT EXISTS bounties_status_idx ON public.bounties(status);
CREATE INDEX IF NOT EXISTS bounties_created_at_idx ON public.bounties(created_at DESC);
CREATE INDEX IF NOT EXISTS bounties_token_idx ON public.bounties(token);

-- ================================================================
-- ENABLE RLS
-- ================================================================
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;

-- Policy: Ai cũng có thể xem bounties
CREATE POLICY "Anyone can view bounties"
  ON public.bounties FOR SELECT
  USING (true);

-- Policy: Authenticated users can create bounties
CREATE POLICY "Authenticated users can create bounties"
  ON public.bounties FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can update their own bounties (change status)
CREATE POLICY "Users can update own bounties"
  ON public.bounties FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Case owner (rescuer) can accept/reject bounties
-- This needs to be handled in the application layer
-- For now, allow updates from anyone (backend logic will validate)

-- Cannot delete bounties (audit trail)
-- No DELETE policy = no one can delete
