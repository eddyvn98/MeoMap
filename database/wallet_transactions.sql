-- Bảng lịch sử giao dịch ví
-- Ghi nhận mọi thay đổi số dư ví của người dùng

CREATE TABLE public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deposit_id uuid NULL,
  amount integer NOT NULL,
  type text NOT NULL,
  note text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_transactions_deposit_id_fkey FOREIGN KEY (deposit_id) REFERENCES deposits (id) ON DELETE SET NULL,
  CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE
) TABLESPACE pg_default;
