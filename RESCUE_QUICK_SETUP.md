# 🚀 Quick Setup Guide - Rescue Management System

## ⚡ Quick Steps

### 1️⃣ Run Database Migration
```sql
-- Mở Supabase SQL Editor
-- Copy & Paste từ: database/RESCUE_MANAGEMENT_MIGRATION.sql
-- Click "Run" hoặc Ctrl+Enter
```

**Thay đổi được tạo:**
- ✅ `rescue_appeals` table
- ✅ `rescue_updates` table
- ✅ Thêm cột vào `pets` table

### 2️⃣ Verify Files Created
Kiểm tra các file này đã tồn tại:
- ✅ `src/components/RescueActivityPanel.jsx`
- ✅ `src/components/RescuerDashboard.jsx`
- ✅ `src/pages/RescuerPage.jsx`

### 3️⃣ Verify Files Modified
Kiểm tra các file này đã chỉnh sửa:
- ✅ `src/components/RescuePetDetail.jsx` - Thêm import + RescueActivityPanel
- ✅ `src/router.jsx` - Thêm import + route /rescuer
- ✅ `src/components/Header.jsx` - Thêm link "🚑 Cứu hộ"

### 4️⃣ Test the Flow

**Test Case 1: Access Rescuer Dashboard**
```
1. Go to http://localhost:5173/rescuer
2. Should see "🚑 Bảng điều khiển cứu hộ"
3. Tabs: "📍 Ca cứu hộ khẩn cấp" + "🎯 Ca của tôi"
```

**Test Case 2: Create Rescue Case**
```
1. Create a rescue pet post (category: "rescue")
2. Add bounty amount (hỗ trợ cứu hộ)
3. Post the case
```

**Test Case 3: Accept Rescue Case**
```
1. Go to /rescuer
2. See the case in "📍 Ca cứu hộ khẩn cấp" tab
3. Click "✋ Nhận ca cứu hộ"
4. Should move to "🎯 Ca của tôi" tab
```

**Test Case 4: Manage Rescue**
```
1. Click on case in "🎯 Ca của tôi" → "🎯 Vào Trung tâm cứu hộ"
2. Or go to pet-detail page directly
3. Should see "🚑 Trung tâm cứu hộ" panel with 4 tabs:
   - 📊 Tổng quan
   - 📢 Kêu gọi ủng hộ
   - 📸 Cập nhật tình hình
   - ✅ Hoàn thành ca
```

**Test Case 5: Appeal for Support**
```
1. Click "📢 Kêu gọi" tab
2. Fill in title & content
3. Click "📢 Gửi kêu gọi"
4. Check Supabase: rescue_appeals table should have new row
```

**Test Case 6: Update Status**
```
1. Click "📸 Cập nhật" tab
2. Fill in title, content, cost (optional)
3. Click "📸 Thêm cập nhật"
4. Check Supabase: rescue_updates table should have new row
```

**Test Case 7: Complete Case**
```
1. Click "✅ Hoàn thành" tab
2. Fill in completion notes
3. Click "✅ Hoàn thành ca cứu hộ"
4. Should see "✅ Ca cứu hộ đã hoàn thành!" message
5. Check Supabase: pets.status should be 'delivered'
```

## 🔍 Debugging Checklist

| Issue | Solution |
|-------|----------|
| Button "🚑 Cứu hộ" not showing | Check `Header.jsx` has Link import |
| `/rescuer` route not found | Check `router.jsx` has RescuerPage import + route |
| RescueActivityPanel not showing | Check `RescuePetDetail.jsx` has isRescuer logic |
| Database error on submit | Run RESCUE_MANAGEMENT_MIGRATION.sql |
| Tables not found in Supabase | Check SQL migration ran without errors |

## 📊 Database Verification

Open Supabase SQL Editor and run:
```sql
-- Check rescue_appeals table
SELECT * FROM rescue_appeals LIMIT 5;

-- Check rescue_updates table
SELECT * FROM rescue_updates LIMIT 5;

-- Check pets table for new columns
SELECT id, rescuer_id, status, completed_at FROM pets WHERE category = 'rescue' LIMIT 5;
```

Should return results without errors.

## 🎨 UI Preview

```
Header
├─ Home | Map | Wallet | 🚑 Cứu hộ | ...
└─ (Click 🚑 → /rescuer)

/rescuer Page
├─ 🚑 Bảng điều khiển cứu hộ
├─ Tabs: [📍 Ca cứu hộ khẩn cấp] [🎯 Ca của tôi]
│
├─ Tab 1: 📍 Ca cứu hộ khẩn cấp
│  ├─ Card 1: [Ảnh] Tên | 💰 Hỗ trợ | Nội dung | [✋ Nhận ca]
│  └─ Card 2: [Ảnh] Tên | 💰 Hỗ trợ | Nội dung | [✋ Nhận ca]
│
└─ Tab 2: 🎯 Ca của tôi
   ├─ Card 1: [Ảnh] Tên | ⏳ Đang tiến hành | [🎯 Vào Trung tâm]
   └─ Card 2: [Ảnh] Tên | ✅ Đã hoàn thành | [📋 Xem chi tiết]

Pet Detail Page (rescue category)
├─ Pet Info (image, name, location)
├─ Bounty Widget (if not closed)
├─ 🚑 Trung tâm cứu hộ (if isRescuer)
│  ├─ [📊 Tổng quan] [📢 Kêu gọi] [📸 Cập nhật] [✅ Hoàn thành]
│  └─ (Tab content changes based on activeTab)
├─ Donation Widget
├─ Donor List
└─ ...other sections
```

## 📝 Code Structure

```
src/
├─ components/
│  ├─ RescueActivityPanel.jsx (NEW) - Rescuer management UI
│  ├─ RescuerDashboard.jsx (NEW) - List & accept rescues
│  ├─ RescuePetDetail.jsx (MODIFIED) - Added RescueActivityPanel
│  └─ Header.jsx (MODIFIED) - Added 🚑 link
│
├─ pages/
│  └─ RescuerPage.jsx (NEW) - Main rescuer page
│
└─ router.jsx (MODIFIED) - Added /rescuer route

database/
└─ RESCUE_MANAGEMENT_MIGRATION.sql (NEW) - DB schema

docs/
├─ RESCUE_MANAGEMENT_SYSTEM.md (NEW) - Full guide
└─ RESCUE_MANAGEMENT_CHANGES.md (NEW) - Summary
```

## 🚨 Common Issues & Fixes

### Issue 1: "Cannot find module RescueActivityPanel"
**Fix**: Check file exists at `src/components/RescueActivityPanel.jsx`

### Issue 2: "/rescuer route not found"
**Fix**: Check `src/router.jsx` imports RescuerPage correctly

### Issue 3: "Database error: table 'rescue_appeals' not found"
**Fix**: Run RESCUE_MANAGEMENT_MIGRATION.sql in Supabase

### Issue 4: "isRescuer is undefined"
**Fix**: Check `RescuePetDetail.jsx` has:
```jsx
const isRescuer = user && pet.rescuer_id && pet.rescuer_id === user.id;
```

### Issue 5: Button styling looks different
**Fix**: Components use Tailwind CSS, ensure `tailwind.config.js` is configured

## ✅ Verification Checklist

After setup, verify:
- [ ] `/rescuer` page loads without errors
- [ ] Can see list of rescue cases
- [ ] Can click "✋ Nhận ca cứu hộ" button
- [ ] Case moves from Tab 1 to Tab 2
- [ ] Can access "🚑 Trung tâm cứu hộ" from pet detail
- [ ] Can submit "📢 Kêu gọi ủng hộ"
- [ ] Data appears in rescue_appeals table
- [ ] Can submit "📸 Cập nhật tình hình"
- [ ] Data appears in rescue_updates table
- [ ] Can complete case with "✅ Hoàn thành ca"
- [ ] Case status changes to 'delivered'

## 🎯 Next Steps

After verification:
1. Add notification system for new appeals
2. Add timeline view of all updates
3. Add QR code scanning for confirmation
4. Add rating/review system for rescuers
5. Add map view for rescue cases

## 📞 Need Help?

Check these files:
- `RESCUE_MANAGEMENT_SYSTEM.md` - Detailed guide
- `RESCUE_MANAGEMENT_CHANGES.md` - What changed
- `database/RESCUE_MANAGEMENT_MIGRATION.sql` - Database schema
