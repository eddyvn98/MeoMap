# ✅ Fixed Function Signature Conflicts

## Problem
PostgreSQL couldn't determine which function to use because multiple versions existed with overlapping signatures:
```
public.create_topup_request(p_user_id => uuid, p_amount => integer, p_payment_method => text, p_notes => text)
public.create_topup_request(p_user_id => uuid, p_amount => integer, p_payment_method => text, p_notes => text, p_qr_code_url => text)
```

## Root Cause
Old functions had default parameters that made them callable with fewer arguments. When the new functions with additional parameters were added, PostgreSQL couldn't determine which version to use.

## Solution Applied
Added `DROP FUNCTION IF EXISTS` statements before all function definitions in `topup_functions_v2.sql`:

```sql
-- Drop old versions before creating new ones
DROP FUNCTION IF EXISTS public.generate_topup_order_code();
DROP FUNCTION IF EXISTS public.create_topup_request(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.confirm_topup_payment(TEXT);
DROP FUNCTION IF EXISTS public.cancel_topup_request(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_topup_requests(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.verify_topup_order(TEXT);
```

## Files Updated
✅ `database/topup_functions_v2.sql` - Added DROP FUNCTION statements for all conflicting functions

## Next Steps
Run the updated SQL file in Supabase:

1. Open **Supabase SQL Editor**
2. Open `database/topup_functions_v2.sql`
3. **Run** the file
4. All functions should now be created successfully ✅

## Why This Works
- `DROP FUNCTION IF EXISTS` safely removes old versions without errors
- Specifies exact parameter types to drop only the conflicting versions
- New functions with updated signatures can then be created cleanly
- No data loss (functions are schema, not data)

---

**Status**: Ready to deploy ✅
