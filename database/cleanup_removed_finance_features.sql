-- MeoMap legacy finance cleanup
-- IMPORTANT: Back up production data before applying this migration.
-- This migration matches the simplified product architecture:
-- Adopt/Lost = post + direct contact + close case.
-- Rescue = rescuer accepts case + posts appeal/bank info + direct external support.
-- MeoMap does not hold, settle, refund, or account for user money.

BEGIN;

-- Transaction/workflow tables that are no longer part of the product.
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

-- Adoption transaction/review workflow is no longer used.
DROP TABLE IF EXISTS public.adoption_requests CASCADE;
DROP TABLE IF EXISTS public.adoption_ratings CASCADE;
DROP TABLE IF EXISTS public.adoption_reports CASCADE;
DROP TABLE IF EXISTS public.adoption_feedback CASCADE;

-- Remove wallet balances from user profiles.
ALTER TABLE IF EXISTS public.profiles
  DROP COLUMN IF EXISTS wallet_credit,
  DROP COLUMN IF EXISTS balance_main,
  DROP COLUMN IF EXISTS balance_coc,
  DROP COLUMN IF EXISTS balance_thuong;

-- Remove system-managed money metadata from cases.
-- Rescuer bank/contact fields are intentionally preserved because support is direct.
ALTER TABLE IF EXISTS public.pets
  DROP COLUMN IF EXISTS required_deposit,
  DROP COLUMN IF EXISTS allow_custom_deposit,
  DROP COLUMN IF EXISTS bounty_amount,
  DROP COLUMN IF EXISTS max_deposit,
  DROP COLUMN IF EXISTS deposit_amount,
  DROP COLUMN IF EXISTS total_donations;

COMMIT;
