DROP FUNCTION IF EXISTS public.admin_get_all_topup_requests(TEXT, INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_get_all_topup_requests(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  topup_id UUID,
  user_id UUID,
  amount BIGINT,
  payment_method TEXT,
  order_code TEXT,
  payment_link_id TEXT,
  checkout_url TEXT,
  qr_code TEXT,
  qr_code_url TEXT,
  topup_status TEXT,
  topup_created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  transaction_id TEXT,
  payment_description TEXT,
  notes TEXT,
  metadata JSONB,
  user_display_name TEXT,
  user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE profiles.id = auth.uid(); -- 👈 luôn qualify

  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Only admin can view all topup requests';
  END IF;

  RETURN QUERY
  SELECT
    tr.id                AS topup_id,
    tr.user_id,
    tr.amount,
    tr.payment_method,
    tr.order_code,
    tr.payment_link_id,
    tr.checkout_url,
    tr.qr_code,
    tr.qr_code_url,
    tr.status            AS topup_status,
    tr.created_at        AS topup_created_at,
    tr.paid_at,
    tr.confirmed_at,
    tr.cancelled_at,
    tr.updated_at,
    tr.transaction_id,
    tr.payment_description,
    tr.notes,
    tr.metadata,
    p.display_name       AS user_display_name,
    p.email              AS user_email
  FROM public.topup_requests tr
  LEFT JOIN public.profiles p ON tr.user_id = p.id
  WHERE (p_status IS NULL OR tr.status = p_status)
  ORDER BY tr.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_topup_requests(TEXT, INTEGER, INTEGER) TO authenticated;
