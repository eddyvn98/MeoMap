-- ============================================================================
-- P1: RACE CONDITION PROTECTION - ATOMIC RPC FUNCTIONS
-- ============================================================================

-- 0. CREATE adoption_reports TABLE IF NOT EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.adoption_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deposit_id uuid NOT NULL,
  pet_id uuid NOT NULL,
  reporter_id uuid NOT NULL,
  target_id uuid NOT NULL,
  reason_category text NOT NULL,
  reason_detail text NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  handled_at timestamp with time zone NULL,
  CONSTRAINT adoption_reports_pkey PRIMARY KEY (id),
  CONSTRAINT adoption_reports_deposit_fkey FOREIGN KEY (deposit_id) REFERENCES deposits (id) ON DELETE CASCADE,
  CONSTRAINT adoption_reports_pet_fkey FOREIGN KEY (pet_id) REFERENCES pets (id) ON DELETE CASCADE,
  CONSTRAINT adoption_reports_reporter_fkey FOREIGN KEY (reporter_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT adoption_reports_target_fkey FOREIGN KEY (target_id) REFERENCES profiles (id) ON DELETE CASCADE
) TABLESPACE pg_default;

-- 1. ATOMIC REFUND: finish_delivery_with_refund
-- Đảm bảo refund chỉ chạy 1 lần, atomic, không bị race condition
-- ============================================================================

CREATE OR REPLACE FUNCTION finish_delivery_with_refund(
  p_deposit_id UUID,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deposit RECORD;
  v_amount INTEGER;
  v_result jsonb;
BEGIN
  -- 1. Lock deposit row để chỉ 1 request xử lý
  SELECT * FROM deposits 
  WHERE id = p_deposit_id 
  FOR UPDATE 
  INTO v_deposit;
  
  -- 2. Validate: deposit phải tồn tại và trạng thái = "pending_return"
  IF v_deposit IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Deposit not found'
    );
  END IF;
  
  IF v_deposit.status NOT IN ('pending_return', 'delivered') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid deposit status: ' || v_deposit.status,
      'status', v_deposit.status
    );
  END IF;
  
  -- 3. Validate: chủ ví phải match (chỉ receiver hoặc owner có quyền refund)
  IF v_deposit.receiver_id != p_user_id AND v_deposit.owner_id != p_user_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized'
    );
  END IF;
  
  v_amount := v_deposit.amount;
  
  -- 4. Tăng ví receiver (hoàn cọc)
  UPDATE profiles 
  SET wallet_credit = wallet_credit + v_amount
  WHERE id = v_deposit.receiver_id;
  
  -- 5. Cập nhật deposit status → "refunded"
  UPDATE deposits
  SET 
    status = 'refunded',
    updated_at = now()
  WHERE id = p_deposit_id;
  
  -- 6. Log transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    description,
    related_id,
    related_type
  ) VALUES (
    v_deposit.receiver_id,
    'refund_deposit',
    v_amount,
    'Hoàn cọc nhận nuôi',
    p_deposit_id,
    'deposit'
  );
  
  -- 7. Log deposit status change
  INSERT INTO deposit_status_logs (
    deposit_id,
    old_status,
    new_status,
    changed_by,
    reason
  ) VALUES (
    p_deposit_id,
    v_deposit.status,
    'refunded',
    p_user_id,
    'Hoàn cọc khi giao thành công'
  );
  
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Hoàn cọc thành công',
    'deposit_id', p_deposit_id,
    'refunded_amount', v_amount,
    'receiver_id', v_deposit.receiver_id
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- 2. ATOMIC WALLET DECREASE: atomic_decrease_wallet
-- Ngăn double spending, đảm bảo balance luôn đúng
-- ============================================================================

CREATE OR REPLACE FUNCTION atomic_decrease_wallet(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_related_id UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INTEGER;
  v_result jsonb;
  v_new_balance INTEGER;
BEGIN
  -- 1. Lock profile row (prevents concurrent decreases)
  SELECT wallet_credit FROM profiles 
  WHERE id = p_user_id 
  FOR UPDATE 
  INTO v_current_balance;
  
  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found'
    );
  END IF;
  
  -- 2. Check balance
  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'current_balance', v_current_balance,
      'required', p_amount
    );
  END IF;
  
  -- 3. Atomic decrease
  UPDATE profiles
  SET wallet_credit = wallet_credit - p_amount
  WHERE id = p_user_id;
  
  v_new_balance := v_current_balance - p_amount;
  
  -- 4. Log transaction
  INSERT INTO wallet_transactions (
    user_id,
    type,
    amount,
    description,
    related_id,
    related_type,
    balance_before,
    balance_after
  ) VALUES (
    p_user_id,
    'use_for_deposit',
    p_amount,
    p_reason,
    p_related_id,
    p_related_type,
    v_current_balance,
    v_new_balance
  );
  
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Trừ ví thành công',
    'amount', p_amount,
    'balance_before', v_current_balance,
    'balance_after', v_new_balance
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- ============================================================================
-- 3. DEPOSIT STATUS LOG TABLE - Audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.deposit_status_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  deposit_id uuid NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT deposit_status_logs_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_deposit_status_logs_deposit_id 
ON deposit_status_logs(deposit_id);

CREATE INDEX IF NOT EXISTS idx_deposit_status_logs_created_at 
ON deposit_status_logs(created_at DESC);

ALTER TABLE public.deposit_status_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to avoid duplication on re-run
DROP POLICY IF EXISTS "Users can view their own deposit logs" ON public.deposit_status_logs;

CREATE POLICY "Users can view their own deposit logs"
  ON public.deposit_status_logs FOR SELECT
  USING (
    changed_by = auth.uid() OR
    deposit_id IN (
      SELECT id FROM deposits 
      WHERE owner_id = auth.uid() OR receiver_id = auth.uid()
    )
  );

-- ============================================================================
-- 4. ADMIN ACTION LOG TABLE - Audit trail for reports
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL, -- 'approve_report', 'reject_report', 'ban_user', etc.
  target_id uuid, -- deposit_id, adoption_request_id, user_id, etc.
  target_type text, -- 'adoption_report', 'user', 'deposit', etc.
  description text,
  metadata jsonb, -- reason, evidence, etc.
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_action_logs_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin_id 
ON admin_action_logs(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at 
ON admin_action_logs(created_at DESC);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policy to allow re-run safely
DROP POLICY IF EXISTS "Only admins can view admin logs" ON public.admin_action_logs;

CREATE POLICY "Only admins can view admin logs"
  ON public.admin_action_logs FOR SELECT
  USING (admin_id = auth.uid());

-- ============================================================================
-- 5. REPORT RATE LIMIT - Prevent spam
-- ============================================================================

-- adoption_reports table already has reporter_id and created_at columns
-- Just create indexes for rate limiting queries

CREATE INDEX IF NOT EXISTS idx_adoption_reports_deposit_id
ON adoption_reports(deposit_id);

CREATE INDEX IF NOT EXISTS idx_adoption_reports_reporter_created
ON adoption_reports(reporter_id, created_at DESC);

-- Function to check report rate limit
CREATE OR REPLACE FUNCTION can_submit_report(
  p_deposit_id UUID,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recent_report RECORD;
BEGIN
  -- Check: 1 report per deposit (không báo cáo cùng 1 deposit 2 lần)
  SELECT * FROM adoption_reports
  WHERE deposit_id = p_deposit_id 
  AND reporter_id = p_user_id
  AND created_at > now() - INTERVAL '30 days'
  LIMIT 1
  INTO v_recent_report;
  
  IF v_recent_report.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Bạn đã báo cáo hồ sơ này rồi',
      'last_report_at', v_recent_report.created_at
    );
  END IF;
  
  -- Check: Rate limit 1 report per 15 min per user (ngăn spam)
  SELECT * FROM adoption_reports
  WHERE reporter_id = p_user_id
  AND created_at > now() - INTERVAL '15 minutes'
  LIMIT 1
  INTO v_recent_report;
  
  IF v_recent_report.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'Bạn gửi báo cáo quá nhanh, vui lòng chờ 15 phút',
      'retry_after_seconds', 
        EXTRACT(EPOCH FROM (v_recent_report.created_at + INTERVAL '15 minutes' - now()))::int
    );
  END IF;
  
  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE public.deposit_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

GRANT EXECUTE ON FUNCTION finish_delivery_with_refund TO authenticated;
GRANT EXECUTE ON FUNCTION atomic_decrease_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION can_submit_report TO authenticated;

COMMENT ON FUNCTION finish_delivery_with_refund IS 'Atomic refund when delivery succeeds - prevents race conditions';
COMMENT ON FUNCTION atomic_decrease_wallet IS 'Atomic wallet decrease - prevents double spending';
COMMENT ON FUNCTION can_submit_report IS 'Check if user can submit report - enforces rate limits';
