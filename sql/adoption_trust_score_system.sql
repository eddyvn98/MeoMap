-- Trust Score System for Adoption Requests
-- 3 factors: Completion (60) + Responsiveness (20) + Rating (20) = 100 max

-- Table: adoption_scores - Lưu điểm chi tiết từng giao dịch
CREATE TABLE public.adoption_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  adoption_request_id uuid NOT NULL,
  user_id uuid NOT NULL, -- người được đánh giá
  rater_id uuid NOT NULL, -- người đánh giá
  
  -- Factor 1: Completion (0-60)
  completion_score smallint NOT NULL DEFAULT 0,
  completion_notes text NULL,
  
  -- Factor 2: Responsiveness (0-20)
  responsiveness_score smallint NOT NULL DEFAULT 0,
  response_time_hours smallint NULL, -- tính từ request tới response đầu tiên
  
  -- Factor 3: Rating (0-20)
  rating_score smallint NOT NULL DEFAULT 0,
  rating_type text NULL, -- 'good'(+20), 'neutral'(+10), 'bad'(0)
  rating_comment text NULL,
  
  -- Total score
  total_score smallint GENERATED ALWAYS AS (completion_score + responsiveness_score + rating_score) STORED,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  CONSTRAINT adoption_scores_pkey PRIMARY KEY (id),
  CONSTRAINT adoption_scores_request_fkey FOREIGN KEY (adoption_request_id) REFERENCES adoption_requests (id) ON DELETE CASCADE,
  CONSTRAINT adoption_scores_user_fkey FOREIGN KEY (user_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT adoption_scores_rater_fkey FOREIGN KEY (rater_id) REFERENCES profiles (id) ON DELETE CASCADE,
  CONSTRAINT adoption_scores_unique_rating UNIQUE (adoption_request_id, rater_id),
  CONSTRAINT adoption_scores_completion_check CHECK (completion_score >= 0 AND completion_score <= 60),
  CONSTRAINT adoption_scores_responsiveness_check CHECK (responsiveness_score >= 0 AND responsiveness_score <= 20),
  CONSTRAINT adoption_scores_rating_check CHECK (rating_score >= 0 AND rating_score <= 20)
);

CREATE INDEX idx_adoption_scores_user ON public.adoption_scores(user_id);
CREATE INDEX idx_adoption_scores_request ON public.adoption_scores(adoption_request_id);
CREATE INDEX idx_adoption_scores_created_at ON public.adoption_scores(created_at DESC);

-- View: user_trust_score - Tính tổng Trust Score cho mỗi user
CREATE OR REPLACE VIEW public.user_trust_score AS
SELECT 
  p.id as user_id,
  p.display_name,
  COUNT(DISTINCT ar.id) as total_transactions,
  COALESCE(ROUND(AVG(s.total_score)), 0) as trust_score,
  CASE 
    WHEN COALESCE(AVG(s.total_score), 0) >= 80 THEN 'Uy tín cao'
    WHEN COALESCE(AVG(s.total_score), 0) >= 50 THEN 'Tạm ổn'
    ELSE 'Rủi ro'
  END as trust_level,
  COUNT(CASE WHEN s.rating_type = 'good' THEN 1 END) as good_ratings,
  COUNT(CASE WHEN s.rating_type = 'neutral' THEN 1 END) as neutral_ratings,
  COUNT(CASE WHEN s.rating_type = 'bad' THEN 1 END) as bad_ratings
FROM profiles p
LEFT JOIN adoption_requests ar ON (p.id = ar.requester_id OR p.id = ar.owner_id)
LEFT JOIN adoption_scores s ON (ar.id = s.adoption_request_id AND p.id = s.user_id)
WHERE ar.status = 'completed'
GROUP BY p.id, p.display_name;

-- Function: auto_calculate_completion_score
-- Tính điểm hoàn tất dựa vào status flow
CREATE OR REPLACE FUNCTION public.calculate_completion_score(
  p_status text,
  p_owner_confirmed_checkin boolean,
  p_receiver_confirmed_checkin boolean
)
RETURNS smallint AS $$
BEGIN
  -- Giao thành công + quét QR + xác nhận checkin = 60 điểm
  IF p_status = 'completed' AND p_owner_confirmed_checkin AND p_receiver_confirmed_checkin THEN
    RETURN 60;
  -- Hủy đúng cách (không đến quét mã) = 30 điểm
  ELSIF p_status = 'cancelled' THEN
    RETURN 30;
  -- Bomb lịch / không giao = 0
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: auto_calculate_responsiveness_score
-- Tính điểm phản hồi dựa vào thời gian từ accepted tới confirmed_meet
CREATE OR REPLACE FUNCTION public.calculate_responsiveness_score(
  p_accepted_at timestamp with time zone,
  p_confirmed_at timestamp with time zone
)
RETURNS smallint AS $$
DECLARE
  v_hours integer;
BEGIN
  IF p_accepted_at IS NULL OR p_confirmed_at IS NULL THEN
    RETURN 0; -- Không phản hồi trong 24h
  END IF;
  
  v_hours := EXTRACT(EPOCH FROM (p_confirmed_at - p_accepted_at)) / 3600;
  
  -- Trả lời nhanh (< 24h) = +20
  IF v_hours < 24 THEN
    RETURN 20;
  -- Trả lời chậm (24-72h) = +10
  ELSIF v_hours < 72 THEN
    RETURN 10;
  -- Không phản hồi (> 72h) = 0
  ELSE
    RETURN 0;
  END IF;
END;
$$ LANGUAGE plpgsql;
