-- Add checkin system fields to adoption_requests
-- Quy trình sau giao mèo: Người nhận phải xác nhận sau 1-7 ngày, người đăng xác nhận hoàn thành

ALTER TABLE public.adoption_requests
ADD COLUMN checkin_days smallint NOT NULL DEFAULT 1,
ADD COLUMN checkin_required_at timestamp with time zone NULL,
ADD COLUMN owner_confirmed_checkin boolean NOT NULL DEFAULT false,
ADD COLUMN owner_confirmed_checkin_at timestamp with time zone NULL,
ADD COLUMN receiver_confirmed_checkin boolean NOT NULL DEFAULT false,
ADD COLUMN receiver_confirmed_checkin_at timestamp with time zone NULL;

-- Update status CHECK constraint to include 'completed'
ALTER TABLE public.adoption_requests
DROP CONSTRAINT adoption_requests_status_check;

ALTER TABLE public.adoption_requests
ADD CONSTRAINT adoption_requests_status_check CHECK (
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
);

-- Create index for checkin_required_at for easier queries
CREATE INDEX IF NOT EXISTS idx_adoption_requests_checkin_required_at 
ON public.adoption_requests(checkin_required_at) 
WHERE status = 'delivered';

-- Function to auto-set checkin_required_at when status = delivered
CREATE OR REPLACE FUNCTION public.set_checkin_required_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' AND NEW.checkin_required_at IS NULL THEN
    NEW.checkin_required_at := NOW() + (NEW.checkin_days || ' days')::interval;
  END IF;
  
  -- Auto-complete when both confirmed checkin
  IF NEW.owner_confirmed_checkin AND NEW.receiver_confirmed_checkin AND NEW.status = 'delivered' THEN
    NEW.status := 'completed';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set checkin_required_at
DROP TRIGGER IF EXISTS trigger_set_checkin_required_at ON public.adoption_requests;
CREATE TRIGGER trigger_set_checkin_required_at
BEFORE UPDATE ON public.adoption_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_checkin_required_at();
