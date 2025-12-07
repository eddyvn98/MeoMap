# WALLET SYSTEM MIGRATION GUIDE

## Tổng quan

Hệ thống ví cho phép người dùng:
1. **Dùng ví để đặt cọc** (không cần chuyển khoản nếu đủ tiền ví)
2. **Nhận hoàn tiền vào ví** khi hủy giao dịch
3. **Xem lịch sử giao dịch** ví

## Các bước migration (QUAN TRỌNG - CHẠY THEO THỨ TỰ)

### Bước 1: Thêm cột wallet_used & cash_amount vào bảng deposits

```bash
File: ADD_WALLET_COLUMNS_TO_DEPOSITS.sql
```

Chạy trong Supabase SQL Editor để thêm:
- `wallet_used`: Số tiền đã dùng từ ví
- `cash_amount`: Số tiền cần chuyển khoản

### Bước 2: Tạo bảng wallet_transactions và RPC functions

```bash
File: WALLET_TRANSACTIONS_MIGRATION.sql
```

Tạo:
- Bảng `wallet_transactions` (lưu lịch sử giao dịch ví)
- Function `increase_wallet_credit()` (cộng tiền vào ví + log)
- Function `decrease_wallet_credit()` (trừ tiền từ ví + log)
- RLS policies (user chỉ xem transaction của mình)

## Flow hoạt động

### 1. Đặt cọc với ví

```javascript
// User nhập: 100k
// Uy tín xấu (1 lần) -> tăng 50% -> 150k
// Ví có: 80k

Split:
- walletUsed: 80k (dùng hết ví)
- cashAmount: 70k (cần chuyển khoản thêm)

Khi submit:
1. INSERT deposits (amount=150k, wallet_used=80k, cash_amount=70k, status='pending')
2. CALL decrease_wallet_credit(user_id, 80k, 'use_for_deposit', deposit_id)
   -> profiles.wallet_credit giảm 80k
   -> wallet_transactions log: amount=-80k, type='use_for_deposit'
3. Hiển thị QR chuyển khoản 70k
```

### 2. Hủy giao dịch (hoàn tiền)

```javascript
// Deposit có: amount=150k, wallet_used=80k, cash_amount=70k

Khi cancel:
1. UPDATE deposits SET delivery_status='cancelled_no_trade'
2. CALL increase_wallet_credit(receiver_id, 150k, 'refund_deposit', deposit_id)
   -> profiles.wallet_credit tăng 150k (bao gồm cả phần từ ví + phần chuyển khoản)
   -> wallet_transactions log: amount=+150k, type='refund_deposit'
```

### 3. Xem ví

Trang `/wallet` hiển thị:
- **Số dư**: `profiles.wallet_credit`
- **Lịch sử**: `wallet_transactions WHERE type='refund_deposit'`

## UI Changes

### PetDetailPage.jsx
- ✅ Load `wallet_credit` từ profiles
- ✅ Tính `splitWalletAndCash()` real-time khi user nhập số tiền
- ✅ Hiển thị preview: "Dùng từ ví: X đ, Cần chuyển khoản: Y đ"
- ✅ Gọi `decrease_wallet_credit()` khi submit deposit
- ✅ Nếu `cashAmount=0` -> không hiển thị QR, status='confirmed' luôn

### WalletPage.jsx
- ✅ Hiển thị `wallet_credit` balance
- ✅ List `wallet_transactions` với type='refund_deposit'

### Header.jsx
- ✅ Thêm link "💰 Ví của tôi" → `/wallet`

## Testing Checklist

### Test 1: Đặt cọc toàn bộ bằng ví
1. User có wallet_credit = 100k
2. Đặt cọc 50k (uy tín OK, không tăng)
3. Expected:
   - ✅ Split: walletUsed=50k, cashAmount=0
   - ✅ Không hiển thị QR chuyển khoản
   - ✅ Status = 'confirmed' luôn
   - ✅ wallet_credit giảm còn 50k
   - ✅ wallet_transactions có log -50k

### Test 2: Đặt cọc một phần ví
1. User có wallet_credit = 30k
2. Đặt cọc 100k (uy tín xấu 1 lần -> 150k)
3. Expected:
   - ✅ Split: walletUsed=30k, cashAmount=120k
   - ✅ Hiển thị QR chuyển khoản 120k
   - ✅ Status = 'pending'
   - ✅ wallet_credit giảm còn 0k
   - ✅ wallet_transactions có log -30k

### Test 3: Hủy giao dịch
1. Deposit có amount=150k (wallet_used=30k, cash_amount=120k)
2. Owner click "Hủy giao"
3. Expected:
   - ✅ delivery_status = 'cancelled_no_trade'
   - ✅ wallet_credit tăng 150k (cả 2 phần)
   - ✅ wallet_transactions có log +150k type='refund_deposit'
   - ✅ Trang /wallet hiển thị balance + transaction

### Test 4: Blacklist không dùng ví
1. User có bad_trades >= 3
2. Vào /pet/:id
3. Expected:
   - ✅ Nút "Đặt cọc" bị disable
   - ✅ Hiển thị message: "Tài khoản đã bị hạ uy tín 3 lần"
   - ✅ Không cho submit dù có tiền ví

## SQL Functions Reference

### increase_wallet_credit
```sql
-- Cộng tiền vào ví + log transaction
CALL increase_wallet_credit(
  p_user_id := 'uuid',
  p_amount := 100000,
  p_type := 'refund_deposit',
  p_deposit_id := 'deposit-uuid',
  p_note := 'Hoàn cọc do hủy giao mèo'
);
```

### decrease_wallet_credit
```sql
-- Trừ tiền từ ví + log transaction
CALL decrease_wallet_credit(
  p_user_id := 'uuid',
  p_amount := 50000,
  p_type := 'use_for_deposit',
  p_deposit_id := 'deposit-uuid',
  p_note := 'Dùng ví để đặt cọc nhận mèo'
);
```

## Troubleshooting

### Lỗi: "Không đủ tiền trong ví"
- Check: `SELECT wallet_credit FROM profiles WHERE id = 'user-id'`
- Nguyên nhân: User đã dùng hết ví hoặc số dư không đủ
- Fix: User cần chuyển khoản đủ cash_amount

### Lỗi: wallet_transactions không có dữ liệu
- Check: Đã chạy migration `WALLET_TRANSACTIONS_MIGRATION.sql` chưa?
- Check: RPC function đã tạo chưa: `SELECT * FROM pg_proc WHERE proname LIKE '%wallet_credit%'`

### Lỗi: deposits thiếu cột wallet_used/cash_amount
- Check: Đã chạy `ADD_WALLET_COLUMNS_TO_DEPOSITS.sql` chưa?
- Check: `SELECT column_name FROM information_schema.columns WHERE table_name='deposits'`

## Files Changed

### SQL Migrations (RUN FIRST)
1. `ADD_WALLET_COLUMNS_TO_DEPOSITS.sql` - Thêm cột vào deposits
2. `WALLET_TRANSACTIONS_MIGRATION.sql` - Tạo bảng + RPC functions

### Frontend Files
1. `src/pages/PetDetailPage.jsx` - Logic dùng ví + preview
2. `src/pages/WalletPage.jsx` - Trang xem ví
3. `src/deposit.js` - Nhận params wallet_used, cash_amount
4. `src/components/Header.jsx` - Link "Ví của tôi"
5. `src/router.jsx` - Route /wallet

## Next Steps

1. ✅ Chạy 2 SQL migrations trong Supabase
2. ✅ Deploy frontend lên Firebase
3. ✅ Test flow đặt cọc với ví
4. ✅ Test flow hủy giao dịch
5. ✅ Verify wallet_transactions logs correctly
