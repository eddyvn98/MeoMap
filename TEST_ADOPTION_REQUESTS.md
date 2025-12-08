# 🧪 QUICK START - Testing Adoption Requests Flow

## Prerequisites
- ✅ Two test user accounts (or create new ones)
- ✅ One pet listing already created
- ✅ SQL migration executed in Supabase

---

## Test Scenario

### Setup
1. **User A** = Pet Owner (already posted a cat)
2. **User B** = Someone who wants to adopt

---

## Step-by-Step Test

### 1️⃣ SQL Migration (MUST DO FIRST)
```
Go to: Supabase Dashboard → SQL Editor
Paste: All content from ADOPTION_REQUESTS_MIGRATION.sql
Run: Click "Run" button
Wait: For confirmation ✅
```

---

### 2️⃣ Build & Deploy Frontend
```bash
npm run build
npm run dev
```

---

### 3️⃣ Test as Receiver (User B)

**Browser 1 (Incognito/Profile 2):**

1. Go to: `http://localhost:5173`
2. Login as **User B** (receiver)
3. Go to pet detail page of User A's cat
4. Look for button: **"📞 Liên hệ nhận mèo này"**
5. Click it → Alert says "Đã gửi yêu cầu! Chờ chủ bài chấp nhận."
6. **EXPECTED:** Button disappears, shows "⏳ Yêu cầu đang chờ phản hồi"

---

### 4️⃣ Test as Owner (User A)

**Browser 2 (Main/Profile 1):**

1. Go to: Same pet detail page (as User A - the owner)
2. You should see box: **"🏠 Bạn là người đăng bài này"**
3. Scroll down to: **"👥 Người muốn nhận mèo (1)"**
4. Should see User B's request with status: **"⏳ Chờ"**
5. See two buttons:
   - ✅ **Chấp nhận**
   - ❌ **Từ chối**

---

### 5️⃣ Owner Accepts Request

**Browser 2 (Owner):**

1. Click **"✅ Chấp nhận"** button
2. Confirm popup: "Chấp nhận người này?"
3. Click "OK"
4. **EXPECTED:** Alert says "✅ Đã chấp nhận!"
5. Request status changes to: **"✅ Đã chấp nhận"**
6. Now shows:
   - 📞 Contact info of User B
   - Checkbox: "Tôi đã hẹn gặp"

---

### 6️⃣ Both Confirm Meeting

**Browser 1 (Receiver - User B):**

1. Status changed to: **"✅ Chủ bài đã chấp nhận bạn!"**
2. Shows: 📞 **Thông tin liên hệ chủ bài:**
   - Email, Phone
3. Checkbox section: **"⏳ Xác nhận hẹn gặp"**
4. Check the box: ☐ **Tôi đã hẹn gặp với chủ bài**
5. Status below: "⏳ Chủ bài chưa xác nhận"
6. **WAIT** - Don't refresh yet

**Browser 2 (Owner - User A):**

1. Check the box: ☐ **Tôi đã hẹn gặp**
2. Alert: "✅ Đã xác nhận. Chờ người nhận xác nhận..."
3. **EXPECTED:** After User B confirms above, it should say "✅ Cả 2 đã xác nhận gặp!"

---

### 7️⃣ Verify QR Code Generated

**Browser 1 (Receiver - User B):**

1. Refresh page or navigate away and back
2. Should now see: **"📱 MÃ XÁC NHẬN NHẬN MÈO"**
3. Shows:
   - [QR Code image]
   - Mã dự phòng: **ABC12345** (random 8-char code)
4. Message: "Khi gặp chủ bài, mở màn hình này để họ quét mã."

---

### 8️⃣ Owner Verifies Delivery

**Browser 2 (Owner - User A):**

1. Should see button: **"✅ Quét mã & Xác nhận giao mèo"**
2. Click it
3. **EXPECTED:** Redirects to `/deliver/ABC12345`

---

### 9️⃣ Confirm Delivery Page

**Browser 2 (Owner at `/deliver/ABC12345`):**

Should see:
- 🐱 Pet info (name, image)
- 👤 Receiver info (name, contact)
- 💰 Deposit amount
- 🔐 Input field: "Nhập mã xác nhận"
- Mã dự phòng: **ABC12345**

Actions:
1. Copy mã từ trên: **ABC12345**
2. Paste vào input field
3. Click: **"✅ Xác nhận giao mèo"**
4. Confirm: "Bạn chắc chắn đã giao mèo cho người nhận?"
5. Click: "OK"

**EXPECTED:** Alert says "✅ Đã xác nhận giao mèo thành công!"
Redirects back to pet detail page

---

### 🔟 Verify Final Status

**Browser 1 & 2 (Both):**

Refresh pet detail page

**EXPECTED:**
- Pet status: **"delivered"**
- Adoption request status: **"delivered"**
- Can see adoption record created

---

## ✅ Success Indicators

All tests passed if:
1. ✅ Receiver can send contact request
2. ✅ Owner can see and accept request
3. ✅ Both see contact info
4. ✅ Both can confirm meeting
5. ✅ QR code generates automatically
6. ✅ Owner can enter token and confirm delivery
7. ✅ Status updates to "delivered"
8. ✅ No errors in browser console

---

## 🐛 Debugging

**Check browser console:** F12 → Console tab
Look for any red errors

**Common issues:**
- Token mismatch: Copy token exactly, watch for spaces
- User not authenticated: Make sure logged in
- Pet not found: Use correct pet ID
- RLS policy error: Check Supabase SQL for adoption_requests policies

---

## 📞 Support

If errors occur:
1. Check Supabase SQL Editor for any migration errors
2. Verify adoption_requests table exists: 
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_name = 'adoption_requests';
   ```
3. Check RLS policies:
   ```sql
   SELECT policyname, cmd FROM pg_policies WHERE tablename = 'adoption_requests';
   ```

---

**Last Updated:** December 8, 2025
