-- Bảng đánh giá sau khi giao dịch nhận nuôi hoàn tất
-- Lưu điểm đánh giá giữa chủ cũ và người nhận nuôi

CREATE TABLE public.adoption_ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deposit_id uuid NOT NULL,
  pet_id uuid NOT NULL,
  rater_id uuid NOT NULL,
  target_id uuid NOT NULL,
  score smallint NOT NULL,
  comment text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT adoption_ratings_pkey PRIMARY KEY (id),
  CONSTRAINT adoption_ratings_unique_rating UNIQUE (deposit_id, rater_id),
  CONSTRAINT adoption_ratings_deposit_fkey FOREIGN KEY (deposit_id) REFERENCES deposits (id) ON DELETE CASCADE,
  CONSTRAINT adoption_ratings_pet_fkey FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE CASCADE,
  CONSTRAINT adoption_ratings_rater_fkey FOREIGN KEY (rater_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT adoption_ratings_target_fkey FOREIGN KEY (target_id) REFERENCES profiles (id) ON DELETE CASCADE
) TABLESPACE pg_default;
