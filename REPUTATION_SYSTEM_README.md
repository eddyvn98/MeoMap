# 🏆 HỆ THỐNG UY TÍN NGƯỜI NHẬN MÈO

## 📋 Tổng quan

Hệ thống uy tín giúp đánh giá độ tin cậy của người nhận mèo dựa trên lịch sử giao dịch.

## 🎯 3 Phần đã hoàn thành

### ✅ PHẦN 1: Hiển thị uy tín trong PetDetailPage

**File:** `src/pages/PetDetailPage.jsx`

**Tính năng:**
- Tự động load uy tín người nhận khi có deposit
- Hiển thị trong block "Người đang nhận mèo"
- Thông tin: Tổng lần nhận • OK • Không OK

**UI Location:**
```
PetDetailPage
└── BLOCK 1: QR CHUYỂN TIỀN
    └── Người đang nhận mèo
        ├── ID: xxx
        └── Uy tín: X lần nhận • OK: Y • Không OK: Z
```

---

### ✅ PHẦN 2: ProfilePage với uy tín đầy đủ

**File:** `src/pages/ProfilePage.jsx`

**Route:** `/profile/:userId`

**Tính năng:**
- Hiển thị thông tin profile
- Tổng hợp uy tín: total_trades, ok_trades, bad_trades
- Điểm uy tín (reputation_score) với sao ⭐⭐⭐⭐⭐
- Danh sách chi tiết tất cả đánh giá

**UI Sections:**
```
ProfilePage
├── Thông tin người dùng
│   ├── Tên
│   ├── ID
│   ├── Vai trò
│   └── Ví điện tử
│
└── Uy tín nhận mèo
    ├── Tổng giao dịch: X
    ├── OK: Y
    ├── Không OK: Z
    ├── Điểm uy tín: N
    ├── Sao: ⭐⭐⭐⭐⭐
    │
    └── Chi tiết đánh giá (N)
        ├── ✅ OK - "comment..." - 07/12/2025
        ├── ❌ Không OK - "comment..." - 06/12/2025
        └── ...
```

---

### ✅ PHẦN 3: Hệ thống điểm sao (Reputation Score)

**File SQL:** `REPUTATION_SCORE_MIGRATION.sql`

**Database View:** `user_reputation_score`

**Công thức:**
```
reputation_score = (ok_trades × 10) - (bad_trades × 20)
```

**Quy đổi sao:**
- ⭐⭐⭐⭐⭐ (5 sao): >= 40 điểm
- ⭐⭐⭐⭐ (4 sao): >= 20 điểm
- ⭐⭐⭐ (3 sao): >= 10 điểm
- ⭐⭐ (2 sao): >= 0 điểm
- ⭐ (1 sao): < 0 điểm

**Ví dụ:**
| OK | Không OK | Điểm | Sao |
|----|----------|------|-----|
| 5  | 0        | 50   | ⭐⭐⭐⭐⭐ |
| 4  | 1        | 20   | ⭐⭐⭐⭐ |
| 3  | 2        | -10  | ⭐ |
| 2  | 3        | -40  | ⭐ |

---

## 🚀 Cài đặt

### Bước 1: Chạy SQL Migration

Mở Supabase SQL Editor, chạy file `REPUTATION_SCORE_MIGRATION.sql`:

```sql
CREATE OR REPLACE VIEW public.user_reputation_score AS
SELECT 
  target_id AS user_id,
  (
    COUNT(*) FILTER (WHERE score = 1) * 10 
    - COUNT(*) FILTER (WHERE score = 0) * 20
  ) AS reputation_score
FROM public.adoption_ratings
GROUP BY target_id;

GRANT SELECT ON public.user_reputation_score TO authenticated;
GRANT SELECT ON public.user_reputation_score TO anon;
```

### Bước 2: Test View

```sql
SELECT user_id, reputation_score
FROM public.user_reputation_score
ORDER BY reputation_score DESC
LIMIT 10;
```

### Bước 3: Deploy Frontend

```powershell
npm run build
firebase deploy
```

---

## 📱 Cách sử dụng

### 1. Xem uy tín trong PetDetailPage

1. Người nhận đặt cọc trên `/pet/:id`
2. Sau khi đặt cọc → Block "Người đang nhận mèo" hiện uy tín
3. Chủ mèo thấy lịch sử OK/Không OK trước khi giao

### 2. Xem ProfilePage

**Cách truy cập:**
- URL: `/profile/:userId`
- Ví dụ: `/profile/abc123-def456-ghi789`

**Ai có thể xem:**
- Bất kỳ ai có link profile
- Admin khi review người dùng
- User xem profile của chính mình

### 3. Liên kết Profile vào các trang

**Ví dụ thêm link vào AdminDepositsPage:**

```jsx
<a 
  href={`/profile/${deposit.receiver_id}`}
  style={{ color: "#3b82f6", textDecoration: "underline" }}
>
  Xem profile
</a>
```

**Ví dụ thêm link vào DepositListPage:**

```jsx
<button 
  onClick={() => navigate(`/profile/${deposit.receiver_id}`)}
  style={{ fontSize: 12, padding: "4px 8px" }}
>
  Xem uy tín
</button>
```

---

## 🗂️ Database Schema

### Bảng: `adoption_ratings`

| Column      | Type      | Description                  |
|-------------|-----------|------------------------------|
| id          | uuid      | Primary key                  |
| deposit_id  | uuid      | FK to deposits               |
| pet_id      | uuid      | FK to pets                   |
| rater_id    | uuid      | FK to profiles (người đánh giá) |
| target_id   | uuid      | FK to profiles (người bị đánh giá) |
| score       | int       | 1 = OK, 0 = Không OK        |
| comment     | text      | Ghi chú đánh giá            |
| created_at  | timestamp | Thời gian tạo               |

### View: `user_reputation`

| Column       | Type | Description           |
|--------------|------|-----------------------|
| user_id      | uuid | FK to profiles        |
| total_trades | int  | Tổng số giao dịch     |
| ok_trades    | int  | Số lần OK             |
| bad_trades   | int  | Số lần Không OK       |

### View: `user_reputation_score`

| Column           | Type | Description        |
|------------------|------|--------------------|
| user_id          | uuid | FK to profiles     |
| reputation_score | int  | Điểm uy tín tính toán |

---

## 🧪 Testing Checklist

- [ ] Đặt cọc trên PetDetailPage → Thấy uy tín người nhận
- [ ] Truy cập `/profile/:userId` → Thấy trang profile đầy đủ
- [ ] Profile hiển thị: total_trades, ok_trades, bad_trades
- [ ] Profile hiển thị: reputation_score với số sao đúng
- [ ] Profile hiển thị: danh sách chi tiết đánh giá
- [ ] View `user_reputation_score` trả về dữ liệu đúng
- [ ] Sao hiển thị đúng theo công thức:
  - >= 40: 5 sao
  - >= 20: 4 sao
  - >= 10: 3 sao
  - >= 0: 2 sao
  - < 0: 1 sao

---

## 🔧 Troubleshooting

### Lỗi: "relation user_reputation_score does not exist"

**Nguyên nhân:** Chưa chạy SQL migration

**Giải pháp:**
1. Mở Supabase SQL Editor
2. Chạy file `REPUTATION_SCORE_MIGRATION.sql`
3. Test với query: `SELECT * FROM user_reputation_score LIMIT 1;`

### Lỗi: ProfilePage hiển thị "Chưa có giao dịch nào"

**Nguyên nhân:** User chưa có đánh giá nào

**Giải pháp:** 
- Đây là trạng thái bình thường
- Sau khi có giao dịch đầu tiên, dữ liệu sẽ hiện

### Uy tín không cập nhật sau khi đánh giá

**Nguyên nhân:** View chưa refresh

**Giải pháp:**
1. Refresh trang ProfilePage
2. View `user_reputation` và `user_reputation_score` tự động cập nhật khi có rating mới

---

## 🎨 Customization

### Thay đổi công thức điểm

Sửa trong `REPUTATION_SCORE_MIGRATION.sql`:

```sql
-- Công thức mới: OK +15, Không OK -25
CREATE OR REPLACE VIEW public.user_reputation_score AS
SELECT 
  target_id AS user_id,
  (
    COUNT(*) FILTER (WHERE score = 1) * 15 
    - COUNT(*) FILTER (WHERE score = 0) * 25
  ) AS reputation_score
FROM public.adoption_ratings
GROUP BY target_id;
```

### Thay đổi quy đổi sao

Sửa trong `ProfilePage.jsx`:

```js
function convertScoreToStars(score) {
  if (score >= 50) return 5;  // Nâng ngưỡng 5 sao
  if (score >= 30) return 4;
  if (score >= 15) return 3;
  if (score >= 5)  return 2;
  return 1;
}
```

---

## 📝 Notes

- Hệ thống uy tín **KHÔNG ảnh hưởng** đến flow deposit + QR + giao mèo
- Chỉ là **lớp hiển thị** để người dùng tham khảo
- Admin vẫn phải tự quyết định confirm/reject deposit
- Có thể mở rộng: thêm filter theo reputation, tự động reject khi điểm quá thấp

---

## 🔗 Related Files

- `src/pages/PetDetailPage.jsx` - Hiển thị uy tín khi đặt cọc
- `src/pages/ProfilePage.jsx` - Trang profile đầy đủ
- `src/pages/AdminDepositsPage.tsx` - Admin xem uy tín trước khi confirm
- `src/pages/DepositListPage.jsx` - Owner đánh giá sau khi giao mèo
- `src/pages/DeliverPage.tsx` - Form đánh giá tự động
- `src/router.jsx` - Route `/profile/:userId`
- `REPUTATION_SCORE_MIGRATION.sql` - SQL tạo view điểm uy tín

---

**Last Updated:** December 7, 2025
