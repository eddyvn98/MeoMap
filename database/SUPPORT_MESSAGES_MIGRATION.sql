-- ================================================================
-- HỆ THỐNG LỜI CẢM ƠN / ĐỘNG VIÊN (SUPPORT MESSAGES)
-- ================================================================

-- Xoá bảng cũ nếu có
DROP TABLE IF EXISTS public.support_messages CASCADE;

-- Bảng lưu lời cảm ơn, động viên, khích lệ từ mọi người
CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  message text NOT NULL, -- nội dung lời cảm ơn/động viên
  anonymous boolean NOT NULL DEFAULT false -- true = ẩn danh
);

-- Thêm cột created_at
ALTER TABLE public.support_messages ADD COLUMN created_at timestamp with time zone NOT NULL DEFAULT now();

-- Indexes
CREATE INDEX IF NOT EXISTS support_messages_case_id_idx ON public.support_messages(case_id);
CREATE INDEX IF NOT EXISTS support_messages_user_id_idx ON public.support_messages(user_id);
CREATE INDEX IF NOT EXISTS support_messages_created_at_idx ON public.support_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Xoá policy cũ nếu có
DROP POLICY IF EXISTS "Anyone can view support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Authenticated users can insert support messages" ON public.support_messages;

-- Policy: Anyone can view support messages
CREATE POLICY "Anyone can view support messages"
  ON public.support_messages FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert support messages
CREATE POLICY "Authenticated users can insert support messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (true);

-- GRANT PERMISSIONS
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
