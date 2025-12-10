# Troubleshooting: Adoption Pet Detail Page Not Showing Correctly

## Issue
When clicking on an adoption pet marker → popup → detail button, the page doesn't show the correct adoption detail component (shows rescue/lost pet page instead).

## Root Cause Analysis
Added debugging console logs to identify where the issue occurs:

**Files Modified:**
1. `src/pages/PetDetailPage.jsx` - Added console.log messages:
   - Line 121-131: Logs when pet data is loaded from DB
   - Line 762, 783, 801: Logs which component is being rendered (LOST, RESCUE, or ADOPTION)

## Debug Steps

### Step 1: Check Browser Console
1. Open the map page
2. Open browser DevTools (F12 or Ctrl+Shift+I)
3. Go to Console tab
4. Click on an adoption pet marker → popup → "Xem chi tiết" button
5. Look for messages:
   - `🐾 Loaded pet from DB: {id, name, category, status}` - Shows what pet data was loaded
   - `🔍 Rendering LOST pet: ...` OR `🚒 Rendering RESCUE pet: ...` OR `👶 Rendering ADOPTION pet: ...` - Shows which component is rendering

### Step 2: Interpret Results

**If you see `👶 Rendering ADOPTION pet`:**
- ✅ Adoption detail page IS rendering correctly
- The issue might be CSS/styling or component display problem
- Check if content is scrolled off-screen or hidden

**If you see `🚒 Rendering RESCUE pet` or `🔍 Rendering LOST pet`:**
- ❌ Wrong component is rendering
- Likely cause: pet.category value is not "adopt"
- Check the loaded pet data - what is the category value?

### Step 3: If Wrong Component is Rendering

1. Note the pet.category value from the console logs
2. Go to Supabase dashboard → pets table
3. Search for the pet by ID or name (from console logs)
4. Check its `category` column value - should be 'adopt', 'lost', or 'rescue'
5. If it's wrong, update it:
   - Right-click row → Edit record
   - Set category = 'adopt'
   - Save

### Step 4: Run Migration (If needed)

If category column doesn't exist:
1. Open `ADD_CATEGORY_COLUMN.sql`
2. Copy the SQL
3. Go to Supabase Dashboard → SQL Editor
4. Paste the SQL and run it

## Expected Behavior

After adoption pet is selected:
1. Page should show `👶 Rendering ADOPTION pet: [pet name] - category: adopt`
2. Page displays:
   - Pet image, name, status, district, time
   - Owner info (if owner is viewing)
   - Description
   - Deposit info
   - Applicants list (for owner)
   - Request form (for other users)

## Prevention

Code changes ensure:
✅ Category defaults to 'adopt' if null (line 117-121 in PetDetailPage.jsx)
✅ Proper conditional rendering based on category (lines 762-801 in PetDetailPage.jsx)
✅ Console logs for debugging (lines 121-131, 762, 783, 801)

---

**Need Help?**
1. Share the console.log output
2. Share the category value from Supabase dashboard
3. Describe what UI elements you see on the page
