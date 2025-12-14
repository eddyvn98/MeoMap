# Sửa lỗi hệ thống treo thưởng (Bounty System Fix)

## Vấn đề đã phát hiện

1. **Người dùng có thể treo thưởng mà không cần đăng nhập** ❌
2. **Người dùng có thể treo thưởng mà không cần có tiền trong ví** ❌

## Giải pháp đã triển khai

### 1. Cập nhật function `createBounty()` - [src/bounty.js](src/bounty.js)

**Các kiểm tra bắt buộc mới:**

✅ **Kiểm tra đăng nhập:**
- Bắt buộc người dùng phải đăng nhập trước khi treo thưởng
- Trả về lỗi: "Bạn phải đăng nhập để treo thưởng"

✅ **Kiểm tra số dư ví:**
- Lấy `balance_thuong` từ profile
- So sánh với số tiền muốn treo
- Trả về lỗi nếu không đủ: "Số dư ví không đủ. Số dư hiện tại: XXXđ, cần: XXXđ"

✅ **Trừ tiền từ ví:**
- Gọi RPC function `decrease_balance_thuong()` để trừ tiền
- Nếu trừ tiền thất bại → không cho phép tạo bounty
- Nếu tạo bounty thất bại → hoàn lại tiền tự động

✅ **Ghi log giao dịch:**
- Tất cả giao dịch treo thưởng đều được ghi vào `wallet_transactions`
- Type: `bounty_locked`
- Source: `thuong`

### 2. Cập nhật UI BountyModal - [src/components/BountyModal.jsx](src/components/BountyModal.jsx)

**Hiển thị số dư ví:**
```jsx
💰 Số dư ví thưởng của bạn: XXX,XXXđ
Tiền treo thưởng sẽ được trừ từ số dư này
```

**Kiểm tra trước khi submit:**
- Hiển thị thông báo nếu chưa đăng nhập
- Kiểm tra số tiền nhập vào không vượt quá số dư
- Cập nhật số dư sau khi treo thành công

**Input validation:**
- Thêm thuộc tính `max={walletBalance}` cho input
- Hiển thị "Tối đa: XXX,XXXđ" 
- Thông báo số dư còn lại sau khi treo

### 3. Tạo Database Function mới - [ADD_DECREASE_BALANCE_THUONG.sql](ADD_DECREASE_BALANCE_THUONG.sql)

**Function: `decrease_balance_thuong()`**

Chức năng:
- Trừ `balance_thuong` khi treo thưởng
- Kiểm tra user tồn tại
- Kiểm tra đủ số dư
- Ghi log vào `wallet_transactions`
- Trả về kết quả chi tiết (balance_before, balance_after)

## Flow hoạt động mới

```
1. User nhấn "Treo thưởng"
   ↓
2. Check: Đã đăng nhập? 
   ↓ (Không → Hiển thị lỗi)
   ↓ (Có)
3. Hiển thị số dư ví hiện tại
   ↓
4. User nhập số tiền
   ↓
5. Check: Số tiền <= balance_thuong?
   ↓ (Không → Hiển thị lỗi)
   ↓ (Có)
6. Gọi decrease_balance_thuong() - Trừ tiền từ ví
   ↓ (Thất bại → Hiển thị lỗi)
   ↓ (Thành công)
7. Tạo record trong bảng bounties
   ↓ (Thất bại → Hoàn tiền)
   ↓ (Thành công)
8. Hiển thị mã tham chiếu & QR code
```

## Cách triển khai

### Bước 1: Chạy migration SQL
```bash
# Kết nối vào Supabase SQL Editor và chạy:
cat ADD_DECREASE_BALANCE_THUONG.sql
```

### Bước 2: Deploy code
```bash
# Code đã được cập nhật, chỉ cần commit và deploy:
git add src/bounty.js src/components/BountyModal.jsx
git commit -m "Fix: Require login and wallet balance for bounty posting"
git push
```

### Bước 3: Test
1. **Test không đăng nhập:**
   - Mở trang chi tiết ca cứu hộ
   - Click "Treo thưởng" khi chưa đăng nhập
   - ✅ Phải hiển thị: "Bạn cần đăng nhập để treo thưởng"

2. **Test không đủ tiền:**
   - Đăng nhập với tài khoản có balance_thuong = 0
   - Thử treo thưởng 100,000đ
   - ✅ Phải hiển thị: "Số dư ví không đủ"

3. **Test thành công:**
   - Đăng nhập với tài khoản có balance_thuong = 500,000đ
   - Treo thưởng 100,000đ
   - ✅ Số dư còn lại: 400,000đ
   - ✅ Bounty được tạo thành công
   - ✅ Giao dịch được ghi log

## Lưu ý quan trọng

⚠️ **Breaking Change:**
- Người dùng giờ đây PHẢI có tiền trong ví `balance_thuong` để treo thưởng
- Không còn cho phép treo thưởng "hứa trả sau"
- Tất cả bounty đều bị khóa tiền ngay lập tức

💡 **Hướng dẫn cho người dùng:**
- Nạp tiền vào ví trước khi treo thưởng
- Có thể rút lại nếu không ai nhận hoặc người cứu từ chối
- Tiền sẽ được hoàn lại tự động khi bounty bị reject

## Files đã thay đổi

1. ✅ [src/bounty.js](src/bounty.js) - Logic tạo bounty
2. ✅ [src/components/BountyModal.jsx](src/components/BountyModal.jsx) - UI treo thưởng
3. ✅ [ADD_DECREASE_BALANCE_THUONG.sql](ADD_DECREASE_BALANCE_THUONG.sql) - Database function

## Kết quả

✅ Không thể treo thưởng khi chưa đăng nhập
✅ Không thể treo thưởng khi không đủ tiền
✅ Tiền được trừ ngay từ ví
✅ Có thể hoàn tiền nếu bounty bị reject
✅ Tất cả giao dịch đều được ghi log
