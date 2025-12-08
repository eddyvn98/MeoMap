-- ===============================================
-- MIGRATION: ADOPTION REQUESTS SYSTEM
-- ===============================================
-- Tạo bảng adoption_requests để quản lý yêu cầu nhận mèo
-- Flow: Liên hệ → Owner chấp nhận → Xác nhận gặp → Sinh mã → Giao mèo

-- Drop old table if exists
DROP TABLE IF EXISTS public.adoption_requests CASCADE;

-- Bảng chính: adoption_requests
CREATE TABLE IF NOT EXISTS public.adoption_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Status workflow
  -- 'pending'         → Chờ owner chấp nhận
  -- 'accepted'        → Owner đã chấp nhận
  -- 'rejected'        → Owner từ chối
  -- 'ready_to_deliver'→ Cả 2 confirm gặp, đã có token
  -- 'delivered'       → Đã giao mèo
  -- 'cancelled'       → Hủy giữa chừng
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'ready_to_deliver', 'delivered', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Xác nhận gặp mặt (cả 2 phải confirm)
  receiver_confirmed_meet BOOLEAN DEFAULT false,
  receiver_confirmed_at TIMESTAMPTZ,
  owner_confirmed_meet BOOLEAN DEFAULT false,
  owner_confirmed_at TIMESTAMPTZ,
  
  -- Delivery token (sinh sau khi cả 2 confirm gặp)
  delivery_token TEXT UNIQUE,
  token_generated_at TIMESTAMPTZ,
  
  -- Delivery completion
  delivered_at TIMESTAMPTZ,
  delivery_confirmed_by UUID REFERENCES public.profiles(id),
  
  -- Constraints
  CONSTRAINT unique_pet_requester UNIQUE(pet_id, requester_id),
  CONSTRAINT valid_token_length CHECK (delivery_token IS NULL OR length(delivery_token) >= 6)
);

-- Indexes for performance
CREATE INDEX idx_adoption_requests_pet_id ON public.adoption_requests(pet_id);
CREATE INDEX idx_adoption_requests_requester_id ON public.adoption_requests(requester_id);
CREATE INDEX idx_adoption_requests_owner_id ON public.adoption_requests(owner_id);
CREATE INDEX idx_adoption_requests_status ON public.adoption_requests(status);
CREATE INDEX idx_adoption_requests_delivery_token ON public.adoption_requests(delivery_token) WHERE delivery_token IS NOT NULL;
CREATE INDEX idx_adoption_requests_created_at ON public.adoption_requests(created_at DESC);

-- Comments
COMMENT ON TABLE public.adoption_requests IS 'Quản lý yêu cầu nhận mèo từ người dùng';
COMMENT ON COLUMN public.adoption_requests.status IS 'Trạng thái: pending → accepted → ready_to_deliver → delivered';
COMMENT ON COLUMN public.adoption_requests.delivery_token IS 'Mã 6-8 ký tự để xác nhận giao mèo (QR code)';
COMMENT ON COLUMN public.adoption_requests.receiver_confirmed_meet IS 'Người nhận xác nhận đã hẹn gặp';
COMMENT ON COLUMN public.adoption_requests.owner_confirmed_meet IS 'Chủ bài xác nhận đã hẹn gặp';

-- ===============================================
-- ROW LEVEL SECURITY (RLS)
-- ===============================================

ALTER TABLE public.adoption_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to view
DROP POLICY IF EXISTS "Users can view related requests" ON public.adoption_requests;
CREATE POLICY "allow_all_select"
  ON public.adoption_requests FOR SELECT
  USING (true);

-- Policy: Allow all authenticated users to insert
DROP POLICY IF EXISTS "Users can create requests" ON public.adoption_requests;
CREATE POLICY "allow_all_insert"
  ON public.adoption_requests FOR INSERT
  WITH CHECK (true);

-- Policy: Allow all authenticated users to update
DROP POLICY IF EXISTS "Users can update own requests" ON public.adoption_requests;
CREATE POLICY "allow_all_update"
  ON public.adoption_requests FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Allow all authenticated users to delete
DROP POLICY IF EXISTS "Owners can delete requests" ON public.adoption_requests;
CREATE POLICY "allow_all_delete"
  ON public.adoption_requests FOR DELETE
  USING (true);

-- ===============================================
-- HELPER FUNCTIONS
-- ===============================================

-- Function: Generate random delivery token
CREATE OR REPLACE FUNCTION generate_delivery_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists_count INTEGER;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric token
    token := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if token already exists
    SELECT COUNT(*) INTO exists_count 
    FROM public.adoption_requests 
    WHERE delivery_token = token;
    
    EXIT WHEN exists_count = 0;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-generate token when both confirm meet
CREATE OR REPLACE FUNCTION auto_generate_delivery_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Nếu cả 2 đã confirm gặp và chưa có token
  IF NEW.receiver_confirmed_meet = true 
     AND NEW.owner_confirmed_meet = true 
     AND NEW.delivery_token IS NULL 
     AND NEW.status = 'accepted' THEN
    
    -- Generate token và update status
    NEW.delivery_token := generate_delivery_token();
    NEW.token_generated_at := NOW();
    NEW.status := 'ready_to_deliver';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-generate token
DROP TRIGGER IF EXISTS trigger_auto_generate_delivery_token ON public.adoption_requests;
CREATE TRIGGER trigger_auto_generate_delivery_token
  BEFORE UPDATE ON public.adoption_requests
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_delivery_token();

-- ===============================================
-- UPDATE PETS TABLE
-- ===============================================

-- Update existing statuses to valid values
UPDATE public.pets 
SET status = 'available' 
WHERE status NOT IN ('available', 'in_contact', 'delivered', 'cancelled', 'pending', 'confirmed');

-- Thêm status 'in_contact' cho pets
ALTER TABLE public.pets DROP CONSTRAINT IF EXISTS pets_status_check;
ALTER TABLE public.pets ADD CONSTRAINT pets_status_check 
  CHECK (status IN ('available', 'in_contact', 'delivered', 'cancelled', 'pending', 'confirmed'));

-- Comment
COMMENT ON CONSTRAINT pets_status_check ON public.pets IS 'Status flow: available → in_contact → delivered/cancelled';

-- ===============================================
-- TEST DATA (Optional - Remove in production)
-- ===============================================

-- Test: Tạo 1 request mẫu (uncomment nếu cần test)
/*
INSERT INTO public.adoption_requests (pet_id, requester_id, owner_id, status)
VALUES (
  'your-pet-id-here',
  'requester-user-id',
  'owner-user-id',
  'pending'
);
*/

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

-- Check table created
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'adoption_requests' 
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'adoption_requests';

-- Check policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'adoption_requests';

-- Check functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%delivery_token%';

-- ===============================================
-- ROLLBACK (If needed)
-- ===============================================

/*
DROP TRIGGER IF EXISTS trigger_auto_generate_delivery_token ON public.adoption_requests;
DROP FUNCTION IF EXISTS auto_generate_delivery_token();
DROP FUNCTION IF EXISTS generate_delivery_token();
DROP TABLE IF EXISTS public.adoption_requests CASCADE;
*/
