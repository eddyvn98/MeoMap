-- ================================================================
-- ADMIN FUNCTIONS: Quản lý topup requests
-- ================================================================

-- ================================================================
-- FUNCTION: admin_get_all_topup_requests
-- Admin xem tất cả topup requests (bypass RLS)
-- ================================================================

DROP FUNCTION IF EXISTS public.admin_get_all_topup_requests(TEXT, INTEGER, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.admin_get_all_topup_requests(
  p_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  amount INTEGER,
  payment_method TEXT,
  order_code TEXT,
  payment_link_id TEXT,
  checkout_url TEXT,
  qr_code TEXT,
  qr_code_url TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
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
  -- 1. Check if caller is admin
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role != 'admin' THEN
    RAISE EXCEPTION 'Only admin can view all topup requests';
  END IF;

  -- 2. Return all topup requests (bypass RLS)
  RETURN QUERY
  SELECT 
    tr.id,
    tr.user_id,
    tr.amount,
    tr.payment_method,
    tr.order_code,
    tr.payment_link_id,
    tr.checkout_url,
    tr.qr_code,
    tr.qr_code_url,
    tr.status,
    tr.created_at,
    tr.paid_at,
    tr.confirmed_at,
    tr.cancelled_at,
    tr.updated_at,
    tr.transaction_id,
    tr.payment_description,
    tr.notes,
    tr.metadata,
    p.display_name AS user_display_name,
    p.email AS user_email
  FROM public.topup_requests tr
  LEFT JOIN public.profiles p ON tr.user_id = p.id
  WHERE (p_status IS NULL OR tr.status = p_status)
  ORDER BY tr.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.admin_get_all_topup_requests(TEXT, INTEGER, INTEGER) TO authenticated;

-- ================================================================
-- COMMENT
-- ================================================================

COMMENT ON FUNCTION public.admin_get_all_topup_requests IS 
'Admin function to view all topup requests from all users (bypasses RLS). Only users with role=admin can execute.';
