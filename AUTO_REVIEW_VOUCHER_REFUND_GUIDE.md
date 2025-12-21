# 🔄 AUTO REVIEW AND VOUCHER REFUND SYSTEM

## 📋 Tổng Quan

Hệ thống tự động đánh giá và hoàn tiền cọc về voucher sau khi nhận mèo.

## 🎯 Flow Hoạt Động

### 1️⃣ Sau khi nhận mèo (Delivered)

```
Người nhận mèo → Nhắc nhở đánh giá chủ bài
├─ Nếu đánh giá TỐT → Voucher hoàn về người nhận
├─ Nếu đánh giá XẤU → Voucher hoàn về chủ bài (bồi thường)
└─ Nếu KHÔNG đánh giá sau 3 ngày → Auto đánh giá TỐT + voucher về người nhận
```

### 2️⃣ Chi Tiết Từng Trường Hợp

#### Case 1: Đánh Giá Tốt (Manual)
- Người nhận click "⭐ Tốt"
- Hệ thống tạo `adoption_ratings` với `score = 1`
- Gọi `refund_deposit_as_voucher()`
- Tạo voucher cho **người nhận**
- Thông báo: "✅ Tiền cọc đã được hoàn về voucher cho bạn"

#### Case 2: Đánh Giá Xấu (Manual)
- Người nhận click "⚠️ Có vấn đề"
- Hệ thống tạo `adoption_ratings` với `score = 0`
- Gọi `refund_deposit_as_voucher()`
- Tạo voucher cho **chủ bài** (bồi thường)
- Thông báo: "📝 Tiền cọc sẽ được hoàn về voucher cho chủ bài"

#### Case 3: Auto Đánh Giá Sau 3 Ngày
- Hệ thống check mỗi phút (useEffect trong AdoptionFlowSection.jsx)
- Nếu `delivered_at` + 3 ngày và chưa có rating
- Gọi `auto_review_and_refund_deposit(requestId)`
- Tạo `adoption_ratings` với `score = 1`, `auto_reviewed = true`
- Tạo voucher cho **người nhận**
- Update `adoption_requests.status = 'completed'`

## 🗄️ Database Changes

### 1. Bảng `adoption_ratings`

```sql
ALTER TABLE adoption_ratings
ADD COLUMN auto_reviewed boolean DEFAULT false;
```

- `auto_reviewed = true` → Đánh giá tự động
- `auto_reviewed = false` → Đánh giá thủ công

### 2. Bảng `deposits`

```sql
ALTER TABLE deposits
ADD COLUMN refunded_as_voucher boolean DEFAULT false,
ADD COLUMN refunded_to_user_id uuid NULL,
ADD COLUMN refund_voucher_id uuid NULL;
```

- `refunded_as_voucher` → Đã hoàn về voucher chưa
- `refunded_to_user_id` → ID người nhận voucher
- `refund_voucher_id` → ID của user_voucher được tạo

## ⚙️ SQL Functions

### 1. `auto_create_good_rating(p_adoption_request_id)`

Tạo rating tự động = good sau 3 ngày

```sql
-- Kiểm tra đã 3 ngày
-- Tạo rating với score = 1, auto_reviewed = true
-- Return: rating_id, deposit_id
```

### 2. `refund_deposit_as_voucher(p_adoption_request_id)`

Hoàn tiền deposit về voucher dựa trên rating

```sql
-- Lấy rating
-- Nếu score >= 1 (good) → voucher về receiver
-- Nếu score < 1 (bad) → voucher về owner
-- Tạo user_voucher
-- Update deposits (refunded_as_voucher = true)
-- Log wallet_transaction
```

### 3. `auto_review_and_refund_deposit(p_adoption_request_id)`

Function tổng hợp - gọi cả 2 functions trên

```sql
-- Kiểm tra đã 3 ngày
-- Tạo rating (nếu chưa có)
-- Refund voucher
-- Update adoption_requests.status = 'completed'
```

### 4. `process_overdue_adoption_requests()`

Batch process tất cả request quá hạn (chạy định kỳ)

```sql
-- Tìm tất cả delivered > 3 ngày, chưa refund
-- Loop qua từng request
-- Gọi auto_review_and_refund_deposit()
-- Return: processed_count
```

## 📱 Frontend Changes

### File: `AdoptionFlowSection.jsx`

#### 1. Auto-complete Logic

```javascript
const autoComplete = async (requestId) => {
  // Gọi SQL function thay vì chỉ update status
  const { data, error } = await supabase.rpc('auto_review_and_refund_deposit', {
    p_adoption_request_id: requestId
  });
  
  // Fallback nếu function chưa tồn tại
  if (error) {
    // Update status như cũ
  }
}
```

#### 2. Manual Rating Logic

```javascript
const handleRateRequest = async (requestId, isGood) => {
  // 1. Lấy adoption_request + deposit info
  // 2. Tạo adoption_ratings record (score = isGood ? 1 : 0)
  // 3. Gọi refund_deposit_as_voucher()
  // 4. Update adoption_requests.status = 'completed'
  // 5. Hiển thị thông báo phù hợp
}
```

#### 3. UI Nhắc Nhở

**Cho người nhận:**
```jsx
⏰ Lưu ý: Sau 3 ngày nếu không đánh giá, 
hệ thống sẽ tự động đánh giá tốt và hoàn tiền cọc về voucher cho bạn.
```

**Cho chủ bài:**
```jsx
💡 Quan trọng: Nếu đánh giá tốt, người nhận sẽ được hoàn tiền cọc về voucher. 
Nếu đánh giá xấu, bạn sẽ nhận voucher bồi thường.
⏰ Sau 3 ngày không đánh giá, hệ thống sẽ tự động đánh giá tốt.
```

## 🔐 Security

- Tất cả functions có `SECURITY DEFINER`
- RLS policies áp dụng cho `adoption_ratings`, `deposits`, `user_vouchers`
- Chỉ authenticated users có thể gọi functions

## 📊 Data Flow Example

### Ví dụ: Đánh giá tốt

```
1. User A (receiver) click "⭐ Tốt" sau khi nhận mèo từ User B (owner)
2. Deposit amount: 100,000đ

Flow:
├─ Create adoption_ratings
│  ├─ rater_id: User A
│  ├─ target_id: User B
│  ├─ score: 1
│  └─ auto_reviewed: false
│
├─ Find/create voucher (amount = 100,000đ)
│  └─ code: "REFUND_ABC123"
│
├─ Create user_voucher
│  ├─ user_id: User A (receiver)
│  ├─ voucher_id: voucher.id
│  ├─ source_type: 'refund_deposit'
│  └─ status: 'active'
│
├─ Update deposits
│  ├─ refunded_as_voucher: true
│  ├─ refunded_to_user_id: User A
│  ├─ refund_voucher_id: user_voucher.id
│  └─ status: 'refunded'
│
└─ Log wallet_transaction
   ├─ user_id: User A
   ├─ type: 'refund_deposit_as_voucher'
   ├─ amount: 100,000
   └─ description: 'Hoàn tiền deposit về voucher (đánh giá tốt)'
```

### Ví dụ: Auto đánh giá sau 3 ngày

```
1. User A nhận mèo từ User B
2. Delivered_at: 2025-12-18 10:00
3. Hiện tại: 2025-12-21 10:05 (>3 ngày)
4. Chưa có rating

Flow:
├─ auto_review_and_refund_deposit() được gọi
│
├─ auto_create_good_rating()
│  ├─ score: 1
│  ├─ auto_reviewed: true
│  └─ comment: 'Tự động đánh giá tốt sau 3 ngày'
│
└─ refund_deposit_as_voucher()
   └─ Voucher về User A (receiver)
```

## 🧪 Testing

### Manual Testing

1. **Tạo adoption request → Accept → Deliver**
2. **Wait 3 days (hoặc set delivered_at = NOW() - INTERVAL '4 days')**
3. **Check auto-complete chạy**
4. **Verify:**
   - adoption_ratings có record mới (auto_reviewed = true)
   - deposits.refunded_as_voucher = true
   - user_vouchers có voucher mới cho receiver
   - wallet_transactions có log

### SQL Testing

```sql
-- Test auto review cho request cụ thể
SELECT auto_review_and_refund_deposit('REQUEST_ID_HERE');

-- Batch process tất cả request quá hạn
SELECT process_overdue_adoption_requests();

-- Check kết quả
SELECT 
  ar.id,
  ar.pet_id,
  ar.status,
  ar.delivered_at,
  ar.status_updated_at,
  rating.score,
  rating.auto_reviewed,
  d.refunded_as_voucher,
  d.refunded_to_user_id,
  uv.voucher_id,
  uv.status as voucher_status
FROM adoption_requests ar
LEFT JOIN deposits d ON d.adoption_request_id = ar.id
LEFT JOIN adoption_ratings rating ON rating.deposit_id = d.id
LEFT JOIN user_vouchers uv ON uv.id = d.refund_voucher_id
WHERE ar.status = 'completed'
  AND ar.delivered_at IS NOT NULL
ORDER BY ar.delivered_at DESC;
```

## 📝 Notes

1. **Voucher không thể rút tiền mặt** - chỉ dùng trong hệ thống
2. **Auto-complete check mỗi 60 giây** - có thể điều chỉnh
3. **Batch process function** - nên chạy định kỳ bằng cron job
4. **Rating chỉ 1 lần** - có constraint UNIQUE(deposit_id, rater_id)

## 🚀 Deployment Steps

1. Run SQL migration: `AUTO_REVIEW_AND_REFUND_VOUCHER.sql`
2. Deploy frontend changes: `AdoptionFlowSection.jsx`
3. Test với 1-2 request mẫu
4. Monitor logs
5. Setup cron job cho `process_overdue_adoption_requests()` (optional)

---

**Created:** December 21, 2025  
**Status:** ✅ Implemented  
**Files:**
- `database/AUTO_REVIEW_AND_REFUND_VOUCHER.sql`
- `src/components/AdoptionFlowSection.jsx`
