-- ================================================================
-- SQL MIGRATION: TẠO BẢNG ADOPTION_REPORTS (TỐ CÁO HÀNH VI XẤU)
-- ================================================================
-- Bạn cần chạy SQL này trong Supabase SQL Editor
-- ================================================================

-- Bước 1: Tạo bảng adoption_reports
CREATE TABLE IF NOT EXISTS public.adoption_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tham chiếu
  deposit_id UUID NOT NULL REFERENCES public.deposits(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  
  -- Người báo cáo và người bị báo cáo
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Nội dung báo cáo
  reason_category TEXT NOT NULL, -- 'no_show', 'late', 'rude', 'fraud', 'other'
  reason_detail TEXT, -- Chi tiết vấn đề
  
  -- Trạng thái xử lý
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  
  -- Thời gian
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  handled_at TIMESTAMPTZ, -- Khi admin xử lý xong
  
  -- Audit
  handled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  CONSTRAINT reason_category_check CHECK (reason_category IN ('no_show', 'late', 'rude', 'fraud', 'other')),
  CONSTRAINT status_check CHECK (status IN ('pending', 'accepted', 'rejected'))
);

-- Bước 2: Tạo indexes
CREATE INDEX idx_adoption_reports_status ON public.adoption_reports(status);
CREATE INDEX idx_adoption_reports_deposit_id ON public.adoption_reports(deposit_id);
CREATE INDEX idx_adoption_reports_target_id ON public.adoption_reports(target_id);
CREATE INDEX idx_adoption_reports_reporter_id ON public.adoption_reports(reporter_id);

-- Bước 3: Cấp quyền RLS
ALTER TABLE public.adoption_reports ENABLE ROW LEVEL SECURITY;

-- Policy 1: Bất kỳ user nào cũng có thể xem báo cáo liên quan đến mình
CREATE POLICY adoption_reports_view_own ON public.adoption_reports
  FOR SELECT
  USING (
    auth.uid() = reporter_id 
    OR auth.uid() = target_id 
    OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Policy 2: User có thể tạo báo cáo cho bất kỳ giao dịch nào (backend sẽ validate)
CREATE POLICY adoption_reports_insert ON public.adoption_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Policy 3: Chỉ admin mới có thể update
CREATE POLICY adoption_reports_update_admin ON public.adoption_reports
  FOR UPDATE
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Bước 4: Cấp quyền trực tiếp
GRANT SELECT ON public.adoption_reports TO authenticated;
GRANT INSERT ON public.adoption_reports TO authenticated;
GRANT UPDATE ON public.adoption_reports TO authenticated;

-- ================================================================
-- TEST QUERY
-- ================================================================
-- Kiểm tra xem bảng đã được tạo chưa:
SELECT * FROM public.adoption_reports LIMIT 1;

-- ================================================================
-- ROLLBACK (nếu cần xoá)
-- ================================================================
-- DROP TABLE IF EXISTS public.adoption_reports;
-- ================================================================
