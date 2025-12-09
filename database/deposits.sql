-- Bảng quản lý tiền cọc cho giao dịch nhận nuôi
-- Ghi nhận số tiền cọc, phương thức thanh toán, và trạng thái giao dịch

CREATE TABLE public.deposits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  cancel_reason text NULL,
  proof_image_url text NULL,
  proof_note text NULL,
  delivery_status text NULL,
  delivered_at timestamp with time zone NULL,
  delivery_token text NULL,
  delivery_cancel_reason text NULL,
  delivery_cancelled_by uuid NULL,
  wallet_used integer NOT NULL DEFAULT 0,
  cash_amount integer NOT NULL DEFAULT 0,
  payment_provider text NULL,
  payment_status text NULL,
  payment_ref text NULL,
  payment_raw jsonb NULL,
  paid_at timestamp with time zone NULL,
  payos_order_code text NULL,
  CONSTRAINT deposits_pkey PRIMARY KEY (id),
  CONSTRAINT deposits_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles (id),
  CONSTRAINT deposits_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES pets (id),
  CONSTRAINT deposits_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES profiles (id),
  CONSTRAINT deposits_amount_check CHECK ((amount >= 0))
) TABLESPACE pg_default;
