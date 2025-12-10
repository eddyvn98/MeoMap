# 📝 HƯỚNG DẪN CẬP NHẬT SUPABASE & CODE

## BƯỚC 1: Chạy SQL trên Supabase

1. Vào **Supabase Dashboard** → chọn project của bạn
2. Vào **SQL Editor** (bên trái)
3. Copy toàn bộ nội dung file `SUPABASE_MIGRATION_SIMPLE.sql`
4. Paste vào SQL Editor
5. Bấm **RUN** (hoặc Ctrl+Enter)

**Kết quả mong đợi:**
```
✅ Thêm cột user_qr_id vào profiles
✅ Thêm các cột mới vào deposits
✅ Tạo bảng vouchers
✅ Tạo 3 functions: confirm_delivery_by_qr, owner_review_delivery, auto_review_deposits
✅ Tạo trigger tự động tạo voucher
```

---

## BƯỚC 2: Cập nhật PetDetailPage

### Thay đổi chính:

**CŨ (phức tạp):**
- Người nhận gửi request
- Owner accept
- Cả 2 confirm meet
- Sinh token
- Owner quét token
- Confirm delivery

**MỚI (đơn giản):**
- Người nhận đặt cọc (status = 'pending')
- Owner thấy danh sách
- Owner quét QR hoặc chọn người → Khóa cọc ngay

### UI cần thay đổi:

#### 1. **Nút "Đặt cọc"** (cho người nhận):
```jsx
// Giữ nguyên logic đặt cọc hiện tại
// CHỈ CẦN: tạo deposit với status = 'pending'
```

#### 2. **Hiển thị QR của người nhận** (sau khi cọc):
```jsx
import UserQRCode from '../components/UserQRCode';

// Sau khi đặt cọc thành công
{currentDeposit && currentDeposit.status === 'pending' && (
  <div className="mt-4 p-4 border rounded">
    <h3 className="font-bold mb-2">Mã QR của bạn</h3>
    <p className="text-sm text-gray-600 mb-3">
      Khi gặp chủ bài, cho họ quét mã này để xác nhận giao mèo
    </p>
    <UserQRCode userId={currentUser.id} size={200} />
  </div>
)}
```

#### 3. **Link đến trang quản lý người cọc** (cho owner):
```jsx
// Ở phần owner view
{isOwner && pet.status !== 'delivered' && (
  <button
    onClick={() => navigate(`/account/adopt/${pet.id}/applicants`)}
    className="w-full px-4 py-3 bg-purple-600 text-white rounded"
  >
    📋 Xem danh sách người đặt cọc ({applicants.length})
  </button>
)}
```

---

## BƯỚC 3: Cập nhật AdoptApplicantsPage (đã xong)

File `src/pages/AdoptApplicantsPage.jsx` đã được cập nhật với:
- ✅ Quét QR xác nhận giao
- ✅ Chọn người từ danh sách
- ✅ Đánh giá inline (good/bad)

---

## BƯỚC 4: Test flow hoàn chỉnh

### Test Case 1: Người nhận đặt cọc
1. Login như user bình thường
2. Vào chi tiết bài đăng mèo
3. Nhập số tiền cọc
4. Bấm "Đặt cọc"
5. **Kết quả:** Hiển thị QR code của bạn

### Test Case 2: Owner xác nhận giao
1. Login như owner
2. Vào `/account/adopt/:petId/applicants`
3. Thấy danh sách người cọc
4. Bấm "Quét QR" hoặc "Xác nhận giao" trực tiếp
5. **Kết quả:** Cọc chuyển sang `status = 'locked'`

### Test Case 3: Owner đánh giá
1. Sau khi xác nhận giao, trong cùng page
2. Thấy section "Chờ đánh giá"
3. Bấm "Tốt" hoặc "Xấu"
4. **Kết quả:** 
   - Tốt → Voucher cho người nhận
   - Xấu → Voucher cho owner

---

## BƯỚC 5: Setup Cron Job (tự động đánh giá)

### Option A: Supabase Edge Function (khuyến cáo)

1. Tạo file `supabase/functions/auto-review/index.ts`:
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabase.rpc('auto_review_deposits')

  return new Response(
    JSON.stringify({ 
      reviewed_count: data, 
      error,
      timestamp: new Date().toISOString() 
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

2. Deploy:
```bash
supabase functions deploy auto-review
```

3. Schedule (chạy mỗi giờ):
```bash
supabase functions schedule auto-review --cron "0 * * * *"
```

### Option B: External Cron Job

Tạo endpoint API gọi function:
```javascript
// api/auto-review.js
export default async function handler(req, res) {
  const { data, error } = await supabase.rpc('auto_review_deposits');
  res.json({ count: data, error });
}
```

Dùng service như **cron-job.org** gọi endpoint này mỗi giờ.

---

## ✅ CHECKLIST

### Database:
- [ ] Chạy `SUPABASE_MIGRATION_SIMPLE.sql` thành công
- [ ] Kiểm tra bảng `profiles` có cột `user_qr_id`
- [ ] Kiểm tra bảng `deposits` có cột mới
- [ ] Kiểm tra bảng `vouchers` đã tạo
- [ ] Test function `confirm_delivery_by_qr` trong SQL Editor
- [ ] Test function `owner_review_delivery` trong SQL Editor

### Frontend:
- [ ] Cập nhật `PetDetailPage.jsx` - hiển thị QR sau khi cọc
- [ ] Cập nhật `AdoptApplicantsPage.jsx` - đã xong
- [ ] Test đặt cọc
- [ ] Test quét QR xác nhận
- [ ] Test đánh giá

### Deployment:
- [ ] Setup cron job auto-review
- [ ] Test auto-review sau 3 ngày (có thể test bằng cách set review_period_ends_at về quá khứ)

---

## 🔧 TROUBLESHOOTING

### Lỗi: "function confirm_delivery_by_qr does not exist"
→ Chưa chạy migration. Vào SQL Editor chạy lại file `SUPABASE_MIGRATION_SIMPLE.sql`

### Lỗi: "column user_qr_id does not exist"
→ Migration chưa chạy hoặc bị lỗi. Check logs trong SQL Editor.

### QR không hiển thị
→ Check console log, có thể thiếu package: `npm install qrcode.react`

### Deposit không chuyển sang 'locked'
→ Check function `confirm_delivery_by_qr` có chạy đúng không. Xem logs trong Supabase Dashboard → Logs.

---

## 📞 SUPPORT

Nếu cần hỗ trợ:
1. Check Supabase logs: Dashboard → Logs
2. Check browser console: F12
3. Test functions trực tiếp trong SQL Editor
