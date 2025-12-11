-- ============================================================================
-- ADD DEPOSIT & BOUNTY COLUMNS TO PETS TABLE
-- Fix: Chủ bài không có chỗ nhập cọc/bounty khi đăng bài
-- ============================================================================

-- 1. Add required_deposit for adoption posts (mức cọc tối thiểu)
ALTER TABLE public.pets
ADD COLUMN IF NOT EXISTS required_deposit INTEGER DEFAULT NULL;

-- 2. Add bounty_amount for lost/rescue posts (tiền thưởng/hỗ trợ)
ALTER TABLE public.pets
ADD COLUMN IF NOT EXISTS bounty_amount INTEGER DEFAULT NULL;

-- 3. Add allow_custom_deposit flag (cho phép người nhận tự nhập cọc khác)
ALTER TABLE public.pets
ADD COLUMN IF NOT EXISTS allow_custom_deposit BOOLEAN DEFAULT TRUE;

-- Add index for filtering posts with deposits/bounties
CREATE INDEX IF NOT EXISTS idx_pets_required_deposit ON pets(required_deposit) WHERE required_deposit IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pets_bounty_amount ON pets(bounty_amount) WHERE bounty_amount IS NOT NULL;

-- Comments
COMMENT ON COLUMN pets.required_deposit IS 'Mức cọc tối thiểu yêu cầu (adoption). NULL = không yêu cầu cọc';
COMMENT ON COLUMN pets.bounty_amount IS 'Tiền thưởng/hỗ trợ (lost/rescue). NULL = không có thưởng';
COMMENT ON COLUMN pets.allow_custom_deposit IS 'Cho phép người nhận nhập mức cọc khác (true) hay bắt buộc dùng required_deposit (false)';
