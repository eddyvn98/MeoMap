# 🔧 Fix: get_topup_requests Return Type Error

## Problem
```
ERROR: 42P13: cannot change return type of existing function
DETAIL: Row type defined by OUT parameters is different.
HINT: Use DROP FUNCTION get_topup_requests(uuid,integer,integer) first.
```

## Solution Applied
Added `DROP FUNCTION IF EXISTS` before creating the new version:

```sql
DROP FUNCTION IF EXISTS public.get_topup_requests(UUID, INTEGER, INTEGER);

CREATE FUNCTION public.get_topup_requests(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (...)
```

## How to Apply

### Option 1: Through Supabase SQL Editor
1. Open Supabase dashboard
2. Go to SQL Editor
3. Run the updated `database/topup_functions_v2.sql`
4. Should succeed now ✅

### Option 2: Through psql (if PostgreSQL is installed)
```bash
psql -U postgres -d meo_map -f database/topup_functions_v2.sql
```

### Option 3: Copy-paste into Supabase
1. Open the SQL file
2. Copy all content
3. Paste into Supabase SQL Editor
4. Run

## Files Updated
✅ `database/topup_functions_v2.sql` - Added DROP FUNCTION statement

## Status
Ready to deploy ✅

---

*The fix drops the old function with the different return type signature before creating the new one with the updated columns (including qr_code_url).*
