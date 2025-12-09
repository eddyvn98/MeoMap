-- ================================================================
-- MIGRATION: NO-SHOW HANDLING SYSTEM FOR ADOPTION REQUESTS
-- ================================================================
-- Bao gồm:
-- 1. Reputation score tracking
-- 2. Auto-timeout confirmation
-- 3. Automatic reminder notifications
-- 4. Notifications tracking
-- ================================================================

-- ================================================================
-- STEP 1: ADD REPUTATION SCORE COLUMNS TO PROFILES
-- ================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS reputation_score integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS no_show_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS late_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS reputation_updated_at timestamp with time zone DEFAULT now();

COMMENT ON COLUMN public.profiles.reputation_score IS 'Reputation điểm (0-100), bắt đầu 100. Trừ 10 điểm cho mỗi no-show hoặc timeout.';
COMMENT ON COLUMN public.profiles.no_show_count IS 'Số lần không tới gặp/nhận mèo';
COMMENT ON COLUMN public.profiles.late_count IS 'Số lần đến muộn';

-- ================================================================
-- STEP 2: ADD REMINDER & TIMEOUT COLUMNS TO ADOPTION_REQUESTS
-- ================================================================

ALTER TABLE public.adoption_requests
ADD COLUMN IF NOT EXISTS confirmation_deadline timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS receiver_reminder_sent_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS owner_reminder_sent_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS receiver_no_show boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS owner_no_show boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS timeout_auto_cancelled boolean DEFAULT false;

COMMENT ON COLUMN public.adoption_requests.confirmation_deadline IS 'Deadline cho người nhận và chủ xác nhận hẹn gặp (mặc định 3 ngày)';
COMMENT ON COLUMN public.adoption_requests.receiver_reminder_sent_at IS 'Lần cuối nhắc nhở người nhận xác nhận hẹn gặp';
COMMENT ON COLUMN public.adoption_requests.owner_reminder_sent_at IS 'Lần cuối nhắc nhở chủ xác nhận hẹn gặp';
COMMENT ON COLUMN public.adoption_requests.receiver_no_show IS 'Người nhận không tới gặp/xác nhận hẹn gặp';
COMMENT ON COLUMN public.adoption_requests.owner_no_show IS 'Chủ không tới gặp/xác nhận hẹn gặp';
COMMENT ON COLUMN public.adoption_requests.timeout_auto_cancelled IS 'Tự động hủy do timeout confirm meeting';

-- ================================================================
-- STEP 3: CREATE NOTIFICATIONS TABLE
-- ================================================================

CREATE TABLE IF NOT EXISTS public.adoption_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  adoption_request_id uuid NOT NULL REFERENCES public.adoption_requests(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- 'meeting_confirmation_reminder', 'meeting_confirmed', 'no_show_detected', 'timeout_cancelled'
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb,
  read_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT adoption_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notification_type_check CHECK (
    notification_type = ANY (
      ARRAY[
        'meeting_confirmation_reminder'::text,
        'meeting_confirmed'::text,
        'no_show_detected'::text,
        'timeout_cancelled'::text,
        'meeting_confirmed_both'::text
      ]
    )
  )
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_adoption_notifications_recipient_id 
ON public.adoption_notifications(recipient_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_adoption_notifications_adoption_request_id 
ON public.adoption_notifications(adoption_request_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_adoption_notifications_created_at 
ON public.adoption_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_adoption_notifications_read_at 
ON public.adoption_notifications(read_at) WHERE read_at IS NULL;

-- Enable RLS
ALTER TABLE public.adoption_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notifications
CREATE POLICY adoption_notifications_select ON public.adoption_notifications
  FOR SELECT
  USING (auth.uid() = recipient_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY adoption_notifications_insert ON public.adoption_notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY adoption_notifications_update ON public.adoption_notifications
  FOR UPDATE
  USING (auth.uid() = recipient_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK (auth.uid() = recipient_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- ================================================================
-- STEP 4: FUNCTION TO LOG ADOPTION ACTIVITIES
-- ================================================================

CREATE OR REPLACE FUNCTION log_adoption_activity(
  p_adoption_request_id uuid,
  p_activity_type text,
  p_actor_id uuid,
  p_actor_type text DEFAULT 'requester',
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_activity_id uuid;
BEGIN
  INSERT INTO public.adoption_activities (
    adoption_request_id,
    activity_type,
    actor_id,
    actor_type,
    description,
    metadata,
    created_at
  )
  VALUES (
    p_adoption_request_id,
    p_activity_type,
    p_actor_id,
    p_actor_type,
    p_description,
    p_metadata,
    now()
  )
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- STEP 5: FUNCTION TO CREATE NOTIFICATIONS
-- ================================================================

CREATE OR REPLACE FUNCTION create_adoption_notification(
  p_adoption_request_id uuid,
  p_recipient_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO public.adoption_notifications (
    adoption_request_id,
    recipient_id,
    notification_type,
    title,
    message,
    metadata,
    created_at
  )
  VALUES (
    p_adoption_request_id,
    p_recipient_id,
    p_notification_type,
    p_title,
    p_message,
    p_metadata,
    now()
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- STEP 6: FUNCTION TO SEND REMINDER NOTIFICATION
-- ================================================================

CREATE OR REPLACE FUNCTION send_meeting_confirmation_reminder(
  p_adoption_request_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_request adoption_requests%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Get the adoption request
  SELECT * INTO v_request FROM public.adoption_requests WHERE id = p_adoption_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adoption request not found');
  END IF;
  
  -- Status must be 'accepted'
  IF v_request.status != 'accepted' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request must be in accepted status');
  END IF;
  
  -- Only send if both haven't confirmed yet
  IF v_request.receiver_confirmed_meet = true AND v_request.owner_confirmed_meet = true THEN
    RETURN jsonb_build_object('success', false, 'error', 'Both have already confirmed');
  END IF;
  
  -- Send reminder to receiver if not confirmed
  IF v_request.receiver_confirmed_meet = false AND v_request.receiver_reminder_sent_at IS NULL THEN
    PERFORM create_adoption_notification(
      p_adoption_request_id,
      v_request.requester_id,
      'meeting_confirmation_reminder',
      'Nhắc nhở: Xác nhận hẹn gặp',
      'Vui lòng xác nhận đã hẹn gặp với chủ bài trong vòng 3 ngày. Nếu không xác nhận, yêu cầu sẽ tự động hủy.',
      jsonb_build_object('deadline_days', 3)
    );
    
    -- Update receiver reminder sent timestamp
    UPDATE public.adoption_requests
    SET receiver_reminder_sent_at = now()
    WHERE id = p_adoption_request_id;
    
    -- Log activity
    PERFORM log_adoption_activity(
      p_adoption_request_id,
      'meeting_confirmation_reminder',
      v_request.requester_id,
      'requester',
      'Nhắc nhở người nhận xác nhận hẹn gặp'
    );
  END IF;
  
  -- Send reminder to owner if not confirmed
  IF v_request.owner_confirmed_meet = false AND v_request.owner_reminder_sent_at IS NULL THEN
    PERFORM create_adoption_notification(
      p_adoption_request_id,
      v_request.owner_id,
      'meeting_confirmation_reminder',
      'Nhắc nhở: Xác nhận hẹn gặp',
      'Vui lòng xác nhận đã hẹn gặp với người nhận trong vòng 3 ngày. Nếu không xác nhận, yêu cầu sẽ tự động hủy.',
      jsonb_build_object('deadline_days', 3)
    );
    
    -- Update owner reminder sent timestamp
    UPDATE public.adoption_requests
    SET owner_reminder_sent_at = now()
    WHERE id = p_adoption_request_id;
    
    -- Log activity
    PERFORM log_adoption_activity(
      p_adoption_request_id,
      'meeting_confirmation_reminder',
      v_request.owner_id,
      'owner',
      'Nhắc nhở chủ xác nhận hẹn gặp'
    );
  END IF;
  
  RETURN jsonb_build_object('success', true, 'message', 'Reminders sent successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- STEP 7: FUNCTION TO AUTO-CANCEL UNCONFIRMED MEETINGS
-- ================================================================

CREATE OR REPLACE FUNCTION auto_cancel_unconfirmed_meetings()
RETURNS TABLE(cancelled_count integer) AS $$
DECLARE
  v_count integer := 0;
  v_request adoption_requests%ROWTYPE;
BEGIN
  -- Find all requests that:
  -- 1. Are in 'accepted' status
  -- 2. Have passed confirmation deadline
  -- 3. Have not had both confirm meeting
  
  FOR v_request IN
    SELECT ar.* FROM public.adoption_requests ar
    WHERE ar.status = 'accepted'
      AND ar.confirmation_deadline IS NOT NULL
      AND ar.confirmation_deadline < now()
      AND (ar.receiver_confirmed_meet = false OR ar.owner_confirmed_meet = false)
      AND ar.timeout_auto_cancelled = false
  LOOP
    -- Cancel the request
    UPDATE public.adoption_requests
    SET 
      status = 'cancelled',
      cancelled_at = now(),
      timeout_auto_cancelled = true,
      receiver_no_show = CASE WHEN receiver_confirmed_meet = false THEN true ELSE false END,
      owner_no_show = CASE WHEN owner_confirmed_meet = false THEN true ELSE false END
    WHERE id = v_request.id;
    
    -- Mark no-show for receiver if they didn't confirm
    IF v_request.receiver_confirmed_meet = false THEN
      UPDATE public.profiles
      SET 
        no_show_count = no_show_count + 1,
        reputation_score = GREATEST(0, reputation_score - 10),
        reputation_updated_at = now()
      WHERE id = v_request.requester_id;
      
      -- Send notification to receiver
      PERFORM create_adoption_notification(
        v_request.id,
        v_request.requester_id,
        'timeout_cancelled',
        'Yêu cầu tự động hủy',
        'Yêu cầu nhận nuôi đã bị tự động hủy vì bạn không xác nhận hẹn gặp trong thời hạn 3 ngày. Điểm danh tiếng của bạn đã bị trừ 10 điểm.',
        jsonb_build_object('reason', 'receiver_no_confirm')
      );
      
      -- Log activity
      PERFORM log_adoption_activity(
        v_request.id,
        'meeting_confirmation_timeout',
        v_request.requester_id,
        'requester',
        'Tự động hủy do không xác nhận hẹn gặp'
      );
    END IF;
    
    -- Mark no-show for owner if they didn't confirm
    IF v_request.owner_confirmed_meet = false THEN
      UPDATE public.profiles
      SET 
        no_show_count = no_show_count + 1,
        reputation_score = GREATEST(0, reputation_score - 10),
        reputation_updated_at = now()
      WHERE id = v_request.owner_id;
      
      -- Send notification to owner
      PERFORM create_adoption_notification(
        v_request.id,
        v_request.owner_id,
        'timeout_cancelled',
        'Yêu cầu tự động hủy',
        'Yêu cầu nhận nuôi đã bị tự động hủy vì bạn không xác nhận hẹn gặp trong thời hạn 3 ngày. Điểm danh tiếng của bạn đã bị trừ 10 điểm.',
        jsonb_build_object('reason', 'owner_no_confirm')
      );
      
      -- Log activity
      PERFORM log_adoption_activity(
        v_request.id,
        'meeting_confirmation_timeout',
        v_request.owner_id,
        'owner',
        'Tự động hủy do không xác nhận hẹn gặp'
      );
    END IF;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- STEP 8: FUNCTION TO RECORD NO-SHOW AFTER FAILED DELIVERY
-- ================================================================

CREATE OR REPLACE FUNCTION record_no_show_after_delivery(
  p_adoption_request_id uuid,
  p_no_show_party text -- 'receiver' or 'owner'
)
RETURNS jsonb AS $$
DECLARE
  v_request adoption_requests%ROWTYPE;
  v_target_id uuid;
  v_actor_id uuid;
BEGIN
  -- Get the adoption request
  SELECT * INTO v_request FROM public.adoption_requests WHERE id = p_adoption_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Adoption request not found');
  END IF;
  
  -- Determine who is the no-show party
  IF p_no_show_party = 'receiver' THEN
    v_target_id := v_request.requester_id;
    v_actor_id := v_request.owner_id;
  ELSIF p_no_show_party = 'owner' THEN
    v_target_id := v_request.owner_id;
    v_actor_id := v_request.requester_id;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Invalid no_show_party');
  END IF;
  
  -- Update profiles - deduct reputation
  UPDATE public.profiles
  SET 
    no_show_count = no_show_count + 1,
    reputation_score = GREATEST(0, reputation_score - 15),
    reputation_updated_at = now()
  WHERE id = v_target_id;
  
  -- Update adoption_requests to mark no-show
  UPDATE public.adoption_requests
  SET 
    receiver_no_show = CASE WHEN p_no_show_party = 'receiver' THEN true ELSE receiver_no_show END,
    owner_no_show = CASE WHEN p_no_show_party = 'owner' THEN true ELSE owner_no_show END
  WHERE id = p_adoption_request_id;
  
  -- Send notification to no-show person
  PERFORM create_adoption_notification(
    p_adoption_request_id,
    v_target_id,
    'no_show_detected',
    'Ghi nhận không tới gặp',
    'Bạn đã bị ghi nhận là không tới gặp để nhận/giao mèo. Điểm danh tiếng của bạn đã bị trừ 15 điểm. Nếu cảm thấy không công bằng, vui lòng liên hệ admin.',
    jsonb_build_object('party', p_no_show_party, 'reputation_deduct', 15)
  );
  
  -- Send notification to the other party
  PERFORM create_adoption_notification(
    p_adoption_request_id,
    v_actor_id,
    'no_show_detected',
    'Ghi nhận hành vi không tới gặp',
    'Người kia đã không tới gặp để ' || CASE WHEN p_no_show_party = 'receiver' THEN 'nhận' ELSE 'giao' END || ' mèo. Chúng tôi đã ghi nhận sự việc này.',
    jsonb_build_object('party', p_no_show_party)
  );
  
  -- Log activity
  PERFORM log_adoption_activity(
    p_adoption_request_id,
    'no_show_recorded',
    v_actor_id,
    CASE WHEN p_no_show_party = 'receiver' THEN 'owner' ELSE 'requester' END,
    'Ghi nhận ' || CASE WHEN p_no_show_party = 'receiver' THEN 'người nhận' ELSE 'chủ' END || ' không tới gặp'
  );
  
  RETURN jsonb_build_object(
    'success', true, 
    'message', 'No-show recorded and reputation deducted',
    'reputation_deducted', 15
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- STEP 9: TRIGGER TO SET CONFIRMATION DEADLINE ON ACCEPTANCE
-- ================================================================

CREATE OR REPLACE FUNCTION set_confirmation_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- When a request is accepted, set confirmation deadline to 3 days from now
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    NEW.confirmation_deadline := now() + interval '3 days';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_confirmation_deadline ON adoption_requests;

CREATE TRIGGER trigger_set_confirmation_deadline
BEFORE UPDATE ON adoption_requests
FOR EACH ROW
EXECUTE FUNCTION set_confirmation_deadline();

-- ================================================================
-- STEP 10: TRIGGER TO CREATE NOTIFICATIONS ON CONFIRMATION
-- ================================================================

CREATE OR REPLACE FUNCTION notify_on_both_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_name text;
  v_receiver_name text;
BEGIN
  -- When both have confirmed meeting
  IF NEW.receiver_confirmed_meet = true 
     AND NEW.owner_confirmed_meet = true
     AND (OLD.receiver_confirmed_meet = false OR OLD.owner_confirmed_meet = false)
  THEN
    -- Get names
    SELECT display_name INTO v_owner_name FROM public.profiles WHERE id = NEW.owner_id;
    SELECT display_name INTO v_receiver_name FROM public.profiles WHERE id = NEW.requester_id;
    
    -- Notify both parties
    PERFORM create_adoption_notification(
      NEW.id,
      NEW.owner_id,
      'meeting_confirmed_both',
      'Cả 2 đã xác nhận hẹn gặp!',
      'Người nhận ' || COALESCE(v_receiver_name, 'Unknown') || ' cũng đã xác nhận. Mã QR giao mèo đã được tạo.',
      jsonb_build_object('delivery_token', NEW.delivery_token)
    );
    
    PERFORM create_adoption_notification(
      NEW.id,
      NEW.requester_id,
      'meeting_confirmed_both',
      'Cả 2 đã xác nhận hẹn gặp!',
      'Chủ ' || COALESCE(v_owner_name, 'Unknown') || ' cũng đã xác nhận. Mã QR giao mèo đã được tạo.',
      jsonb_build_object('delivery_token', NEW.delivery_token)
    );
    
    -- Log activity
    PERFORM log_adoption_activity(
      NEW.id,
      'meeting_confirmed',
      NEW.owner_id,
      'owner',
      'Cả 2 người đã xác nhận hẹn gặp'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_on_both_confirmed ON adoption_requests;

CREATE TRIGGER trigger_notify_on_both_confirmed
AFTER UPDATE ON adoption_requests
FOR EACH ROW
EXECUTE FUNCTION notify_on_both_confirmed();

-- ================================================================
-- GRANTS
-- ================================================================

GRANT SELECT, INSERT, UPDATE ON public.adoption_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION log_adoption_activity TO authenticated;
GRANT EXECUTE ON FUNCTION create_adoption_notification TO authenticated;
GRANT EXECUTE ON FUNCTION send_meeting_confirmation_reminder TO authenticated;
GRANT EXECUTE ON FUNCTION auto_cancel_unconfirmed_meetings TO authenticated;
GRANT EXECUTE ON FUNCTION record_no_show_after_delivery TO authenticated;

-- ================================================================
-- TEST QUERIES
-- ================================================================

-- Check that new columns were added
-- SELECT * FROM public.profiles LIMIT 1;
-- SELECT * FROM public.adoption_requests LIMIT 1;
-- SELECT * FROM public.adoption_notifications LIMIT 1;
