# 💳 VOUCHER CONVERSION IMPLEMENTATION GUIDE

## 📋 Tổng Quan

Chức năng **quy đổi tiền cọc/thưởng thành voucher** đã được triển khai hoàn chỉnh. User có thể chuyển đổi:
- **Tiền cọc (Balance_COC)** → Voucher
- **Tiền thưởng (Balance_THUONG)** → Voucher

## 🗂️ Files Tạo/Sửa

### 1. **Database (SQL)**

#### File mới: `database/vouchers.sql`
- Bảng `vouchers` - lưu mã voucher và giá trị
- Bảng `user_vouchers` - lưu voucher của từng user
- Bảng `voucher_conversions` - lịch sử quy đổi
- RLS policies cho security

#### File mới: `database/voucher_functions.sql`
- `convert_balance_coc_to_voucher()` - SQL function quy đổi tiền cọc
- `convert_balance_thuong_to_voucher()` - SQL function quy đổi tiền thưởng
- `get_user_vouchers()` - Lấy danh sách voucher của user

### 2. **Backend (JavaScript)**

#### File sửa: `src/services/walletService.js`
Thêm 4 functions mới:
```javascript
// Quy đổi tiền cọc thành voucher
export async function convertBalanceCocToVoucher(
  userId, amount, voucherCode, note
)

// Quy đổi tiền thưởng thành voucher
export async function convertBalanceThuongToVoucher(
  userId, amount, voucherCode, note
)

// Lấy voucher của user
export async function getUserVouchers(userId)

// Lấy danh sách voucher khả dụng
export async function getAvailableVouchers()
```

### 3. **Frontend (React)**

#### File mới: `src/components/VoucherConversionModal.jsx`
- Modal component cho phép user quy đổi voucher
- Tabs để chọn giữa Balance_COC vs Balance_THUONG
- Hiển thị danh sách voucher khả dụng
- Xác nhận quy đổi

#### File sửa: `src/pages/MyWalletPage.jsx`
- Import VoucherConversionModal
- Thêm state `showVoucherModal` và `userId`
- Thêm button "💳 Quy đổi Voucher" trên cả 2 balance cards
- Tích hợp modal

## 🚀 Triển Khai

### Bước 1: Chạy SQL migrations

Chạy lần lượt trong Supabase SQL Editor:

```bash
# 1. Tạo bảng vouchers + RLS
→ database/vouchers.sql

# 2. Tạo SQL functions
→ database/voucher_functions.sql
```

### Bước 2: Tạo sample vouchers

Trong Supabase, chạy:

```sql
-- Thêm một số mã voucher mẫu
INSERT INTO public.vouchers (code, amount, description, category) VALUES
  ('VOUCHER_50K', 50000, 'Voucher 50k quy đổi từ tiền cọc', 'deposit'),
  ('VOUCHER_100K', 100000, 'Voucher 100k quy đổi từ tiền cọc', 'deposit'),
  ('VOUCHER_200K', 200000, 'Voucher 200k quy đổi từ tiền cọc', 'deposit'),
  ('VOUCHER_500K', 500000, 'Voucher 500k quy đổi từ tiền cọc', 'deposit');
```

### Bước 3: Deploy React code

Các file sẽ tự động được deploy khi push code:
- `src/components/VoucherConversionModal.jsx` (file mới)
- `src/pages/MyWalletPage.jsx` (file sửa)
- `src/services/walletService.js` (file sửa)

## 📱 UX Flow

### Khi user click "Quy đổi Voucher"

```
1. Modal mở lên với 2 tabs: "Tiền Cọc" | "Tiền Thưởng"
2. Hiển thị số dư hiện tại của loại tiền đã chọn
3. Danh sách voucher khả dụng
4. User chọn voucher
5. Xem chi tiết: "Quy đổi X đ → Nhận voucher XXXXX"
6. Click "Xác Nhận Quy Đổi"
7. Backend xử lý:
   - Kiểm tra đủ tiền
   - Trừ balance
   - Tạo user_voucher record
   - Ghi lại quá trình conversion
   - Log transaction
8. Success message + reload wallet

```

## 💰 Luồng Dữ Liệu

### Quy đổi Tiền Cọc → Voucher

```sql
-- 1. Check balance_coc >= amount
SELECT balance_coc FROM profiles WHERE id = user_id

-- 2. Trừ balance_coc
UPDATE profiles SET balance_coc = balance_coc - amount

-- 3. Tạo user_voucher (nhân chứng quyền sở hữu)
INSERT INTO user_vouchers (user_id, voucher_id, source_type='conversion_deposit')

-- 4. Ghi lại conversion history
INSERT INTO voucher_conversions (user_id, amount, source_type='balance_coc')

-- 5. Log transaction
INSERT INTO wallet_transactions (type='convert_to_voucher', source_type='coc')
```

### Sau khi quy đổi

User sở hữu:
- `user_vouchers` record → có thể sử dụng trong app
- Số dư `balance_coc` giảm đi

## 🎯 Các Trường Hợp Sử Dụng

### 1. User có tiền cọc dư muốn đổi voucher

```
Balance_COC: 150.000 đ
- Chọn voucher 100.000 đ → xác nhận
- Kết quả: Balance_COC = 50.000 đ + 1 voucher 100.000 đ
```

### 2. User có tiền thưởng muốn split (vừa quy đổi voucher vừa rút tiền)

```
Balance_THUONG: 1.000.000 đ
- Quy đổi 500.000 đ → voucher
- Rút 500.000 đ → ngân hàng
- Kết quả: Balance_THUONG = 0 + 1 voucher 500k + ngân hàng nhận 500k
```

### 3. User dùng voucher để thanh toán

Trong PetDetailPage (phase 2):
```javascript
// Hiển thị danh sách user_vouchers
const userVouchers = await getUserVouchers(userId);

// User chọn voucher làm phương thức thanh toán
// Trừ giá trị voucher từ deposit amount required
```

## ✅ Checklist Triển Khai

- [ ] Chạy `database/vouchers.sql` trong Supabase
- [ ] Chạy `database/voucher_functions.sql` trong Supabase
- [ ] Thêm sample vouchers qua INSERT
- [ ] Deploy React components
- [ ] Test flow quy đổi Balance_COC
- [ ] Test flow quy đổi Balance_THUONG
- [ ] Test error cases (insufficient balance, invalid voucher)
- [ ] Check wallet_transactions log
- [ ] Check user_vouchers được tạo đúng
- [ ] Verify RLS policies hoạt động

## 🔒 Security

### RLS Policies

```sql
-- Vouchers: Public read (mọi ai xem được danh sách)
-- User_vouchers: Users chỉ thấy voucher của chính họ
-- Voucher_conversions: Users chỉ thấy conversion của chính họ
```

### Input Validation

```javascript
// Frontend validates:
- amount > 0
- amount <= available balance
- voucherCode exists

// Backend (SQL) validates:
- balance >= amount (with lock)
- voucher code valid
- user exists
```

## 📊 Monitoring

### Lịch sử Giao Dịch

```sql
-- Query lịch sử quy đổi của user
SELECT * FROM wallet_transactions 
WHERE user_id = 'xxx' AND type = 'convert_to_voucher'
ORDER BY created_at DESC;

-- Query vouchers của user
SELECT * FROM user_vouchers
WHERE user_id = 'xxx' AND status = 'active'
ORDER BY acquired_at DESC;
```

## 🐛 Troubleshooting

### Modal không hiển thị
- Check `userId` được lấy đúng từ `loadData()`
- Check import VoucherConversionModal đúng

### Quy đổi thất bại "Mã voucher không hợp lệ"
- Check voucher code trong database (case-sensitive)
- Check voucher code ở client match với database

### Balance không cập nhật sau quy đổi
- Click "🔄 Làm mới" để reload
- Check `onSuccess` callback được gọi

### RLS Error
- Kiểm tra policies được tạo đúng
- Check user auth status

## 📚 Related Files

- `WALLET_SPLIT_BALANCE_IMPLEMENTATION.md` - Tách cọc/thưởng
- `WALLET_SERVICE_USAGE_GUIDE.md` - API guide
- `src/components/HowItWorks.jsx` - Hướng dẫn user (update nếu cần)

## 🎉 Hoàn Thành

Chức năng quy đổi voucher đã sẵn sàng cho:
1. **Tiền cọc** → Voucher (không rút được)
2. **Tiền thưởng** → Voucher (hoặc rút tiền)
3. **Sử dụng voucher** trong phase 2 (đặt cọc)

---

**Last Updated**: December 14, 2025  
**Status**: ✅ Ready to Deploy
