-- Bảng lưu trữ các giao dịch nhận nuôi đã hoàn tất
-- Lưu lại lịch sử nhận nuôi thành công

CREATE TABLE public.adoptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  deposit_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  seeker_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  adopted_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT adoptions_pkey PRIMARY KEY (id),
  CONSTRAINT adoptions_status_check CHECK (
    (
      status = ANY (
        ARRAY[
          'active'::text,
          'completed'::text,
          'canceled'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;
