# 🐾 Quy Trình "Cho Nhận" - Liên Kết Các File

## 📋 Tổng Quan Quy Trình

```
1. Người dùng đăng bài "Cho nhận" (PostsSection)
   ↓
2. Danh sách bài đăng hiển thị trên bản đồ (PetDetailPage / PostCard)
   ↓
3. Người nhận xem chi tiết → Đặt cọc (PetDetailPage)
   ↓
4. Người đăng xem danh sách người đăng ký (AdoptApplicantsPage)
   ↓
5. Giao dịch hoàn tất → Đánh giá (AdoptionListPage)
```

---

## 📁 Các File Chính

### 1. **PostsSection.jsx** (src/components/)
- **Mục đích**: Hiển thị danh sách bài đăng "Cho nhận"
- **Props nhận**: `onViewDetail`, `onEdit`, `onDelete`, `onShowQR`, `onEnterToken`
- **Liên kết**: 
  - ✅ ProfileDrawer.jsx (truyền handlers)
  - ✅ PostCard.jsx (render từng card)

---

### 2. **ProfileDrawer.jsx** (src/components/)
- **Mục đích**: Panel cá nhân với 3 tabs (Tổng quan, Đặt cọc, Bài viết)
- **Tabs**:
  - `overview`: Thông tin cá nhân
  - `deposits`: Danh sách đặt cọc + chi tiết
  - `posts`: Bài đăng của bạn
  - `post-detail`: Chi tiết một bài đăng

- **Handlers**:
  - `handleViewDetail(post)` → chuyển sang tab `post-detail`
  - `handleEdit(post)` → mở `/edit-pet/:id`
  - `handleDelete(post)` → xóa bài, reload
  - `handleShowQR(post)` → show QR modal
  - `handleEnterToken(post)` → show token input

- **Liên kết**:
  - ✅ PostsSection.jsx (nhận từ đó)
  - ✅ EditPetPage.jsx (mở trong tab mới)
  - ❌ Cần liên kết: QR Modal, Token Modal

---

### 3. **EditPetPage.jsx** (src/pages/)
- **Mục đích**: Chỉnh sửa thông tin bài đăng "Cho nhận"
- **Route**: `/edit-pet/:id`
- **Liên kết**:
  - ✅ ProfileDrawer.jsx (click "Chỉnh")
  - ✅ PetDetailPage.jsx (click nút sửa)

- **Trạng thái cần xử lý**:
  - Cập nhật thông tin mèo
  - Cập nhật hình ảnh
  - Cập nhật mô tả

---

### 4. **PetDetailPage.jsx** (src/pages/)
- **Mục đích**: Xem chi tiết bài đăng + Đặt cọc
- **Route**: `/pet/:id`
- **Tính năng**:
  - Hiển thị chi tiết mèo
  - Đặt cọc
  - Xem danh sách người đăng ký (nếu là owner)
  - Chỉnh sửa bài (nếu là owner)

- **Liên kết**:
  - ✅ PostCard.jsx / PostsSection.jsx (click "Xem chi tiết")
  - ✅ ProfileDrawer.jsx `post-detail` tab (chi tiết bài)
  - ✅ AdoptApplicantsPage.jsx (link xem người đăng ký)

---

### 5. **AdoptApplicantsPage.jsx** (src/pages/)
- **Mục đích**: Người đăng xem danh sách người đăng ký nhận mèo
- **Route**: `/account/adopt/:petId/applicants`
- **Tính năng**:
  - Danh sách người đăng ký (deposits)
  - Scan QR để xác nhận giao
  - Review 3 ngày sau giao

- **Liên kết**:
  - ✅ PetDetailPage.jsx (nếu là owner, có link)
  - ✅ AdoptionListPage.jsx (xem lịch sử đã giao)

---

### 6. **AdoptionListPage.jsx** (src/pages/)
- **Mục đích**: Người đăng xem lịch sử mèo đã giao + Đánh giá
- **Route**: `/adoptions`
- **Tính năng**:
  - Danh sách adoptions (mèo đã giao)
  - Đánh giá người nhận
  - Xem uy tín người nhận

- **Liên kết**:
  - ✅ Header.jsx (link từ nav "Mèo đã giao / Đánh giá")
  - ✅ MyAdoptionRequestsPage.jsx (ngược lại: người nhận xem)

---

### 7. **MyAdoptionRequestsPage.jsx** (src/pages/)
- **Mục đích**: Người nhận xem danh sách mèo đang đặt cọc
- **Route**: `/my-adoption-requests`
- **Tính năng**:
  - Danh sách yêu cầu nhận (deposits từ người nhận)
  - Xem chi tiết bài, owner
  - Xem trạng thái giao dịch

- **Liên kết**:
  - ✅ Header.jsx (link từ nav)
  - ✅ AdoptionListPage.jsx (ngược lại)

---

## 🔗 Liên Kết Cần Kiểm Tra / Cập Nhật

### ✅ Đã Có
- [x] ProfileDrawer → PostsSection (handlers)
- [x] ProfileDrawer → EditPetPage (window.open)
- [x] PetDetailPage → AdoptApplicantsPage (link từ owner)
- [x] Header → AdoptionListPage / MyAdoptionRequestsPage

### ⚠️ Cần Kiểm Tra
- [ ] ProfileDrawer `handleViewDetail` → Hiển thị đầy đủ thông tin như hình
- [ ] ProfileDrawer `handleShowQR` → QR Modal
- [ ] ProfileDrawer `handleEnterToken` → Token Input Modal
- [ ] PetDetailPage → Hiển thị "Chỉnh sửa" link cho owner
- [ ] AdoptApplicantsPage → QR Scanner hoạt động
- [ ] AdoptionListPage → Đánh giá người nhận
- [ ] Deposits table → Cập nhật status đúng cách

### ❌ Cần Thêm
- [ ] QRCodeModal component (hiển thị QR chi tiết)
- [ ] TokenInputModal component (nhập token cấp)
- [ ] Link từ "Mèo đã giao" nav → AdoptionListPage
- [ ] Link từ "Mèo đang nhận" → MyAdoptionRequestsPage

---

## 📊 Bảng Mapping Status

| Status | Ý Nghĩa | Trạng Thái |
|--------|---------|----------|
| `pending` | Chờ người đăng xác nhận | ⏳ |
| `confirmed` | Đã xác nhận giao, chờ review 3 ngày | ⏳ |
| `locked` | Đang review 3 ngày | 🔒 |
| `completed` | Giao dịch hoàn tất | ✅ |
| `cancelled` | Hủy giao dịch | ❌ |
| `refunded` | Hoàn cọc | 💸 |

---

## 🚀 Hành Động Tiếp Theo

1. **ProfileDrawer**: Thêm QRCodeModal + TokenInputModal
2. **PetDetailPage**: Thêm logic hiển thị link "Quản lý đơn nhận"
3. **AdoptApplicantsPage**: Kiểm tra QR Scanner
4. **Header**: Thêm link "Mèo đang nhận" → MyAdoptionRequestsPage
5. **Test flow**: End-to-end test toàn bộ quy trình

---

## 🔍 Kiểm Tra Chi Tiết

### ProfileDrawer.jsx
```javascript
// Hiện tại đã có:
✅ handleViewDetail(post) - chuyển tab post-detail
✅ handleEdit(post) - window.open edit
✅ handleDelete(post) - xóa bài
⚠️ handleShowQR(post) - chỉ có alert
⚠️ handleEnterToken(post) - chỉ có alert

// Cần thêm:
[ ] Modal QR Code
[ ] Modal Token Input
[ ] Hiển thị đầy đủ nội dung như hình (thông tin cọc, uy tín, etc)
```

### PetDetailPage.jsx
```javascript
// Cần kiểm tra:
[ ] Hiển thị link "Quản lý đơn nhận" cho owner
[ ] Form đặt cọc hoạt động
[ ] Liên kết đến AdoptApplicantsPage
```

---

## 📝 Ghi Chú

- Deposits table = adoption_requests (người nhận xin)
- Adoptions table = giao dịch hoàn tất (sau review 3 ngày)
- ProfileDrawer là panel nhỏ bên phải, không phải trang full
- PostsSection được import vào ProfileDrawer tab "posts"
