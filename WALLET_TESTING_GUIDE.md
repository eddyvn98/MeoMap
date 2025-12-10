# 📖 HƯỚNG DẪN KIỂM TRA & VERIFY LUỒNG VÍ CÁ NHÂN

**Cập nhật:** December 10, 2025  
**Phiên bản:** 2.0 - Sau khi fix

---

## 🎯 MỤC ĐÍCH

Tài liệu này giúp bạn:
1. **Hiểu rõ** luồng hoạt động của ví cá nhân
2. **Kiểm tra** tính đúng đắn của tất cả các điểm
3. **Phát hiện** lỗi nếu có
4. **Test** toàn bộ flow từ đầu đến cuối

---

## 🏗️ KIẾN TRÚC LUỒNG VÍ

### Các thành phần chính:

```
┌─────────────────────────────────────────────────────┐
│                   WALLET FLOW                        │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1️⃣  Load Ví Ban Đầu                                │
│      └─ profiles.wallet_credit                      │
│                                                      │
│  2️⃣  Tính Toán Split                                │
│      ├─ splitWalletAndCash()                        │
│      └─ walletUsed + cashAmount = requiredAmount   │
│                                                      │
│  3️⃣  Đặt Cọc (Trừ Ví)                               │
│      ├─ decrease_wallet_credit() RPC                │
│      ├─ UPDATE profiles.wallet_credit               │
│      └─ INSERT wallet_transactions (amount: -)      │
│                                                      │
│  4️⃣  Hủy Giao Dịch (Hoàn Tiền)                      │
│      ├─ increase_wallet_credit() RPC                │
│      ├─ UPDATE profiles.wallet_credit               │
│      └─ INSERT wallet_transactions (amount: +)      │
│                                                      │
│  5️⃣  Xem Lịch Sử Ví                                 │
│      └─ wallet_transactions query                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST KIỂM TRA

### Phase 1: Chuẩn Bị (Trước Testing)

- [ ] Đã chạy `ADD_WALLET_COLUMNS_TO_DEPOSITS.sql` trong Supabase?
- [ ] Đã chạy `WALLET_TRANSACTIONS_MIGRATION.sql` trong Supabase?
- [ ] Đã deploy frontend code mới?
- [ ] Đã kiểm tra console browser không có error?
- [ ] Đã kiểm tra RPC functions tồn tại?

```sql
-- Kiểm tra migrations
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name='deposits' AND column_name='wallet_used'
) as has_wallet_used,
EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name='deposits' AND column_name='cash_amount'
) as has_cash_amount,
EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name='wallet_transactions'
) as has_wallet_transactions;
```

---

### Phase 2: Test Scenario 1 - Đặt Cọc Toàn Bộ Ví

**Tiền điều kiện:**
- Đã đăng nhập
- User có `wallet_credit = 100,000 đ`
- Mèo có `max_deposit = 50,000 đ`
- User không có `bad_trades`

**Các bước:**

1. Mở trang `/pet/{pet_id}`
   - [ ] Load thành công
   - [ ] Hiển thị ví: "Số dư: 100,000 đ"

2. Nhập số tiền cọc: `50000`
   - [ ] Hiển thị tính toán: "Cọc 50,000 đ"
   - [ ] Hiển thị preview: "Dùng từ ví: 50,000 đ, Cần chuyển khoản: 0 đ"
   - [ ] **Không** hiển thị QR chuyển khoản

3. Click "Đặt cọc"
   - [ ] Hiển thị loading
   - [ ] Thành công → Redirect

4. Kiểm tra DB:
```sql
-- Kiểm tra ví giảm
SELECT wallet_credit FROM profiles WHERE id = 'USER_ID';
-- Expected: 50000

-- Kiểm tra deposit
SELECT amount, wallet_used, cash_amount, status 
FROM deposits 
WHERE receiver_id = 'USER_ID' 
ORDER BY created_at DESC LIMIT 1;
-- Expected: amount=50000, wallet_used=50000, cash_amount=0, status='confirmed'

-- Kiểm tra transaction log
SELECT type, amount 
FROM wallet_transactions 
WHERE user_id = 'USER_ID' AND type='use_for_deposit'
ORDER BY created_at DESC LIMIT 1;
-- Expected: type='use_for_deposit', amount=-50000
```

5. Kiểm tra trang ví `/wallet`:
   - [ ] Hiển thị số dư: "50,000 đ"
   - [ ] Lịch sử giao dịch: Thấy "-50,000 đ" (loại: Dùng ví để cọc)

**Kết quả:** ✅ PASS hoặc ❌ FAIL

---

### Phase 3: Test Scenario 2 - Đặt Cọc Split Ví + Tiền Mặt

**Tiền điều kiện:**
- Đã đăng nhập
- User có `wallet_credit = 30,000 đ`
- Mèo có `max_deposit = 100,000 đ`
- User có `bad_trades = 1` (uy tín xấu)

**Các bước:**

1. Mở trang `/pet/{pet_id}`
   - [ ] Load thành công
   - [ ] Hiển thị ví: "Số dư: 30,000 đ"

2. Nhập số tiền cọc: `100000`
   - [ ] Hiển thị tính toán: "Bạn đã bị đánh giá không tốt 1 lần, số tiền cọc sẽ tăng 50% và làm tròn."
   - [ ] Hiển thị tính toán: "Cọc 150,000 đ" (100k * 1.5 = 150k)
   - [ ] Hiển thị preview: "Dùng từ ví: 30,000 đ, Cần chuyển khoản: 120,000 đ"
   - [ ] **Hiển thị** QR chuyển khoản 120k

3. Click "Đặt cọc"
   - [ ] Hiển thị loading
   - [ ] Hiển thị QR + thông tin chuyển khoản
   - [ ] Thành công → Lưu deposit

4. Kiểm tra DB:
```sql
-- Kiểm tra ví giảm
SELECT wallet_credit FROM profiles WHERE id = 'USER_ID';
-- Expected: 0

-- Kiểm tra deposit
SELECT amount, wallet_used, cash_amount, status 
FROM deposits 
WHERE receiver_id = 'USER_ID' 
ORDER BY created_at DESC LIMIT 1;
-- Expected: amount=150000, wallet_used=30000, cash_amount=120000, status='pending'

-- Kiểm tra transaction log
SELECT type, amount 
FROM wallet_transactions 
WHERE user_id = 'USER_ID' AND type='use_for_deposit'
ORDER BY created_at DESC LIMIT 1;
-- Expected: type='use_for_deposit', amount=-30000
```

5. Kiểm tra trang ví `/wallet`:
   - [ ] Hiển thị số dư: "0 đ"
   - [ ] Lịch sử giao dịch: Thấy "-30,000 đ" (loại: Dùng ví để cọc)

**Kết quả:** ✅ PASS hoặc ❌ FAIL

---

### Phase 4: Test Scenario 3 - Hủy Giao Dịch (Hoàn Tiền)

**Tiền điều kiện:**
- Có deposit từ scenario 2: amount=150k, wallet_used=30k, cash_amount=120k
- User nhận deposit là "receiver", owner đang hủy, hoặc hai bên đồng ý hủy

**Các bước:**

1. Mở trang `/deposit` hoặc chi tiết deposit
   - [ ] Thấy deposit
   - [ ] Thấy nút "Hủy giao"

2. Click "Hủy giao dịch"
   - [ ] Hiển thị confirm: "Bạn chắc chắn hủy?"
   - [ ] Click "Đồng ý"
   - [ ] Hiển thị loading
   - [ ] Thành công → Cập nhật UI

3. Kiểm tra DB:
```sql
-- Kiểm tra ví tăng (lên 150k)
SELECT wallet_credit FROM profiles WHERE id = 'RECEIVER_ID';
-- Expected: 150000 (nếu ban đầu là 0)

-- Kiểm tra deposit
SELECT amount, wallet_used, cash_amount, delivery_status 
FROM deposits 
WHERE id = 'DEPOSIT_ID';
-- Expected: amount=150000, delivery_status='cancelled_no_trade'

-- Kiểm tra transaction log (hoàn tiền)
SELECT type, amount 
FROM wallet_transactions 
WHERE user_id = 'RECEIVER_ID' AND type='refund_deposit'
ORDER BY created_at DESC LIMIT 1;
-- Expected: type='refund_deposit', amount=150000
```

4. Kiểm tra trang ví `/wallet`:
   - [ ] Hiển thị số dư: "150,000 đ"
   - [ ] Lịch sử giao dịch: 
     - Thấy "+150,000 đ" (loại: Hoàn cọc)
     - Thấy "-30,000 đ" (loại: Dùng ví để cọc)

**Kết quả:** ✅ PASS hoặc ❌ FAIL

---

### Phase 5: Test Scenario 4 - Blacklist (Bad Trades >= 3)

**Tiền điều kiện:**
- User có `bad_trades = 3`
- Có tiền trong ví

**Các bước:**

1. Mở trang `/pet/{pet_id}`
   - [ ] Load thành công

2. Kiểm tra nút "Đặt cọc":
   - [ ] Nút bị **DISABLE** (xám hoặc không click được)
   - [ ] Hiển thị message: "Tài khoản đã bị hạ uy tín 3 lần. Không thể đặt cọc."

3. Thử nhập số tiền + click:
   - [ ] Hiển thị error: "Tài khoản đã bị hạ uy tín 3 lần. Không thể đặt cọc."

**Kết quả:** ✅ PASS hoặc ❌ FAIL

---

### Phase 6: Test Scenario 5 - Không Có Ví Ban Đầu

**Tiền điều kiện:**
- User mới (không có profile hoặc wallet_credit=null)

**Các bước:**

1. Mở trang `/pet/{pet_id}`
   - [ ] Load thành công (không crash)
   - [ ] Hiển thị ví: "Số dư: 0 đ" (mặc định)

2. Nhập số tiền cọc: `50000`
   - [ ] Hiển thị preview: "Dùng từ ví: 0 đ, Cần chuyển khoản: 50,000 đ"
   - [ ] Hiển thị QR chuyển khoản

3. Click "Đặt cọc"
   - [ ] Thành công (vì không dùng ví)
   - [ ] Không gọi `decrease_wallet_credit()`

**Kết quả:** ✅ PASS hoặc ❌ FAIL

---

## 🐛 DEBUG COMMANDS

### Nếu gặp lỗi, kiểm tra:

```sql
-- 1. Kiểm tra user có profile không
SELECT id, wallet_credit FROM profiles WHERE id = 'USER_ID';

-- 2. Kiểm tra deposit
SELECT id, receiver_id, amount, wallet_used, cash_amount, status 
FROM deposits 
WHERE id = 'DEPOSIT_ID';

-- 3. Kiểm tra wallet_transactions
SELECT id, user_id, type, amount, deposit_id, note, created_at
FROM wallet_transactions
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;

-- 4. Kiểm tra RPC error
-- Thử gọi RPC:
SELECT increase_wallet_credit('USER_ID'::uuid, 10000);

-- 5. Kiểm tra RLS policy
SELECT * FROM pg_policies WHERE tablename='wallet_transactions';

-- 6. Kiểm tra trigger
SELECT * FROM pg_trigger WHERE tgrelname='deposits';
```

---

## 📊 EXPECTED DATA FLOW

### Scenario 2 - Visual:

```
START:
├─ profiles.wallet_credit = 30,000
├─ deposit.wallet_used = 0
├─ deposit.cash_amount = 0
└─ wallet_transactions = []

USER INPUT: 100,000 (deposit amount)
├─ bad_trades = 1 → tăng 50%
└─ finalAmount = 150,000

SPLIT:
├─ splitWalletAndCash(150000, 30000)
├─ walletUsed = 30,000
└─ cashAmount = 120,000

SUBMIT DEPOSIT:
├─ INSERT deposits (amount=150k, wallet_used=30k, cash_amount=120k)
├─ CALL decrease_wallet_credit(user, 30000, 'use_for_deposit', deposit_id)
│  ├─ UPDATE profiles.wallet_credit = 30k - 30k = 0
│  └─ INSERT wallet_transactions (type='use_for_deposit', amount=-30000)
└─ frontend: setWalletCredit(0)

RESULT:
├─ profiles.wallet_credit = 0 ✅
├─ deposits.amount = 150,000 ✅
├─ deposits.wallet_used = 30,000 ✅
├─ deposits.cash_amount = 120,000 ✅
└─ wallet_transactions log = -30,000 ✅

CANCEL DEPOSIT:
├─ UPDATE deposits.delivery_status = 'cancelled_no_trade'
├─ CALL increase_wallet_credit(receiver, 150000, 'refund_deposit', deposit_id)
│  ├─ UPDATE profiles.wallet_credit = 0 + 150k = 150k
│  └─ INSERT wallet_transactions (type='refund_deposit', amount=150000)
└─ frontend: reload

FINAL RESULT:
├─ profiles.wallet_credit = 150,000 ✅
└─ wallet_transactions = [-30000, +150000] ✅
```

---

## 🎯 FIXES APPLIED (v2.0)

### ✅ FIX #1: Lịch sử ví chỉ refund_deposit → Tất cả loại

**File:** `src/pages/MyWalletPage.jsx`

**Thay đổi:**
```jsx
// BEFORE:
.eq("type", "refund_deposit")

// AFTER:
.in("type", ["refund_deposit", "use_for_deposit"])
```

**Impact:** User giờ thấy đầy đủ lịch sử: hoàn tiền + dùng ví

---

### ✅ FIX #2: Error handling khi load profile

**File:** `src/pages/PetDetailPage.jsx`

**Thay đổi:**
```jsx
// BEFORE:
.single() // crash nếu không tìm

// AFTER:
.maybeSingle() // trả null nếu không tìm
const { data: profile, error: profileErr } = ...
if (profileErr) {
  console.error("Error loading profile:", profileErr);
}
```

**Impact:** Không crash nếu user chưa có profile

---

### ✅ FIX #3: Re-fetch ví sau decrease

**File:** `src/pages/PetDetailPage.jsx`

**Thay đổi:**
```jsx
// BEFORE:
setWalletCredit(walletCredit - walletUsed); // tính toán local

// AFTER:
// Re-fetch từ DB để đảm bảo đồng bộ
const { data: updatedProfile } = await supabase
  .from("profiles")
  .select("wallet_credit")
  .eq("id", currentUser.id)
  .single();

setWalletCredit(updatedProfile?.wallet_credit || 0); // từ DB
```

**Impact:** Đảm bảo wallet_credit luôn đúng với DB

---

## 📋 FILES THAY ĐỔI

- ✅ `src/pages/MyWalletPage.jsx` - Query + UI
- ✅ `src/pages/PetDetailPage.jsx` - Error handling + re-fetch
- 📄 `WALLET_FLOW_VERIFICATION.md` - This file
- 📄 `WALLET_FLOW_TEST.sql` - Test queries

---

## 🚀 DEPLOYMENT CHECKLIST

Trước khi push lên production:

- [ ] Tất cả 6 test scenarios đều PASS
- [ ] Không có console error
- [ ] Kiểm tra DB không có data sai
- [ ] Kiểm tra RLS policies đúng
- [ ] Kiểm tra RPC functions đúng

---

## 📞 TROUBLESHOOTING

### Q: Trang `/wallet` không hiển thị giao dịch
**A:** Kiểm tra:
1. Có dữ liệu trong `wallet_transactions` không?
2. `user_id` có đúng không?
3. RLS policy cho phép SELECT không?

```sql
SELECT * FROM wallet_transactions WHERE user_id = 'YOUR_ID';
```

---

### Q: Số dư ví không giảm khi đặt cọc
**A:** Kiểm tra:
1. Có gọi `decrease_wallet_credit()` không?
2. Error message là gì?
3. Kiểm tra `walletUsed > 0` có đúng không?

```sql
SELECT wallet_credit FROM profiles WHERE id = 'USER_ID';
```

---

### Q: Hoàn tiền không vào ví
**A:** Kiểm tra:
1. Deposit có status = 'cancelled_no_trade' không?
2. Có gọi `increase_wallet_credit()` không?
3. `receiver_id` có đúng không?

```sql
SELECT delivery_status, receiver_id FROM deposits WHERE id = 'DEPOSIT_ID';
```

---

## ✨ SUMMARY

| Điểm | Trạng thái | Ghi chú |
|-----|-----------|---------|
| Load ví | ✅ OK | Có error handling |
| Tính split | ✅ OK | Logic chính xác |
| Decrease RPC | ✅ OK | Kiểm tra số dư |
| Increase RPC | ✅ OK | Hoàn tiền chính xác |
| Lịch sử ví | ✅ FIXED | Hiện tất cả loại |
| Re-fetch | ✅ FIXED | Đồng bộ với DB |

**Overall Status: ✅ READY FOR TESTING**

---

**Tài liệu này được cập nhật: December 10, 2025**

