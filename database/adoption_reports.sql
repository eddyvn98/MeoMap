-- Bảng báo cáo vi phạm trong quá trình nhận nuôi
-- Ghi nhận các khiếu nại giữa chủ cũ và người nhận nuôi

CREATE TABLE public.adoption_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deposit_id uuid NOT NULL,
  pet_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  target_id uuid NOT NULL,
  reason_category text NOT NULL,
  reason_detail text NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  handled_at timestamp with time zone NULL,
  CONSTRAINT adoption_reports_pkey PRIMARY KEY (id),
  CONSTRAINT adoption_reports_deposit_fkey FOREIGN KEY (deposit_id) REFERENCES deposits (id) ON DELETE CASCADE,
  CONSTRAINT adoption_reports_pet_fkey FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE CASCADE,
  CONSTRAINT adoption_reports_reporter_fkey FOREIGN KEY (reporter_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT adoption_reports_target_fkey FOREIGN KEY (target_id) REFERENCES profiles (id) ON DELETE CASCADE
) TABLESPACE pg_default;
