# 📋 WALLET SPLIT BALANCE IMPLEMENTATION GUIDE

## 📚 Tài liệu SQL Migration
File: `WALLET_SPLIT_BALANCE_MIGRATION.sql`

**Nội dung migration:**
1. ✅ Thêm 2 cột vào `profiles`: `balance_coc`, `balance_thuong`
2. ✅ Tạo bảng `withdrawal_requests` cho rút tiền thủ công
3. ✅ Enable RLS cho withdrawal_requests
4. ✅ Thêm cột `source_type` vào `wallet_transactions`
5. ✅ Tạo 5 RPC functions:
   - `create_withdrawal_request()` - Tạo yêu cầu rút tiền
   - `increase_balance_coc()` - Tăng cọc
   - `decrease_balance_coc()` - Giảm cọc
   - `increase_balance_thuong()` - Tăng thưởng
   - `approve_withdrawal_request()` - Admin duyệt rút tiền

---

## 🚀 BƯỚC THỰC HIỆN

### 1. Chạy SQL Migration
1. Mở Supabase SQL Editor
2. Copy & Paste `WALLET_SPLIT_BALANCE_MIGRATION.sql`
3. Chạy toàn bộ migration

### 2. Verify Database
```sql
-- Kiểm tra cột mới
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('balance_coc', 'balance_thuong');

-- Kiểm tra bảng withdrawal_requests
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'withdrawal_requests'
) as table_exists;

-- Kiểm tra RPC functions
SELECT proname FROM pg_proc
WHERE proname LIKE 'increase_balance%'
  OR proname LIKE 'decrease_balance%'
  OR proname LIKE 'create_withdrawal%';
```

### 3. Update Frontend Files
Cần update:
- ✅ `src/pages/MyWalletPage.jsx` - Hiển thị 2 balance + tạo withdrawal request
- ✅ `src/services/walletService.js` - API gọi RPC functions mới
- ✅ `src/pages/PetDetailPage.jsx` - Dùng `decrease_balance_coc()` khi nộp cọc
- ✅ `src/components/HowItWorks.jsx` - Update UI text (đã sửa)

### 4. Testing
**Test cases:**
1. Hiển thị balance_coc + balance_thuong đúng
2. Tạo withdrawal request
3. Check lịch sử giao dịch
4. Admin approve/reject withdrawal

---

## 🔑 KEY CHANGES

### Before (Old System)
```
profiles.wallet_credit  ← Trộn lẫn cọc + thưởng
```

### After (New System)
```
profiles.balance_coc      ← Cọc (không rút)
profiles.balance_thuong   ← Thưởng (được rút)

withdrawal_requests       ← Track yêu cầu rút tiền
  ├─ status: pending/approved/completed/rejected
  ├─ bank_account: STK nhận tiền
  └─ amount: số tiền muốn rút
```

---

## 💡 LOGIC FLOW

### Khi người dùng nộp cọc
```
1. Call: decrease_balance_coc(user_id, amount, deposit_id)
   ├─ Kiểm tra: balance_coc >= amount
   ├─ Trừ: balance_coc -= amount
   └─ Log: wallet_transactions (type='use_for_deposit', source_type='coc')
```

### Khi hoàn cọc
```
1. Call: increase_balance_coc(user_id, amount, deposit_id)
   ├─ Tăng: balance_coc += amount
   └─ Log: wallet_transactions (type='refund_deposit', source_type='coc')
```

### Khi nhận thưởng Lost/Rescue
```
1. Call: increase_balance_thuong(user_id, amount, source='bounty')
   ├─ Tăng: balance_thuong += amount
   └─ Log: wallet_transactions (type='bounty', source_type='thuong')
```

### Khi rút tiền
```
1. Call: create_withdrawal_request(user_id, amount, bank_account)
   ├─ Kiểm tra: balance_thuong >= amount
   ├─ Tạo: withdrawal_requests (status='pending')
   └─ Chờ admin duyệt

2. Admin approve → Call: approve_withdrawal_request(request_id)
   ├─ Trừ: balance_thuong -= amount
   ├─ Update: withdrawal_requests (status='approved')
   └─ Log: wallet_transactions (type='withdrawal_approved')

3. Admin mark completed (manual/external)
   └─ Update: withdrawal_requests (status='completed')
```

---

## 📊 Database Schema

### Table: profiles (columns thêm mới)
```sql
balance_coc INTEGER DEFAULT 0       -- Cọc, không rút
balance_thuong INTEGER DEFAULT 0    -- Thưởng, được rút
```

### Table: withdrawal_requests (bảng mới)
```sql
id UUID PRIMARY KEY
user_id UUID FOREIGN KEY
amount INTEGER
status TEXT ('pending', 'approved', 'completed', 'rejected')
bank_account TEXT
bank_name TEXT
account_holder TEXT
requested_at TIMESTAMP
approved_at TIMESTAMP
completed_at TIMESTAMP
rejection_reason TEXT
transaction_ref TEXT
notes TEXT
```

### Table: wallet_transactions (cột thêm mới)
```sql
source_type TEXT ('coc' | 'thuong') -- Loại tiền
```

---

## 📝 Next Steps
1. ✅ SQL Migration (DONE)
2. ⏳ Update frontend MyWalletPage
3. ⏳ Update frontend PetDetailPage
4. ⏳ Create walletService API functions
5. ⏳ Create admin withdrawal approval page
6. ⏳ Test all flows
7. ⏳ Deploy to staging
8. ⏳ Final testing & production deploy

---

## 🎯 Lợi ích
- ✅ Rõ ràng: Cọc ≠ Thưởng
- ✅ An toàn: Cọc không bị rút (tránh trá hình)
- ✅ Công bằng: Người giúp đỡ (Lost/Rescue) được rút tiền thưởng
- ✅ Tuân thủ: Rút tiền thủ công, admin kiểm soát

---

**Created:** December 13, 2025
**Status:** Migration SQL Ready
**Next:** Frontend Implementation
