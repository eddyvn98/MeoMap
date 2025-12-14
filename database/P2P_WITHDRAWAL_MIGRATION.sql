-- ============================================
-- P2P Withdrawal System (Binance Model)
-- ============================================

-- Drop existing tables if any
DROP TABLE IF EXISTS withdrawal_disputes CASCADE;
DROP TABLE IF EXISTS withdrawal_proofs CASCADE;
DROP TABLE IF EXISTS withdrawal_requests CASCADE;

-- ============================================
-- Main withdrawal_requests table
-- ============================================
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Order Info
  order_code VARCHAR(50) NOT NULL UNIQUE,  -- WD-YYYYMMDD-XXXXX format
  amount BIGINT NOT NULL CHECK (amount > 0),
  
  -- Bank Account (immutable after creation)
  bank_name VARCHAR(100) NOT NULL,
  bank_account VARCHAR(50) NOT NULL,
  account_holder VARCHAR(200) NOT NULL,
  
  -- Status workflow: PENDING → WAITING_FOR_ADMIN_PAYMENT → AWAITING_USER_CONFIRMATION → COMPLETED
  -- Or: PENDING → ... → DISPUTED
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'WAITING_FOR_ADMIN_PAYMENT', 'AWAITING_USER_CONFIRMATION', 'COMPLETED', 'REJECTED', 'DISPUTED')
  ),
  
  -- User request details
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_notes TEXT,
  
  -- Admin action details
  admin_id UUID REFERENCES profiles(id),
  admin_approved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  
  -- Transfer proof details
  bank_trace_id VARCHAR(100),  -- Trace ID from bank
  transfer_content TEXT,  -- Actual transfer content used (e.g., "PAY WD-20250130-000245")
  transfer_time TIMESTAMP WITH TIME ZONE,
  
  -- User confirmation
  user_confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Dispute
  dispute_opened_at TIMESTAMP WITH TIME ZONE,
  dispute_reason TEXT,
  dispute_resolved_at TIMESTAMP WITH TIME ZONE,
  dispute_resolution TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_withdrawal_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status);
CREATE INDEX idx_withdrawal_order_code ON withdrawal_requests(order_code);

-- ============================================
-- withdrawal_proofs table (for admin uploads)
-- ============================================
CREATE TABLE withdrawal_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  
  -- Proof file
  file_url TEXT NOT NULL,  -- URL to stored image/PDF
  file_type VARCHAR(20) NOT NULL,  -- 'image' or 'pdf'
  file_size BIGINT,
  
  -- When uploaded
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES profiles(id),
  
  -- Admin notes about this specific proof
  notes TEXT
);

CREATE INDEX idx_proof_withdrawal_id ON withdrawal_proofs(withdrawal_id);

-- ============================================
-- withdrawal_disputes table
-- ============================================
CREATE TABLE withdrawal_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  withdrawal_id UUID NOT NULL REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
  
  -- Dispute details
  opened_by UUID NOT NULL REFERENCES profiles(id),
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reason TEXT NOT NULL,
  
  -- Evidence
  user_proof_url TEXT,  -- User's evidence link
  user_description TEXT,
  
  -- Resolution
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_type VARCHAR(50),  -- 'approved', 'rejected', 'refunded'
  resolution_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dispute_withdrawal_id ON withdrawal_disputes(withdrawal_id);

-- ============================================
-- RPC: Generate next withdrawal order code
-- ============================================
CREATE OR REPLACE FUNCTION generate_withdrawal_order_code()
RETURNS VARCHAR AS $$
DECLARE
  v_date_part VARCHAR := TO_CHAR(NOW(), 'YYYYMMDD');
  v_counter INT;
  v_order_code VARCHAR;
  v_max_attempts INT := 100;
  v_attempt INT := 0;
BEGIN
  -- Try to generate unique code (max 100 attempts)
  WHILE v_attempt < v_max_attempts LOOP
    v_counter := (FLOOR(RANDOM() * 100000))::INT;
    v_order_code := 'WD-' || v_date_part || '-' || LPAD(v_counter::TEXT, 6, '0');
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM withdrawal_requests WHERE order_code = v_order_code) THEN
      RETURN v_order_code;
    END IF;
    
    v_attempt := v_attempt + 1;
  END LOOP;
  
  -- Fallback: use timestamp
  RETURN 'WD-' || v_date_part || '-' || LPAD((EXTRACT(EPOCH FROM NOW()) % 1000000)::INT::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RPC: Create withdrawal request
-- ============================================
CREATE OR REPLACE FUNCTION create_withdrawal_request_p2p(
  p_user_id UUID,
  p_amount BIGINT,
  p_bank_name VARCHAR,
  p_bank_account VARCHAR,
  p_account_holder VARCHAR,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  order_code VARCHAR,
  withdrawal_id UUID,
  error TEXT
) AS $$
DECLARE
  v_order_code VARCHAR;
  v_withdrawal_id UUID;
  v_current_balance BIGINT;
  v_user_role VARCHAR;
BEGIN
  -- Check user exists and get role
  SELECT role INTO v_user_role FROM profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::VARCHAR, NULL::UUID, 'User không tồn tại'::TEXT;
    RETURN;
  END IF;
  
  -- Check balance_thuong is sufficient
  SELECT balance_thuong INTO v_current_balance FROM profiles WHERE id = p_user_id;
  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::VARCHAR, NULL::UUID, 
      'Số dư không đủ. Số dư hiện tại: ' || v_current_balance::TEXT || ' VND'::TEXT;
    RETURN;
  END IF;
  
  -- Generate order code
  v_order_code := generate_withdrawal_order_code();
  
  -- Create withdrawal request
  INSERT INTO withdrawal_requests (
    user_id,
    order_code,
    amount,
    bank_name,
    bank_account,
    account_holder,
    user_notes,
    status
  ) VALUES (
    p_user_id,
    v_order_code,
    p_amount,
    p_bank_name,
    p_bank_account,
    p_account_holder,
    p_notes,
    'PENDING'
  ) RETURNING id INTO v_withdrawal_id;
  
  -- Deduct balance_thuong
  UPDATE profiles
  SET balance_thuong = balance_thuong - p_amount
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT TRUE::BOOLEAN, v_order_code::VARCHAR, v_withdrawal_id::UUID, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE::BOOLEAN, NULL::VARCHAR, NULL::UUID, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RPC: Admin approve withdrawal (move to payment)
-- ============================================
CREATE OR REPLACE FUNCTION admin_approve_withdrawal_p2p(
  p_withdrawal_id UUID,
  p_admin_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  error TEXT
) AS $$
DECLARE
  v_current_status VARCHAR;
BEGIN
  -- Check withdrawal exists and get status
  SELECT status INTO v_current_status FROM withdrawal_requests WHERE id = p_withdrawal_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'Lệnh rút không tồn tại'::TEXT;
    RETURN;
  END IF;
  
  -- Only allow from PENDING → WAITING_FOR_ADMIN_PAYMENT
  IF v_current_status != 'PENDING' THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 
      'Chỉ có thể duyệt từ trạng thái PENDING. Hiện tại: ' || v_current_status::TEXT;
    RETURN;
  END IF;
  
  -- Update status
  UPDATE withdrawal_requests
  SET 
    status = 'WAITING_FOR_ADMIN_PAYMENT',
    admin_id = p_admin_id,
    admin_approved_at = NOW(),
    admin_notes = p_admin_notes,
    updated_at = NOW()
  WHERE id = p_withdrawal_id;
  
  RETURN QUERY SELECT TRUE::BOOLEAN, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE::BOOLEAN, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RPC: Admin confirm payment made
-- ============================================
CREATE OR REPLACE FUNCTION admin_confirm_payment_p2p(
  p_withdrawal_id UUID,
  p_trace_id VARCHAR,
  p_transfer_content VARCHAR,
  p_transfer_time TIMESTAMP WITH TIME ZONE,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  error TEXT
) AS $$
BEGIN
  -- Update with payment proof
  UPDATE withdrawal_requests
  SET 
    status = 'AWAITING_USER_CONFIRMATION',
    bank_trace_id = p_trace_id,
    transfer_content = p_transfer_content,
    transfer_time = p_transfer_time,
    admin_notes = COALESCE(admin_notes, '') || COALESCE(E'\n' || p_admin_notes, ''),
    updated_at = NOW()
  WHERE id = p_withdrawal_id;
  
  RETURN QUERY SELECT TRUE::BOOLEAN, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE::BOOLEAN, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RPC: User confirms receipt
-- ============================================
CREATE OR REPLACE FUNCTION user_confirm_receipt_p2p(
  p_withdrawal_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  error TEXT
) AS $$
DECLARE
  v_withdrawal_user_id UUID;
  v_status VARCHAR;
BEGIN
  -- Verify ownership and status
  SELECT user_id, status INTO v_withdrawal_user_id, v_status 
  FROM withdrawal_requests 
  WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'Lệnh rút không tồn tại'::TEXT;
    RETURN;
  END IF;
  
  IF v_withdrawal_user_id != p_user_id THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 'Không có quyền xác nhận lệnh này'::TEXT;
    RETURN;
  END IF;
  
  IF v_status != 'AWAITING_USER_CONFIRMATION' THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, 
      'Lệnh phải ở trạng thái "Chờ xác nhận" để hoàn thành'::TEXT;
    RETURN;
  END IF;
  
  -- Mark as completed
  UPDATE withdrawal_requests
  SET 
    status = 'COMPLETED',
    user_confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_withdrawal_id;
  
  RETURN QUERY SELECT TRUE::BOOLEAN, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE::BOOLEAN, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RPC: User open dispute
-- ============================================
CREATE OR REPLACE FUNCTION user_open_dispute_p2p(
  p_withdrawal_id UUID,
  p_user_id UUID,
  p_reason TEXT,
  p_proof_url TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  dispute_id UUID,
  error TEXT
) AS $$
DECLARE
  v_dispute_id UUID;
  v_withdrawal_user_id UUID;
BEGIN
  -- Verify ownership
  SELECT user_id INTO v_withdrawal_user_id FROM withdrawal_requests WHERE id = p_withdrawal_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::UUID, 'Lệnh rút không tồn tại'::TEXT;
    RETURN;
  END IF;
  
  IF v_withdrawal_user_id != p_user_id THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, NULL::UUID, 'Không có quyền mở tranh chấp'::TEXT;
    RETURN;
  END IF;
  
  -- Create dispute record
  INSERT INTO withdrawal_disputes (
    withdrawal_id,
    opened_by,
    reason,
    user_proof_url
  ) VALUES (
    p_withdrawal_id,
    p_user_id,
    p_reason,
    p_proof_url
  ) RETURNING id INTO v_dispute_id;
  
  -- Update withdrawal status
  UPDATE withdrawal_requests
  SET 
    status = 'DISPUTED',
    dispute_opened_at = NOW(),
    dispute_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_withdrawal_id;
  
  RETURN QUERY SELECT TRUE::BOOLEAN, v_dispute_id::UUID, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE::BOOLEAN, NULL::UUID, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_disputes ENABLE ROW LEVEL SECURITY;

-- Users can see their own withdrawal requests
CREATE POLICY withdrawal_requests_user_select ON withdrawal_requests
  FOR SELECT USING (auth.uid() = user_id OR 
    (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')));

CREATE POLICY withdrawal_requests_user_insert ON withdrawal_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can update
CREATE POLICY withdrawal_requests_admin_update ON withdrawal_requests
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Proofs
CREATE POLICY proofs_select ON withdrawal_proofs
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM withdrawal_requests WHERE id = withdrawal_id
  ) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY proofs_insert ON withdrawal_proofs
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Disputes
CREATE POLICY disputes_select ON withdrawal_disputes
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM withdrawal_requests WHERE id = withdrawal_id
  ) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY disputes_insert ON withdrawal_disputes
  FOR INSERT WITH CHECK (auth.uid() = opened_by);

COMMIT;
