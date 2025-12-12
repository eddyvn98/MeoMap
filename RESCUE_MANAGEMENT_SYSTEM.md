# 🚑 Quy Trình & Giao Diện Cứu Hộ - Hướng Dẫn Thi Công

## 📋 Tổng Quan

Giao diện cứu hộ (Rescue Management System) cho phép:
- **Người đăng bài cứu hộ**: Tạo ca cứu hộ, treo thưởng, kêu gọi quyên góp
- **Người cứu hộ (Rescuer)**: Nhận ca, kêu gọi ủng hộ, cập nhật tình hình, hoàn thành ca

## 🎯 Các Thành Phần Đã Tạo

### 1. **RescueActivityPanel.jsx** - Giao diện cho Người Cứu
Nằm ở: `src/components/RescueActivityPanel.jsx`

**Chức năng:**
- 📊 **Tổng quan** - Xem thông tin ca, tiền hỗ trợ ban đầu, tiền quyên góp
- 📢 **Kêu gọi ủng hộ** - Tạo lời kêu gọi, dự kiến chi phí
- 📸 **Cập nhật tình hình** - Thêm ảnh, video, mô tả, chi phí tạm ứng
- ✅ **Hoàn thành ca** - Báo cáo kết quả cuối cùng, hoàn thành ca cứu hộ

**Props:**
```jsx
<RescueActivityPanel
  caseId={petId}        // ID của ca cứu hộ
  rescuerId={userId}    // ID của người cứu
  isRescuer={boolean}   // Kiểm tra có phải rescuer không
  onCaseUpdated={fn}    // Callback khi có update
/>
```

### 2. **RescuerDashboard.jsx** - Dashboard Quản Lý Ca Cứu
Nằm ở: `src/components/RescuerDashboard.jsx`

**Chức năng:**
- 📍 **Ca cứu hộ khẩn cấp** - Danh sách các ca chưa có người nhận
- 🎯 **Ca của tôi** - Danh sách ca mà tôi đã nhận
- ✋ **Nhận ca** - Nút để đăng ký nhận ca cứu hộ

**Cấu trúc:**
```
📱 Bảng điều khiển cứu hộ
├── 📍 Ca cứu hộ khẩn cấp (Tab)
│   ├── Danh sách ca chưa nhận
│   └── Nút "Nhận ca cứu hộ"
│
└── 🎯 Ca của tôi (Tab)
    ├── Danh sách ca đã nhận
    └── Nút "Vào Trung tâm cứu hộ"
```

### 3. **RescuerPage.jsx** - Trang Chi Tiết
Nằm ở: `src/pages/RescuerPage.jsx`

Trang riêng để hiển thị `RescuerDashboard` ở `/rescuer`

### 4. **Tích Hợp RescueActivityPanel vào RescuePetDetail**
File: `src/components/RescuePetDetail.jsx`

Thêm logic:
```jsx
const isRescuer = user && pet.rescuer_id && pet.rescuer_id === user.id;

// Nếu user là rescuer, hiển thị RescueActivityPanel
{isRescuer && !isClosed && (
  <RescueActivityPanel
    caseId={pet.id}
    rescuerId={user.id}
    isRescuer={isRescuer}
    onCaseUpdated={() => {...}}
  />
)}
```

## 🔄 Quy Trình Sử Dụng

### **Bước 1: Người Đăng Tạo Ca Cứu Hộ**
1. Vào `/home` → Chọn "Cứu hộ (mèo gặp nạn)" → Điền thông tin
2. Nhập "💰 Hỗ trợ cứu hộ" (thưởng cho người cứu)
3. Đăng bài

### **Bước 2: Người Cứu Nhận Ca**
1. Truy cập `/rescuer` hoặc bấm "🚑 Cứu hộ" ở Header
2. Xem tab "📍 Ca cứu hộ khẩn cấp"
3. Chọn ca → Bấm "✋ Nhận ca cứu hộ này"
4. Hệ thống cập nhật `pet.rescuer_id = userId`

### **Bước 3: Người Cứu Quản Lý Ca**
1. Vào chi tiết ca (Pet Detail Page) → Xuất hiện "🚑 Trung tâm cứu hộ" (RescueActivityPanel)
2. **Kêu gọi ủng hộ**: Bấm "📢 Kêu gọi" → Nhập tiêu đề + nội dung → Gửi
3. **Cập nhật tình hình**: Bấm "📸 Cập nhật" → Thêm ảnh, chi phí tạm ứng → Gửi
4. **Hoàn thành ca**: Bấm "✅ Hoàn thành" → Báo cáo cuối cùng → Xác nhận

### **Bước 4: Quy Trình Tiền**
1. **Tiền hỗ trợ ban đầu** (Bounty): Người cứu nhận ngay khi hoàn thành
2. **Tiền quyên góp** (Donations): Được giải ngân từ ví của mỗi người góp
3. **Chi phí tạm ứng**: Được hoàn lại từ tiền quyên góp

## 📊 Tạo Bảng Database

Chạy file: `database/RESCUE_MANAGEMENT_MIGRATION.sql`

**Bảng được tạo:**
- `rescue_appeals` - Lưu lời kêu gọi ủng hộ
- `rescue_updates` - Lưu cập nhật tình hình

**Cột được thêm vào `pets` table:**
- `rescuer_id` - ID của người cứu hộ
- `completed_at` - Thời gian hoàn thành
- `completion_notes` - Báo cáo hoàn thành
- `completion_images` - Ảnh minh chứng

## 🔗 Tích Hợp Router

File: `src/router.jsx`

```jsx
import RescuerPage from "./pages/RescuerPage";

// Thêm route
<Route path="/rescuer" element={<RescuerPage />} />
```

## 🎨 Thêm Link vào Header

File: `src/components/Header.jsx`

```jsx
<Link to="/rescuer">
  <button>🚑 Cứu hộ</button>
</Link>
```

## 🚀 Các Tính Năng Tiếp Theo (Optional)

1. **Timeline Hoạt Động** - Hiển thị tất cả cập nhật trên 1 timeline
2. **Thông Báo** - Cộng đồng được thông báo khi có kêu gọi ủng hộ mới
3. **Sao Lưu & Đánh Giá** - Đánh giá người cứu sau khi hoàn thành
4. **Quét QR Xác Nhận** - Sử dụng QR code để xác nhận bàn giao
5. **Bản Đồ Theo Dõi** - Hiển thị vị trí ca cứu hộ trên bản đồ
6. **Thống Kê** - Dashboard thống kê ca cứu đã hoàn thành

## 📝 Thay Đổi Tập Tin

| File | Thay Đổi |
|------|----------|
| `src/components/RescueActivityPanel.jsx` | ✅ Tạo mới |
| `src/components/RescuerDashboard.jsx` | ✅ Tạo mới |
| `src/pages/RescuerPage.jsx` | ✅ Tạo mới |
| `src/components/RescuePetDetail.jsx` | ✅ Thêm import + logic hiển thị RescueActivityPanel |
| `src/router.jsx` | ✅ Thêm import + route /rescuer |
| `src/components/Header.jsx` | ✅ Thêm link "🚑 Cứu hộ" |
| `database/RESCUE_MANAGEMENT_MIGRATION.sql` | ✅ Tạo mới |

## ✅ Checklist Thi Công

- [x] Tạo component `RescueActivityPanel.jsx` - giao diện cho rescuer
- [x] Tạo component `RescuerDashboard.jsx` - danh sách ca cứu
- [x] Tạo trang `RescuerPage.jsx`
- [x] Tích hợp `RescueActivityPanel` vào `RescuePetDetail`
- [x] Thêm route `/rescuer` trong `router.jsx`
- [x] Thêm link "🚑 Cứu hộ" ở Header
- [x] Tạo file migration SQL
- [ ] Chạy migration SQL trên database
- [ ] Test toàn bộ quy trình
- [ ] Cập nhật QuickGuideModal (đã cập nhật)

## 🧪 Testing

### Test Case 1: Nhận Ca Cứu Hộ
1. Tạo bài cứu hộ (user A)
2. Login user B
3. Vào `/rescuer` → Bấm "Nhận ca cứu hộ"
4. Kiểm tra: `pet.rescuer_id` = B's user ID

### Test Case 2: Cập Nhật Tình Hình
1. User B vào chi tiết ca → Bấm "📸 Cập nhật"
2. Nhập thông tin → Gửi
3. Kiểm tra: Dữ liệu lưu vào `rescue_updates` table

### Test Case 3: Hoàn Thành Ca
1. User B bấm "✅ Hoàn thành"
2. Kiểm tra: `pet.status` = 'delivered', `completed_at` được set

## 📖 Tài Liệu Liên Quan

- [ADOPTION_REPORTS_SYSTEM.md](./ADOPTION_REPORTS_SYSTEM.md)
- [WALLET_README.md](./WALLET_README.md)
- [P1_IMPLEMENTATION_GUIDE.md](./P1_IMPLEMENTATION_GUIDE.md)
