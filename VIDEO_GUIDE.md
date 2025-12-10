# 🎬 VIDEO GUIDE - HƯỚNG DẪN 5 PHÚT

## 📺 Các bước thực hiện (theo thứ tự)

### ⏱️ PHÚT 1-2: Chạy SQL Migration

**Video này quay:**
1. Mở Supabase Dashboard
2. Click **SQL Editor** ở sidebar
3. Click **New query**
4. Mở file `SUPABASE_MIGRATION_SIMPLE.sql`
5. Copy toàn bộ
6. Paste vào SQL Editor
7. Click **RUN** (hoặc Ctrl+Enter)
8. Chờ ~10 giây
9. Thấy message "Success!" ở dưới
10. Check kết quả:
    ```sql
    SELECT user_qr_id FROM profiles LIMIT 5;
    -- Phải thấy QR-ID như: USER-A1B2C3D4
    ```

**Nếu lỗi:**
- Đọc error message
- Thường là do constraint conflict → Drop constraint cũ trước
- Copy lỗi và Google

---

### ⏱️ PHÚT 3: Test Flow Người Nhận

**Video này quay:**
1. Login user bình thường (không phải owner)
2. Vào trang chủ `/`
3. Click vào 1 bài mèo **Cho nhận**
4. Scroll xuống phần "Đặt cọc"
5. Nhập số tiền: `50000`
6. Click **"Đặt cọc & hiện mã QR"**
7. ✅ **Kỳ vọng:** Thấy QR code hiện ra
8. Chụp màn hình QR này (để test sau)

**Quan sát:**
- QR code có text phía dưới: `USER-XXXXXXXX`
- Có text hướng dẫn: "Cho chủ bài quét mã này"
- Có checklist 5 điểm ở dưới

---

### ⏱️ PHÚT 4: Test Flow Owner

**Video này quay:**
1. Logout → Login lại bằng tài khoản owner (người đăng bài)
2. Vào trang chi tiết bài mèo của mình
3. ✅ **Kỳ vọng:** Thấy nút **"📋 Quản lý người đặt cọc (1)"**
4. Click vào nút đó
5. Chuyển sang page `/account/adopt/:petId/applicants`
6. ✅ **Kỳ vọng:** Thấy:
   - Section "Người đã đặt cọc (1)"
   - Thông tin người nhận
   - Nút **"📷 Quét QR xác nhận"**
   - Nút **"✅ Xác nhận giao"** ở mỗi người

**Test 2 cách xác nhận:**

#### Cách 1: Quét QR
1. Click **"📷 Quét QR xác nhận"**
2. Modal mở ra
3. Cho phép camera
4. Đưa QR code (đã chụp ở bước trước) vào camera
5. ✅ Quét thành công → Alert "Đã xác nhận giao mèo!"
6. Page reload
7. Thấy người đó chuyển sang section "Chờ đánh giá"

#### Cách 2: Chọn từ danh sách
1. Tại mỗi người cọc, click **"✅ Xác nhận giao"**
2. Confirm dialog
3. Click OK
4. ✅ Kỳ vọng: Cùng kết quả như quét QR

---

### ⏱️ PHÚT 5: Test Đánh Giá

**Video này quay:**
1. Sau khi xác nhận giao (bước trước)
2. Trong section **"Chờ đánh giá"**
3. Thấy:
   - Timer đếm ngược: "⏰ Còn 3d 0h"
   - Tên người nhận
   - 2 nút: **"✅ Tốt"** và **"❌ Xấu"**

**Test đánh giá TỐT:**
1. Click **"✅ Tốt"**
2. Confirm: "Xác nhận đánh giá TỐT?"
3. Click OK
4. Alert: "Đã ghi nhận đánh giá!"
5. Page reload
6. Người đó biến mất khỏi "Chờ đánh giá"
7. Xuất hiện ở "Lịch sử"

**Kiểm tra voucher:**
1. Vào Supabase Dashboard
2. Table Editor → `vouchers`
3. ✅ Thấy 1 row mới:
   - `user_id` = người nhận
   - `amount` = 50000
   - `status` = 'active'

---

## 🎥 Recording Tips

### Công cụ quay:
- **Windows:** Xbox Game Bar (Win+G)
- **Mac:** QuickTime Player
- **Chrome:** Loom extension

### Checklist trước khi quay:
- [ ] Clear cache & cookies
- [ ] Zoom browser to 100%
- [ ] Hide bookmarks bar
- [ ] Close other tabs
- [ ] Prepare 2 accounts (user & owner)
- [ ] Have QR code image ready

### Video specs:
- Resolution: 1920x1080 (1080p)
- Format: MP4
- Duration: 5-7 minutes
- Voiceover: Tiếng Việt (optional)

---

## 📝 Script đọc (nếu có voiceover)

### Intro (15s)
"Xin chào! Hôm nay mình sẽ hướng dẫn cách setup quy trình nhận mèo mới trên MeoMap. Quy trình này đơn giản hơn rất nhiều - chỉ 2 clicks thay vì 10+."

### Phần 1: SQL (45s)
"Đầu tiên, chúng ta cần chạy SQL migration trên Supabase. Vào SQL Editor, copy file migration, paste vào và click RUN. Đợi khoảng 10 giây cho xong."

### Phần 2: User (60s)
"Giờ test flow người nhận. Login vào app, vào bài mèo, nhập số tiền cọc và đặt cọc. Sau khi đặt cọc, một mã QR sẽ hiện ra. Đây là mã QR cố định của bạn - chủ bài sẽ quét cái này để xác nhận giao mèo."

### Phần 3: Owner (90s)
"Giờ login bằng tài khoản owner. Vào trang chi tiết bài mèo, bấm 'Quản lý người đặt cọc'. Ở đây bạn thấy danh sách người đã cọc. Có 2 cách xác nhận: quét QR hoặc chọn trực tiếp từ danh sách. Khi xác nhận, tiền cọc sẽ bị khóa ngay lập tức trong 3 ngày."

### Phần 4: Review (60s)
"Sau khi xác nhận giao, owner có 3 ngày để đánh giá. Nếu tốt, voucher sẽ được tạo cho người nhận. Nếu xấu, voucher cho owner. Sau 3 ngày không đánh giá, hệ thống tự động đánh giá tốt."

### Outro (15s)
"Vậy là xong! Quy trình cực kỳ đơn giản. Mọi thắc mắc vui lòng comment bên dưới. Cảm ơn các bạn đã xem!"

---

## 📤 Chia sẻ video

Upload lên:
- YouTube (Public/Unlisted)
- Google Drive
- Loom
- Notion

Share link cho team.

---

## ✅ Checklist sau khi quay

- [ ] Video chạy mượt, không lag
- [ ] Audio rõ ràng (nếu có)
- [ ] Tất cả bước đều demo thành công
- [ ] Upload lên cloud
- [ ] Share link trong team chat
- [ ] Thêm vào README.md

**Done! 🎉**
