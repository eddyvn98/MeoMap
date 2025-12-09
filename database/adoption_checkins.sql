-- Bảng theo dõi check-in sau khi nhận nuôi
-- Ghi nhận các mốc thời gian người nhận nuôi cần báo cáo tình hình thú cưng

CREATE TABLE public.adoption_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  adoption_id uuid NOT NULL,
  day_offset integer NOT NULL,
  due_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  image_url text NULL,
  note text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone NULL,
  CONSTRAINT adoption_checkins_pkey PRIMARY KEY (id),
  CONSTRAINT adoption_checkins_adoption_id_fkey FOREIGN KEY (adoption_id) REFERENCES adoptions (id) ON DELETE CASCADE,
  CONSTRAINT adoption_checkins_status_check CHECK (
    (
      status = ANY (
        ARRAY[
          'pending'::text,
          'completed'::text,
          'late'::text,
          'skipped'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_checkins_adoption_id ON public.adoption_checkins USING btree (adoption_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_checkins_status ON public.adoption_checkins USING btree (status) TABLESPACE pg_default;
