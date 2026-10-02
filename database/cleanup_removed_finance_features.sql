-- MeoMap legacy workflow/finance cleanup
-- IMPORTANT: back up production before running this migration.
-- Target architecture:
--   Adopt/Lost = post + direct contact + close case.
--   Rescue = rescuer accepts case + posts appeal/contact info + direct external support.
-- MeoMap does not hold, settle, refund, or account for user money.

BEGIN;

-- ------------------------------------------------------------------
-- 1. Remove finance / commerce tables
-- ------------------------------------------------------------------
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.withdrawal_requests CASCADE;
DROP TABLE IF EXISTS public.withdrawal_orders CASCADE;
DROP TABLE IF EXISTS public.topup_requests CASCADE;
DROP TABLE IF EXISTS public.user_vouchers CASCADE;
DROP TABLE IF EXISTS public.vouchers CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.case_wallet CASCADE;
DROP TABLE IF EXISTS public.donations CASCADE;
DROP TABLE IF EXISTS public.bounties CASCADE;
DROP TABLE IF EXISTS public.bounty_claims CASCADE;
DROP TABLE IF EXISTS public.deposits CASCADE;

-- ------------------------------------------------------------------
-- 2. Remove old adoption transaction / trust workflow tables
-- ------------------------------------------------------------------
DROP TABLE IF EXISTS public.adoption_requests CASCADE;
DROP TABLE IF EXISTS public.adoption_ratings CASCADE;
DROP TABLE IF EXISTS public.adoption_reports CASCADE;
DROP TABLE IF EXISTS public.adoption_feedback CASCADE;
DROP TABLE IF EXISTS public.adoption_activities CASCADE;
DROP TABLE IF EXISTS public.adoption_checkins CASCADE;
DROP TABLE IF EXISTS public.adoption_emails CASCADE;
DROP TABLE IF EXISTS public.adoption_tickets CASCADE;
DROP TABLE IF EXISTS public.adoptions CASCADE;
DROP TABLE IF EXISTS public.user_report_stats CASCADE;
DROP TABLE IF EXISTS public.user_reputation CASCADE;

DROP VIEW IF EXISTS public.user_reputation_score CASCADE;

-- ------------------------------------------------------------------
-- 3. Remove old finance RPCs regardless of overload signature
-- ------------------------------------------------------------------
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND (
        p.proname ILIKE '%wallet%'
        OR p.proname ILIKE '%topup%'
        OR p.proname ILIKE '%voucher%'
        OR p.proname ILIKE '%withdraw%'
        OR p.proname ILIKE '%deposit%'
        OR p.proname ILIKE '%bounty%'
        OR p.proname ILIKE '%donation%'
        OR p.proname IN (
          'purchase_product',
          'finish_delivery_with_refund',
          'refund_delivery',
          'cancel_delivery'
        )
      )
  LOOP
    EXECUTE format(
      'DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
  END LOOP;
END
$$;

-- ------------------------------------------------------------------
-- 4. Remove platform-managed balances from profiles
-- ------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles
  DROP COLUMN IF EXISTS wallet_credit,
  DROP COLUMN IF EXISTS balance_main,
  DROP COLUMN IF EXISTS balance_coc,
  DROP COLUMN IF EXISTS balance_thuong;

-- ------------------------------------------------------------------
-- 5. Remove system-managed money metadata from cases
-- Direct rescuer bank/contact fields are intentionally preserved.
-- ------------------------------------------------------------------
ALTER TABLE IF EXISTS public.pets
  DROP COLUMN IF EXISTS required_deposit,
  DROP COLUMN IF EXISTS allow_custom_deposit,
  DROP COLUMN IF EXISTS bounty_amount,
  DROP COLUMN IF EXISTS max_deposit,
  DROP COLUMN IF EXISTS deposit_amount,
  DROP COLUMN IF EXISTS total_donations;

-- Rescue appeal/update tables remain, but no longer track budgets or money totals.
ALTER TABLE IF EXISTS public.rescue_appeals
  DROP COLUMN IF EXISTS requested_budget;

ALTER TABLE IF EXISTS public.rescue_updates
  DROP COLUMN IF EXISTS spent_cost;

COMMIT;
