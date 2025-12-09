-- Bảng vé giao thú cưng (QR/Token)
-- Sinh token để xác nhận giao nhận thú cưng

CREATE TABLE public.adoption_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deposit_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  token text NOT NULL,
  expire_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT adoption_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT adoption_tickets_token_key UNIQUE (token),
  CONSTRAINT adoption_tickets_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES profiles (id),
  CONSTRAINT adoption_tickets_status_check CHECK (
    (
      status = ANY (
        ARRAY['active'::text, 'used'::text, 'expired'::text]
      )
    )
  )
) TABLESPACE pg_default;
