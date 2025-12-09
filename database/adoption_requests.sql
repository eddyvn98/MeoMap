-- Bảng yêu cầu nhận nuôi thú cưng
-- Ghi nhận toàn bộ flow từ khi người dùng gửi yêu cầu cho đến khi giao thú cưng

CREATE TABLE public.adoption_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accepted_at timestamp with time zone NULL,
  rejected_at timestamp with time zone NULL,
  cancelled_at timestamp with time zone NULL,
  receiver_confirmed_meet boolean NULL DEFAULT false,
  receiver_confirmed_at timestamp with time zone NULL,
  owner_confirmed_meet boolean NULL DEFAULT false,
  owner_confirmed_at timestamp with time zone NULL,
  delivery_token text NULL,
  token_generated_at timestamp with time zone NULL,
  delivered_at timestamp with time zone NULL,
  delivery_confirmed_by uuid NULL,
  receiver_confirmed_checkin boolean DEFAULT false,
  receiver_confirmed_checkin_at timestamp with time zone NULL,
  owner_confirmed_checkin boolean DEFAULT false,
  owner_confirmed_checkin_at timestamp with time zone NULL,
  checkin_required_at timestamp with time zone NULL,
  checkin_days integer DEFAULT 30,
  status_updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT adoption_requests_pkey PRIMARY KEY (id),
  CONSTRAINT adoption_requests_delivery_token_key UNIQUE (delivery_token),
  CONSTRAINT unique_pet_requester UNIQUE (pet_id, requester_id),
  CONSTRAINT adoption_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT adoption_requests_delivery_confirmed_by_fkey FOREIGN KEY (delivery_confirmed_by) REFERENCES profiles (id),
  CONSTRAINT adoption_requests_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT adoption_requests_pet_id_fkey FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE CASCADE,
  CONSTRAINT adoption_requests_status_check CHECK (
    (
      status = ANY (
        ARRAY[
          'pending'::text,
          'accepted'::text,
          'rejected'::text,
          'ready_to_deliver'::text,
          'delivered'::text,
          'completed'::text,
          'cancelled'::text
        ]
      )
    )
  ),
  CONSTRAINT valid_token_length CHECK (
    (
      (delivery_token IS NULL)
      OR (length(delivery_token) >= 6)
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_adoption_requests_pet_id ON public.adoption_requests USING btree (pet_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_adoption_requests_requester_id ON public.adoption_requests USING btree (requester_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_adoption_requests_owner_id ON public.adoption_requests USING btree (owner_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_adoption_requests_status ON public.adoption_requests USING btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_adoption_requests_delivery_token ON public.adoption_requests USING btree (delivery_token) TABLESPACE pg_default
WHERE (delivery_token IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_adoption_requests_created_at ON public.adoption_requests USING btree (created_at DESC) TABLESPACE pg_default;

CREATE TRIGGER trigger_auto_generate_delivery_token BEFORE UPDATE ON adoption_requests FOR EACH ROW EXECUTE FUNCTION auto_generate_delivery_token();
