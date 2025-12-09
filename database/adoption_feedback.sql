-- Bảng phản hồi sau khi hoàn thành nhận nuôi
-- Chủ cũ đánh giá người nhận nuôi

CREATE TABLE public.adoption_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  adoption_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  seeker_id uuid NOT NULL,
  rating text NOT NULL,
  note text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT adoption_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT adoption_feedback_adoption_id_fkey FOREIGN KEY (adoption_id) REFERENCES adoptions (id) ON DELETE CASCADE,
  CONSTRAINT adoption_feedback_rating_check CHECK ((rating = ANY (ARRAY['good'::text, 'bad'::text])))
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_feedback_adoption_id ON public.adoption_feedback USING btree (adoption_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_feedback_seeker_id ON public.adoption_feedback USING btree (seeker_id) TABLESPACE pg_default;
