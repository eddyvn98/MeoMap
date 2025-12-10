# 🎯 QUY TRÌNH NHẬN MÈO MỚI - HƯỚNG DẪN TRIỂN KHAI

## 📋 Tóm tắt thay đổi

Đã cập nhật lại toàn bộ flow nhận mèo theo quy trình **TỐI GIẢN** - loại bỏ các bước xác nhận thừa, GPS, và chat nội bộ.

### Điểm khác biệt chính:

| **Cũ** | **Mới** |
|---------|---------|
| 2 bên phải confirm meet → sinh token | Quét QR = xác nhận giao ngay |
| 1 người cọc = khóa slot | Nhiều người cọc cùng lúc |
| GPS tracking, nhiều bước | Chỉ 1 bước: quét QR |
| Hoàn tiền mặt | Voucher mua hàng |
| Chat nội bộ | Tự liên lạc ngoài (Zalo/Messenger) |

---

## 🗄️ 1. DATABASE MIGRATION

### Chạy file SQL migration:

```sql
-- File: database/NEW_ADOPTION_FLOW_MIGRATION.sql
```

**Các thay đổi chính:**

1. ✅ Thêm `user_qr_id` vào bảng `profiles` (QR cố định cho mỗi user)
2. ✅ Cập nhật bảng `deposits` với các cột mới:
   - `deposit_locked_at` - Thời điểm khóa cọc
   - `review_period_ends_at` - Deadline đánh giá (3 ngày)
   - `owner_review` - 'good' / 'bad'
   - `voucher_amount` - Số tiền voucher
3. ✅ Tạo bảng `vouchers` mới
4. ✅ Tạo functions:
   - `confirm_delivery_by_qr()` - Xác nhận giao mèo
   - `owner_review_delivery()` - Đánh giá giao dịch
   - `auto_review_deposits()` - Tự động đánh giá sau 3 ngày
5. ✅ Tạo triggers tự động sinh voucher

### Chạy migration:

```bash
# Vào Supabase SQL Editor và paste nội dung file
# Hoặc dùng CLI:
supabase db reset
```

---

## 🎨 2. FRONTEND COMPONENTS

### Components mới:

#### `UserQRCode.jsx`
Hiển thị mã QR cố định của user.

**Sử dụng:**
```jsx
import UserQRCode from '../components/UserQRCode';

<UserQRCode userId={currentUser.id} size={200} />
```

#### `QRScanner.jsx`
Quét mã QR của người nhận.

**Sử dụng:**
```jsx
import QRScanner from '../components/QRScanner';

<QRScanner
  onScanSuccess={(qrCode) => console.log('Scanned:', qrCode)}
  onScanError={(err) => console.error(err)}
/>
```

---

## 📱 3. PAGES MỚI

### `ConfirmDeliveryPage.jsx`
**Route:** `/confirm-delivery/:petId`

Owner dùng page này để xác nhận giao mèo với 2 cách:
1. Quét QR của người nhận
2. Chọn từ danh sách người đã cọc

**Flow:**
```
Owner → Bấm "Xác nhận giao mèo" 
      → Chọn cách 1 hoặc 2 
      → Hệ thống khóa cọc ngay lập tức
      → Bắt đầu 3 ngày đánh giá
```

### `ReviewDeliveryPage.jsx`
**Route:** `/review-delivery/:depositId`

Owner đánh giá giao dịch trong vòng 3 ngày sau khi giao.

**2 options:**
- ✅ **Giao dịch TỐT** → Voucher cho người nhận
- ❌ **Giao dịch XẤU** → Voucher cho owner

Sau 3 ngày không đánh giá → tự động đánh giá TỐT.

---

## 🔄 4. FLOW CHI TIẾT

### **Bước 1: Người nhận đặt cọc**
```javascript
// Người nhận bấm "Đặt cọc"
const { error } = await supabase
  .from('deposits')
  .insert({
    pet_id: petId,
    receiver_id: currentUser.id,
    owner_id: pet.owner_id,
    amount: 50000, // VD: 50k
    status: 'pending' // Chưa khóa
  });
```

**Quan trọng:** `status = 'pending'` → nhiều người có thể cọc cùng lúc.

---

### **Bước 2: Owner thấy danh sách người cọc**
```javascript
const { data } = await supabase
  .from('deposits')
  .select(`
    *,
    receiver:profiles(display_name, avatar_url, user_qr_id)
  `)
  .eq('pet_id', petId)
  .eq('status', 'pending');

// Hiển thị danh sách → owner chọn người để gặp
```

---

### **Bước 3: Hai bên tự liên lạc (ngoài hệ thống)**
- Owner và người nhận tự nhắn tin qua **Zalo/Messenger**
- App **KHÔNG** quản lý cuộc trò chuyện
- Hẹn giờ, địa điểm gặp nhau

---

### **Bước 4: Khi gặp → Owner quét QR hoặc chọn người**

#### **Cách 1: Quét QR**
```javascript
// Owner vào /confirm-delivery/:petId
// Bấm "Quét mã QR"
// Quét QR của người nhận

const { data } = await supabase.rpc('confirm_delivery_by_qr', {
  p_owner_id: currentUser.id,
  p_receiver_qr_id: 'USER-ABC12345', // QR vừa quét
  p_pet_id: petId
});

// → Khóa cọc ngay lập tức
```

#### **Cách 2: Chọn từ danh sách**
```javascript
// Owner chọn người từ danh sách
// Bấm "Xác nhận giao mèo"

const { data } = await supabase.rpc('confirm_delivery_by_qr', {
  p_owner_id: currentUser.id,
  p_receiver_qr_id: deposit.receiver.user_qr_id,
  p_pet_id: petId
});

// → Khóa cọc ngay lập tức
```

**Kết quả:**
- `deposit.status` → `'locked'`
- `deposit.deposit_locked_at` → NOW()
- `deposit.review_period_ends_at` → NOW() + 3 days
- `pet.status` → `'delivered'`

---

### **Bước 5: Owner có 3 ngày để đánh giá**

Owner vào `/review-delivery/:depositId`:

#### **Option A: Đánh giá TỐT**
```javascript
const { data } = await supabase.rpc('owner_review_delivery', {
  p_deposit_id: depositId,
  p_owner_id: currentUser.id,
  p_review: 'good'
});

// Kết quả:
// - deposit.status → 'completed_good'
// - deposit.owner_review → 'good'
// - Tạo voucher cho NGƯỜI NHẬN
```

#### **Option B: Đánh giá XẤU**
```javascript
const { data } = await supabase.rpc('owner_review_delivery', {
  p_deposit_id: depositId,
  p_owner_id: currentUser.id,
  p_review: 'bad'
});

// Kết quả:
// - deposit.status → 'completed_bad'
// - deposit.owner_review → 'bad'
// - Tạo voucher cho OWNER
```

---

### **Bước 6: Sau 3 ngày → Tự động đánh giá TỐT**

Chạy function này định kỳ (cron job hoặc Supabase Edge Function):

```javascript
const { data } = await supabase.rpc('auto_review_deposits');
// Trả về số lượng deposits đã được auto-review
```

**Logic:**
- Tìm deposits có `status = 'locked'` và `review_period_ends_at < NOW()`
- Tự động set `owner_review = 'good'`
- Tạo voucher cho người nhận

---

## 🎫 5. VOUCHER SYSTEM

### Bảng `vouchers`:

```sql
CREATE TABLE vouchers (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  deposit_id UUID,
  amount INTEGER NOT NULL,
  used_amount INTEGER DEFAULT 0,
  remaining_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'active', -- 'active', 'used', 'expired'
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

### Trigger tự động tạo voucher:

Khi `deposit.status` chuyển sang `completed_good` hoặc `completed_bad`:
- Tạo voucher cho người nhận (nếu good)
- Tạo voucher cho owner (nếu bad)

### Sử dụng voucher:

```javascript
// Lấy danh sách vouchers của user
const { data } = await supabase
  .from('vouchers')
  .select('*')
  .eq('user_id', currentUser.id)
  .eq('status', 'active')
  .order('created_at', { ascending: false });

// Tính tổng voucher available
const totalVoucher = data.reduce((sum, v) => sum + v.remaining_amount, 0);
```

---

## 🛠️ 6. CRON JOB - AUTO REVIEW

### Supabase Edge Function (khuyến cáo):

Tạo function chạy mỗi giờ để auto-review:

```typescript
// functions/auto-review/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { data, error } = await supabase.rpc('auto_review_deposits')

  return new Response(
    JSON.stringify({ reviewed: data, error }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### Cron schedule:

```bash
# Trong Supabase Dashboard → Edge Functions → Cron
0 * * * * # Chạy mỗi giờ
```

---

## 📊 7. TRACKING & ANALYTICS

### Theo dõi metrics quan trọng:

```sql
-- Số lượng giao dịch tốt vs xấu
SELECT 
  COUNT(CASE WHEN status = 'completed_good' THEN 1 END) as good_trades,
  COUNT(CASE WHEN status = 'completed_bad' THEN 1 END) as bad_trades,
  COUNT(CASE WHEN auto_reviewed = true THEN 1 END) as auto_reviewed
FROM deposits
WHERE deposit_locked_at IS NOT NULL;

-- Top người nhận có nhiều giao dịch tốt
SELECT 
  receiver_id,
  profiles.display_name,
  COUNT(*) as total_trades,
  COUNT(CASE WHEN status = 'completed_good' THEN 1 END) as good_trades
FROM deposits
JOIN profiles ON deposits.receiver_id = profiles.id
WHERE status IN ('completed_good', 'completed_bad')
GROUP BY receiver_id, profiles.display_name
ORDER BY good_trades DESC
LIMIT 10;
```

---

## ✅ 8. CHECKLIST TRIỂN KHAI

### Database:
- [ ] Chạy migration SQL
- [ ] Verify bảng `vouchers` đã tạo
- [ ] Test function `confirm_delivery_by_qr()`
- [ ] Test function `owner_review_delivery()`
- [ ] Test function `auto_review_deposits()`

### Frontend:
- [ ] Install packages: `npm install qrcode.react html5-qrcode`
- [ ] Thêm components: `UserQRCode`, `QRScanner`
- [ ] Thêm pages: `ConfirmDeliveryPage`, `ReviewDeliveryPage`
- [ ] Cập nhật `router.jsx`
- [ ] Test quét QR
- [ ] Test chọn từ danh sách

### Backend/Cron:
- [ ] Setup Supabase Edge Function cho auto-review
- [ ] Schedule cron job chạy mỗi giờ
- [ ] Test auto-review function

### Testing:
- [ ] Test flow: Người nhận đặt cọc
- [ ] Test flow: Owner thấy danh sách
- [ ] Test flow: Quét QR xác nhận
- [ ] Test flow: Chọn từ danh sách xác nhận
- [ ] Test flow: Đánh giá TỐT → voucher cho người nhận
- [ ] Test flow: Đánh giá XẤU → voucher cho owner
- [ ] Test flow: Sau 3 ngày tự động đánh giá
- [ ] Test voucher system

---

## 🚀 9. DEPLOYMENT

### Production checklist:

1. **Database:**
```bash
# Backup database trước khi migrate
pg_dump > backup_$(date +%Y%m%d).sql

# Run migration
psql < database/NEW_ADOPTION_FLOW_MIGRATION.sql
```

2. **Frontend:**
```bash
npm install
npm run build
firebase deploy
```

3. **Cron job:**
```bash
supabase functions deploy auto-review
supabase functions schedule auto-review --cron "0 * * * *"
```

4. **Monitor:**
- Check logs mỗi ngày
- Xem metrics auto-review
- Kiểm tra voucher generation

---

## 📞 10. SUPPORT

Nếu có vấn đề:

1. Check logs trong Supabase Dashboard
2. Verify function calls trong Database → Logs
3. Test với data mẫu trước
4. Rollback nếu cần: `git revert`

---

## 🎉 DONE!

Flow mới đã sẵn sàng deploy. Đơn giản hơn, nhanh hơn, ít lỗi hơn.

**Tóm tắt 8 bước:**
1. Người nhận đặt cọc (pending)
2. Owner thấy danh sách
3. Hai bên tự liên lạc ngoài
4. Quét QR hoặc chọn → khóa cọc ngay
5. 3 ngày đánh giá
6. Đánh giá TỐT → voucher người nhận
7. Đánh giá XẤU → voucher owner
8. Sau 3 ngày tự động TỐT

🚀 **Let's go!**
