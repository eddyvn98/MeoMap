# ✅ CHECKLIST: LUỒNG HOẠT ĐỘNG CỦA NGƯỜI NHẬN CA CỨU HỘ

## 1️⃣ BƯỚC 1: NHẬN CA CỨU HỘ
**Vị trí:** RescuePetDetail.jsx - Lines 223-229
- Nút: **✋ Nhận ca cứu hộ**
- Visible: Nếu `!pet.rescuer_id && user exists`
- Hành động:
  - ✅ Confirm dialog
  - ✅ Update `pets.rescuer_id = user.id`
  - ✅ Alert: "Vui lòng cập nhật thông tin ngân hàng"
  - ✅ Set `editingBankInfo = true` (auto open edit form)
  - ✅ Reload page

---

## 2️⃣ BƯỚC 2: CẬP NHẬT THÔNG TIN NGÂN HÀNG
**Vị trí:** RescuePetDetail.jsx - Lines 310-415
- Nút: **✏️ Chỉnh sửa** (visible khi `isRescuer && !editingBankInfo`)
- Form fields:
  - 📱 **Số tài khoản** (Required)
  - 👤 **Tên chủ tài khoản** (Required)
  - 🏦 **Ngân hàng** (Required)
  - 📸 **Upload ảnh Mã QR** (Optional - NEW with file upload)

### Upload QR Logic:
```javascript
- File input accept="image/*"
- Show current image preview if exists
- Show ✓ indicator if new file selected
- onClick "💾 Lưu":
  - Upload to storage: bank-qr/{petId}_{timestamp}.{ext}
  - Get public URL
  - Save to rescuer_bank_qr_code_url
  - Reload page
```

- Nút: **💾 Lưu**
  - ✅ Upload file (if selected)
  - ✅ Save all 4 fields to pets table
  - ✅ Alert: "✅ Đã cập nhật thông tin ngân hàng!"
  - ✅ Reload page

- Nút: **✖️ Hủy**
  - ✅ Reset form
  - ✅ Reset qrFile state
  - ✅ Close edit mode

---

## 3️⃣ BƯỚC 3: QUẢN LÝ CA CỨU HỘ (Tabs Panel)
**Vị trí:** RescueActivityPanel.jsx - Called from RescuePetDetail.jsx Line 282
**Visible:** Khi `isRescuer && !isClosed`

### Tab 1: 📋 **TỔNG QUAN (Overview)**
- Hiển thị:
  - Ca cứu hộ info
  - Người đăng
  - Tiền hỗ trợ
  - ⚠️ Self-rescue warning (nếu owner == rescuer)
    - "Bạn tự cứu ca của chính mình"
    - KHÔNG nhận tiền hỗ trợ ban đầu
  - Bounties available (if any)
  - Donation amount total
  - Timeline của hoạt động

### Tab 2: 📢 **KỀU GỌI HỖ TRỢ (Appeal)**
- Form: `handleAddAppeal()`
- Inputs:
  - Title
  - Description
  - Required amount (optional)
- Button: **📢 Gửi kêu gọi**
  - ✅ Validate
  - ✅ Save to appeals table
  - ✅ Alert: "✅ Đã gửi kêu gọi hỗ trợ"

### Tab 3: 📸 **CẬP NHẬT TÌNH HÌNH (Updates)**
- Form: `handleAddUpdate()`
- Inputs:
  - Description (textarea)
  - Image URLs (comma separated)
- Button: **📸 Thêm cập nhật**
  - ✅ Validate
  - ✅ Save to updates table
  - ✅ Reload updates list

### Tab 4: ✅ **HOÀN THÀNH CA (Complete)**
- Form: `handleCompleteCase()`
- Warnings:
  - **IF self-rescue:**
    - ⚠️ "Bạn tự cứu ca của chính mình"
    - ❌ KHÔNG nhận tiền hỗ trợ ban đầu
    - ✅ Nhận quyên góp từ cộng đồng
  - **IF normal rescue:**
    - ✅ Tiền hỗ trợ ban đầu ({bounty_amount}đ) được giải ngân
    - ✅ Quyên góp được xử lý

- Inputs:
  - 📝 **Báo cáo hoàn thành** (textarea required)
  - 📸 **Ảnh hoàn thành** (image URLs, optional)

- Button: **✅ Hoàn thành ca cứu hộ**
  - ✅ Confirm dialog
  - ✅ Update `pets.status = "delivered"`
  - ✅ Check if self-rescue → Show different alert
  - ✅ Save completion_notes & completion_images
  - ✅ Alert user about bounty status
  - ✅ Reload page

---

## 4️⃣ NÚT KHÁC (Ngoài Tabs)

### 💬 **Xem Bounties** (BountyWidget - Lines 293-296)
- Hiển thị: Tổng tiền treo thưởng + số người treo
- Nút: **✔ Nhận [n] khoản** (if available bounties)
  - ✅ Select checkboxes for bounties
  - ✅ Accept bounties → transfer to rescuer wallet (balance_coc)
  - ✅ Bounty status change to "accepted"

### 🏦 **Thông tin Chuyển khoản** (Lines 310-450)
- Hiển thị: Thông tin bank của rescuer
- Nút: **✏️ Chỉnh sửa** → Open edit form (see Step 2)

---

## 🎯 COMPLETE FLOW CHECKLIST

- [ ] User clicks **✋ Nhận ca cứu hộ**
  - [ ] rescuer_id updated in database
  - [ ] Alert prompts to add bank info
  - [ ] Edit form auto-opens

- [ ] User fills in **bank info**
  - [ ] Số tài khoản
  - [ ] Tên chủ tài khoản
  - [ ] Ngân hàng
  - [ ] **Upload ảnh QR** (NEW)
  - [ ] Click **💾 Lưu**

- [ ] User manages case via **Activity Panel**
  - [ ] Send appeals (📢)
  - [ ] Add updates (📸)
  - [ ] Accept available bounties (💬)

- [ ] User **completes case** via **✅ Hoàn thành**
  - [ ] Write completion report
  - [ ] Add completion images
  - [ ] Click **✅ Hoàn thành ca cứu hộ**
  - [ ] Confirm dialog
  - [ ] Receive alert about bounty status
  - [ ] Case marked as "delivered"
  - [ ] Bounty money transferred (if not self-rescue)

---

## ⚠️ CHỨC NĂNG CÓ & THIẾU

### ✅ CÓ:
- Accept case
- Edit bank info (all 4 fields)
- Upload QR code image ✨ **NEW**
- Send appeals
- Add updates
- Accept bounties
- Complete case with self-rescue logic
- Share case (owner only)
- Edit post info (owner only)
- Close case (owner only)

### ❓ CẦN KIỂM TRA / CẦN THÊM:
- [ ] Bounty payment trigger on case completion (backend)
- [ ] Appeal creation form validation
- [ ] Update images upload (currently just URLs)
- [ ] Completion images upload (currently just URLs)
- [ ] Receipt/invoice generation for donations
- [ ] Notification to owner when rescuer completes

---

## 📝 NOTES:
- All bank info changes require reload (window.location.reload())
- QR image now supports direct upload instead of URL paste
- Self-rescue bounty prevention is UI + backend logic
- Need to verify database permissions for all RPC functions
