# 🚨 HỆ THỐNG TỐ CÁO HÀNH VI XẤU (ADOPTION REPORTS)

## 📋 Tổng quan

Hệ thống cho phép user tố cáo hành vi xấu của đối tác giao dịch, và admin duyệt báo cáo để hạ uy tín.

**Quy trình:**
1. User gửi tố cáo → `UserReportPage` (`/report-user/:depositId`)
2. Dữ liệu lưu vào bảng `adoption_reports` (status='pending')
3. Admin xem xét → `AdminReportsPage` (`/admin/reports`)
4. Admin chấp nhận → Tạo `adoption_ratings` với score=0 (hạ uy tín)
5. `user_reputation` view tự động cập nhật bad_trades
6. Tiền cọc tự động tăng 50% hoặc blacklist (nếu >= 3 lần xấu)

---

## 🏗️ Database Schema

### Bảng: `adoption_reports`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Report ID |
| deposit_id | UUID | FK deposits | Giao dịch được báo cáo |
| pet_id | UUID | FK pets | Con mèo liên quan |
| reporter_id | UUID | FK profiles | Người báo cáo |
| target_id | UUID | FK profiles | Người bị báo cáo |
| reason_category | TEXT | CHECK IN (...) | no_show, late, rude, fraud, other |
| reason_detail | TEXT | - | Chi tiết vấn đề |
| status | TEXT | DEFAULT 'pending' | pending, accepted, rejected |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Thời gian tạo |
| handled_at | TIMESTAMPTZ | - | Thời gian admin xử lý |
| handled_by | UUID | FK profiles | Admin xử lý |

---

## 📱 Frontend Components

### 1️⃣ UserReportPage.jsx

**Route:** `/report-user/:depositId`

**Tính năng:**
- Form gửi tố cáo hành vi xấu
- Chỉ user thuộc giao dịch mới có thể báo cáo
- 5 loại lý do báo cáo
- Mô tả chi tiết
- Tự động xác định target_id (người bị báo cáo)

**States:**
```javascript
const [deposit, setDeposit] = useState(null);
const [reasonCategory, setReasonCategory] = useState("no_show");
const [reasonDetail, setReasonDetail] = useState("");
const [submitting, setSubmitting] = useState(false);
```

**Lý do báo cáo:**
- `no_show` - Không đến / bùng hẹn
- `late` - Đi trễ, không báo
- `rude` - Thái độ thiếu tôn trọng
- `fraud` - Dấu hiệu lừa đảo
- `other` - Khác

**Flow:**
1. Load deposit từ depositId
2. Kiểm tra user là owner hoặc receiver
3. Submit → Tạo adoption_reports với status='pending'
4. Navigate back

### 2️⃣ AdminReportsPage.jsx

**Route:** `/admin/reports`

**Tính năng:**
- Danh sách báo cáo pending
- Xem chi tiết: reporter, target, lý do, nội dung
- Nút "Chấp nhận" hoặc "Từ chối"
- Khi chấp nhận → Hạ uy tín tự động

**Bảng hiển thị:**
| Cột | Nội dung |
|-----|---------|
| Thời gian | created_at |
| Deposit / Pet | deposit_id, pet_id |
| Reporter → Target | reporter_id → target_id |
| Lý do | reason_category + reason_detail |
| Hành động | Chấp nhận / Từ chối |

**Xử lý chấp nhận:**
1. Update adoption_reports: status='accepted', handled_at=now()
2. Kiểm tra adoption_ratings (deposit_id + rater_id)
   - Nếu **có**: Update score=0, append comment
   - Nếu **không**: Insert score=0, comment="Hạ uy tín do..."
3. Reload danh sách

### 3️⃣ DepositListPage.jsx (thêm nút)

**Nơi thêm:** Chỗ hiển thị giao dịch, sau thông tin người nhận

```jsx
{d.delivery_status === "delivered" && (
  <button
    onClick={() => navigate(`/report-user/${d.id}`)}
    style={{ fontSize: 12, color: "#dc2626", marginTop: 8 }}
  >
    🚨 Tố cáo người này
  </button>
)}
```

**Hiển thị khi:** `delivery_status = 'delivered'` (sau khi giao mèo xong)

---

## 🔗 Integration với hệ thống hiện tại

### A. Báo cáo được chấp nhận → Hạ uy tín

```
AdminReportsPage (chấp nhận báo cáo)
  ↓
Tạo/Update adoption_ratings (score=0)
  ↓
user_reputation view tự động cập nhật
  ↓
bad_trades += 1
  ↓
PetDetailPage detectCalculateDepositAmount()
  ↓
Nếu bad_trades >= 1: Tăng tiền cọc 50%
Nếu bad_trades >= 3: BLACKLIST
```

### B. Ownership verify

```
UserReportPage
  ↓
Check: current_user === deposit.owner_id OR deposit.receiver_id
  ↓
Nếu đúng: Cho báo cáo
Nếu sai: "Bạn không thuộc giao dịch này"
```

### C. Role check

```
AdminReportsPage
  ↓
Check: auth.user.role === 'admin'
  ↓
Nếu không: "Bạn không có quyền admin"
```

---

## 🧪 Test Cases

### Test 1: User gửi tố cáo

```
1. Vào DepositListPage → Xem giao dịch đã delivered
2. Bấm "Tố cáo người này"
3. Chọn lý do + nhập mô tả
4. Bấm "Gửi báo cáo"
5. Expected: Alert "Đã gửi báo cáo"
6. Verify: adoption_reports có row mới (status='pending')
```

### Test 2: Admin duyệt báo cáo

```
1. Login admin
2. Vào /admin/reports
3. Thấy báo cáo pending
4. Bấm "Chấp nhận"
5. Expected: adoption_ratings tạo (score=0) hoặc update (score=0)
6. Expected: user_reputation.bad_trades += 1
```

### Test 3: Hạ uy tín → Tăng tiền cọc

```
1. User bị 1 lần xấu (bad_trades=1)
2. Người này vào /pet/:id đặt cọc
3. Nhập 50.000 đ
4. Expected: Warning "Bạn đã bị đánh giá không tốt 1 lần"
5. Expected: Tiền cọc thực tế = 80.000 đ (50k × 1.5 = 75k → 80k)
```

### Test 4: Blacklist

```
1. User bị 3 lần xấu (bad_trades=3)
2. Người này vào /pet/:id
3. Thấy input để nhập tiền cọc
4. Nhập bất kỳ số tiền nào
5. Expected: Message đỏ "Tài khoản đã bị hạ uy tín 3 lần. Không thể đặt cọc."
6. Expected: Nút "Đặt cọc" bị disabled
```

### Test 5: Non-owner không thể báo cáo

```
1. User A (không liên quan đến giao dịch)
2. Cố truy cập /report-user/{depositId}
3. Expected: Error "Bạn không thuộc giao dịch này, không thể báo cáo."
```

### Test 6: Non-admin không thể vào admin panel

```
1. User bình thường
2. Truy cập /admin/reports
3. Expected: Error "Bạn không có quyền admin."
```

---

## 🚀 Setup

### Bước 1: Chạy SQL Migration

Mở Supabase SQL Editor, chạy file `ADOPTION_REPORTS_MIGRATION.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.adoption_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id UUID NOT NULL REFERENCES public.deposits(id),
  pet_id UUID NOT NULL REFERENCES public.pets(id),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id),
  target_id UUID NOT NULL REFERENCES public.profiles(id),
  reason_category TEXT NOT NULL,
  reason_detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  handled_at TIMESTAMPTZ,
  handled_by UUID REFERENCES public.profiles(id),
  ...
);
```

### Bước 2: Verify bảng được tạo

```sql
SELECT * FROM public.adoption_reports LIMIT 1;
```

### Bước 3: Deploy frontend

```bash
npm run build
firebase deploy
```

---

## 📝 Files thay đổi

### Tạo mới:
- `src/pages/UserReportPage.jsx` - Form tố cáo
- `src/pages/AdminReportsPage.jsx` - Panel admin duyệt báo cáo
- `ADOPTION_REPORTS_MIGRATION.sql` - SQL tạo bảng

### Chỉnh sửa:
- `src/router.jsx` - Thêm 2 routes
- `src/pages/DepositListPage.jsx` - Thêm nút tố cáo (tuỳ chọn)

---

## 🎯 User Journey

### Scenario: Owner tố cáo receiver xấu

```
1. Owner giao mèo cho Receiver
2. Delivery status = 'delivered'
3. Owner rating = "Không OK"
4. Owner bấm "Tố cáo người này"
5. UserReportPage: 
   - Chọn lý do: "Thái độ thiếu tôn trọng"
   - Ghi: "Không chào hỏi, cái cách nói không tôn trọng"
   - Bấm "Gửi báo cáo"
6. Admin xem AdminReportsPage:
   - Thấy báo cáo từ Owner → Receiver
   - Đọc lý do + chi tiết
   - Bấm "Chấp nhận"
7. Tự động:
   - adoption_ratings tạo (Receiver score=0)
   - user_reputation.bad_trades += 1
8. Receiver lần sau đặt cọc:
   - Tiền tự động tăng 50%
   - Nếu 3 lần xấu → Blacklist
```

---

## 🔐 Security Notes

- **RLS policies** đảm bảo user chỉ thấy báo cáo của mình
- **Backend validation** trong UserReportPage: Check ownership trước insert
- **Admin-only update:** Chỉ admin mới có thể update status báo cáo
- **Atomic operation:** Accept báo cáo + hạ uy tín không có race condition

---

## 📊 Metrics cần tracking

- Số báo cáo pending (chưa xử lý)
- Số báo cáo accepted / rejected
- Lý do báo cáo phổ biến nhất (no_show, rude, fraud, etc.)
- Số user bị blacklist

---

## 🔗 Related Docs

- `DEPOSIT_CALCULATION_LOGIC.md` - Tính tiền cọc dựa trên uy tín
- `REPUTATION_SYSTEM_README.md` - Hệ thống uy tín + sao
- `FLOW_TESTING_CHECKLIST.md` - Test flow deposit → delivery → rating

---

**Last Updated:** December 7, 2025
**Version:** 1.0 - Initial Implementation
