-- Table: rescue_appeals
-- Lưu trữ lời kêu gọi ủng hộ từ những người cứu hộ

CREATE TABLE IF NOT EXISTS rescue_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  rescuer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  requested_budget INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active', -- active, closed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rescue_appeals_case_id ON rescue_appeals(case_id);
CREATE INDEX idx_rescue_appeals_rescuer_id ON rescue_appeals(rescuer_id);

-- Table: rescue_updates
-- Lưu trữ cập nhật tình hình ca cứu hộ (ảnh, video, chi phí, v.v.)

CREATE TABLE IF NOT EXISTS rescue_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  rescuer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  spent_cost INTEGER DEFAULT 0, -- chi phí tạm ứng
  image_urls TEXT[] DEFAULT '{}', -- mảng URL ảnh
  video_urls TEXT[] DEFAULT '{}', -- mảng URL video
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rescue_updates_case_id ON rescue_updates(case_id);
CREATE INDEX idx_rescue_updates_rescuer_id ON rescue_updates(rescuer_id);

-- Cập nhật bảng pets thêm các cột liên quan đến ca cứu hộ (nếu chưa có)

ALTER TABLE pets ADD COLUMN IF NOT EXISTS rescuer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS completion_notes TEXT;
ALTER TABLE pets ADD COLUMN IF NOT EXISTS completion_images TEXT[];

CREATE INDEX idx_pets_rescuer_id ON pets(rescuer_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON rescue_appeals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rescue_updates TO authenticated;
