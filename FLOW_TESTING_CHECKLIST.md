# ✅ CHECKLIST KIỂM TRA FLOW DEPOSIT & DELIVERY RATING

## Database Preparation

- [ ] Chạy SQL migration để thêm các cột:
  ```sql
  ALTER TABLE deposits ADD COLUMN IF NOT EXISTS delivery_status TEXT;
  ALTER TABLE deposits ADD COLUMN IF NOT EXISTS delivery_token TEXT;
  ALTER TABLE deposits ADD COLUMN IF NOT EXISTS proof_image_url TEXT;
  ALTER TABLE deposits ADD COLUMN IF NOT EXISTS proof_note TEXT;
  ALTER TABLE deposits ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
  ALTER TABLE deposits ADD COLUMN IF NOT EXISTS delivery_cancel_reason TEXT;
  ALTER TABLE deposits ADD COLUMN IF NOT EXISTS delivery_cancelled_by UUID;
  ALTER TABLE deposits ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
  
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_credit INT4 DEFAULT 0 NOT NULL;
  
  CREATE OR REPLACE FUNCTION public.increase_wallet_credit(
    p_user_id UUID,
    p_amount INT4
  )
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  BEGIN
    UPDATE public.profiles
    SET wallet_credit = wallet_credit + p_amount
    WHERE id = p_user_id;
  END;
  $$;
  ```

## Code Verification

- [x] ✅ Router có `/deliver/:token` route trỏ đến `DeliverPage`
- [x] ✅ `DeliverPage.tsx` có logic chỉ cho owner xác nhận
- [x] ✅ `DeliverPage.tsx` check `status = 'confirmed'`
- [x] ✅ `DeliverPage.tsx` update `delivery_status = 'delivered'` + `pets.status = 'delivered'`
- [x] ✅ `DeliverPage.tsx` check xem đã đánh giá chưa
- [x] ✅ `DeliverPage.tsx` hiện form rating nếu chưa đánh giá
- [x] ✅ `DeliverPage.tsx` lưu rating vào `adoption_ratings`

## Flow Testing Steps

### Bước 1: Người nhận đặt cọc
- [ ] Login như người nhận (seeker)
- [ ] Vào trang `/pet/:id`
- [ ] Nhập số tiền cọc
- [ ] Bấm "Đặt cọc & hiện mã QR"
- ✅ Expected: 
  - `deposits` table có bản ghi mới
  - `status = 'locked'`
  - `delivery_token = NULL`
  - Block 1 (QR CHUYỂN TIỀN) hiện ra

### Bước 2: Upload bằng chứng chuyển tiền
- [ ] Vào `/deposits` (trang người nhận)
- [ ] Xem cọc vừa đặt (status = 'locked')
- [ ] Bấm "Gửi bằng chứng chuyển tiền"
- [ ] Upload ảnh + ghi chú
- ✅ Expected:
  - `proof_image_url` được set
  - `proof_note` được set
  - `status` → 'pending'
  - Block 2 (QR NHẬN MÈO) vẫn ẩn

### Bước 3: Admin xác nhận tiền
- [ ] Login như admin
- [ ] Vào `/admin/deposits`
- [ ] Thấy cọc `status = 'pending'` với proof
- [ ] Bấm "Confirm"
- ✅ Expected:
  - `status` → 'confirmed'
  - `delivery_token` được sinh (8 ký tự)
  - `pets.status` → 'reserved'

### Bước 4: Người nhận (owner) mở QR giao mèo
- [ ] Login như chủ bài đăng (owner)
- [ ] Vào `/deposits` (trang owner)
- [ ] Thấy cọc `status = 'confirmed'` với `delivery_token`
- [ ] Block 2 (QR NHẬN MÈO) hiện ra
- [ ] Thấy mã QR với URL: `https://map-meo.web.app/deliver/{token}`
- ✅ Expected:
  - QR code hiển thị
  - Có mã dự phòng (token)

### Bước 5: Quét QR hoặc mở link trực tiếp
- [ ] Người nhận quét QR bằng điện thoại / mở link `/deliver/{token}`
- [ ] Trình duyệt chuyển đến `/deliver/:token`
- ✅ Expected:
  - Trang DeliverPage load
  - Message: "Đã xác nhận giao mèo thành công."

### Bước 6: Kiểm tra xem đã đánh giá chưa
- [ ] Trên trang `/deliver/:token`:
  - Nếu lần đầu → **Form đánh giá hiện ra**
  - Nếu đã đánh giá trước đó → **Hiển thị kết quả cũ**
- ✅ Expected:
  - Form có radio: "Mọi thứ ổn (OK)" / "Có vấn đề (Không OK)"
  - Textarea ghi chú
  - Nút "Gửi đánh giá"

### Bước 7: Chủ bài đăng đánh giá
- [ ] Chọn: "Mọi thứ ổn" hoặc "Có vấn đề"
- [ ] Nhập ghi chú (tuỳ chọn)
- [ ] Bấm "Gửi đánh giá"
- ✅ Expected:
  - Dữ liệu lưu vào bảng `adoption_ratings`
  - Columns: `deposit_id`, `pet_id`, `rater_id` (owner), `target_id` (receiver), `score` (1 hoặc 0), `comment`
  - Form biến mất, thay bằng kết quả: "Bạn đã gửi đánh giá: OK / Không OK"

## Verification Queries

Sau khi hoàn tất flow, chạy các query này trong Supabase SQL Editor:

```sql
-- 1. Check deposit status progression
SELECT id, status, delivery_status, delivery_token, proof_image_url, delivered_at
FROM deposits
ORDER BY created_at DESC
LIMIT 1;

-- 2. Check adoption_ratings
SELECT id, deposit_id, rater_id, target_id, score, comment, created_at
FROM adoption_ratings
ORDER BY created_at DESC
LIMIT 1;

-- 3. Check pet status
SELECT id, name, status
FROM pets
WHERE status = 'delivered'
ORDER BY updated_at DESC
LIMIT 1;

-- 4. Check wallet_credit (nếu hủy giao dịch)
SELECT id, wallet_credit
FROM profiles
ORDER BY updated_at DESC
LIMIT 1;
```

## Error Handling

- [ ] Nếu token không hợp lệ → Message: "Mã giao mèo không hợp lệ..."
- [ ] Nếu user không phải owner → Message: "Bạn không phải người đăng bài mèo..."
- [ ] Nếu status != confirmed → Message: "Tiền cọc chưa được admin xác nhận..."
- [ ] Nếu lỗi khi update delivered_status → Message: "Lỗi khi cập nhật..."
- [ ] Nếu lỗi khi submit rating → Message: "Không lưu được đánh giá..."

## Summary

Khi hoàn tất toàn bộ flow:

✅ Người nhận đặt cọc (pending) → upload proof → status = pending  
✅ Admin confirm → status = confirmed, delivery_token sinh ra  
✅ Người nhận quét QR → /deliver/:token  
✅ DeliverPage xác nhận owner, update delivery_status = delivered  
✅ Form đánh giá hiện, owner chọn OK/Không OK + ghi chú  
✅ Submit → Lưu vào adoption_ratings  
✅ **Rating được ghi nhận!**

---

**Notes:**
- Đảm bảo tất cả SQL columns đã được tạo
- Test trên localhost trước, sau đó deploy Firebase
- Check browser console nếu có error
- Kiểm tra Supabase Dashboard để verify dữ liệu
