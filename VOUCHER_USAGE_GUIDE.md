# 🎫 VOUCHER USAGE GUIDE - Hướng Dẫn Sử Dụng Voucher

## 📋 Tóm Tắt

Sau khi **quy đổi voucher**, user có thể:

1. **Xem danh sách voucher** trong tab "🎫 Voucher của tôi"
2. **Sử dụng voucher để giảm tiền cọc** khi đặt cọc nhận mèo (sắp triển khai Phase 2)
3. **Copy mã voucher** để dùng trong các giao dịch khác

---

## 🎬 User Flow

### Bước 1: Quy Đổi Voucher (✅ Đã hoàn thành)

**Tại page:** MyWalletPage → Tab "Tổng quan"

```
1. Click "💳 Quy đổi Voucher" (trên Balance_COC hoặc Balance_THUONG card)
   ↓
2. Modal hiển thị:
   - Chọn loại: "Tiền Cọc" hoặc "Tiền Thưởng"
   - Danh sách voucher khả dụng
   ↓
3. Chọn voucher + xác nhận
   ↓
4. ✅ Thành công! Voucher được thêm vào ví
```

**Kết quả:**
- ❌ Balance_COC hoặc Balance_THUONG **giảm đi**
- ✅ Voucher được lưu vào `user_vouchers` table
- 📋 Giao dịch được ghi vào `wallet_transactions`

---

### Bước 2: Xem Voucher (✅ Đã triển khai)

**Tại page:** MyWalletPage → Tab "🎫 Voucher của tôi"

```
Hiển thị:
├─ Danh sách voucher đã quy đổi
├─ Mã voucher (code)
├─ Giá trị (amount)
├─ Trạng thái (active, used, expired, revoked)
├─ Nơi nhận (conversion_deposit, conversion_bounty, etc)
└─ Nút "📋 Copy Mã" để copy code voucher
```

**Features:**
- 🟢 **Active (Có thể dùng)** - Voucher mới quy đổi
- ⚫ **Used (Đã dùng)** - Voucher đã sử dụng 1 lần
- ❌ **Expired (Hết hạn)** - Voucher quá hạn
- ⊘ **Revoked (Bị thu hồi)** - Voucher bị admin hủy

---

### Bước 3: Sử Dụng Voucher Khi Đặt Cọc (🔜 Sắp triển khai Phase 2)

**Tại page:** PetDetailPage → Form đặt cọc

```
1. User nhập số tiền cọc (VD: 150.000 đ)
   ↓
2. Hiển thị: "🎫 Dùng voucher để giảm tiền cọc"
   ├─ Danh sách voucher khả dụng
   └─ Preview: "Giảm X đ → Cần thanh toán Y đ"
   ↓
3. User chọn voucher (optional)
   ↓
4. Submit deposit
   ├─ Nếu dùng voucher: Giá trị voucher trừ từ deposit amount
   └─ Số tiền cần thanh toán = deposit amount - voucher value
   ↓
5. ✅ Deposit được tạo + voucher được mark as "used"
```

**Example:**
```
Mèo cần cọc: 150.000 đ
User có voucher: 50.000 đ

Nếu dùng voucher:
- Cần thanh toán: 150.000 - 50.000 = 100.000 đ
- Voucher bị mark: "used"
```

---

## 🏗️ Components Tạo Mới

### 1. **MyVouchersTab** ✅
**File:** `src/components/MyVouchersTab.jsx`

```jsx
<MyVouchersTab userId={userId} />
```

**Features:**
- Hiển thị danh sách `user_vouchers` của user
- Badge trạng thái (active, used, expired, revoked)
- Copy mã voucher button
- Info: Cách sử dụng voucher

---

### 2. **VoucherSelectorForDeposit** (Sắp triển khai)
**File:** `src/components/VoucherSelectorForDeposit.jsx`

```jsx
<VoucherSelectorForDeposit
  userId={currentUser.id}
  depositAmount={finalDepositAmount}
  onVoucherSelect={(selected) => {
    // selected.voucherId
    // selected.voucherAmount
    // selected.voucherCode
  }}
/>
```

**Features:**
- Radio list để chọn voucher hoặc "Không dùng"
- Hiển thị giá trị giảm giá
- Preview: "Số tiền cần thanh toán sau giảm giá"
- Disable voucher nếu không đủ để cover deposit

---

## 📊 Database Schema

### Bảng: `user_vouchers`

```sql
CREATE TABLE user_vouchers (
  id UUID PRIMARY KEY,
  user_id UUID,              -- Người sở hữu
  voucher_id UUID,           -- Ref đến vouchers table
  status TEXT,               -- 'active', 'used', 'expired', 'revoked'
  acquired_at TIMESTAMP,     -- Lúc nhận voucher
  used_at TIMESTAMP,         -- Lúc dùng (NULL = chưa dùng)
  expires_at TIMESTAMP,      -- Hạn sử dụng (NULL = ko hết hạn)
  source_type TEXT,          -- 'conversion_deposit', 'conversion_bounty'
  source_id UUID,            -- Ref đến voucher_conversions.id
  notes TEXT
);

-- Index
CREATE INDEX user_vouchers_user_id_idx ON user_vouchers(user_id);
CREATE INDEX user_vouchers_status_idx ON user_vouchers(status);
```

### Bảng: `voucher_conversions`

```sql
CREATE TABLE voucher_conversions (
  id UUID PRIMARY KEY,
  user_id UUID,              -- User quy đổi
  amount INTEGER,            -- Số tiền quy đổi
  source_type TEXT,          -- 'balance_coc', 'balance_thuong'
  user_voucher_id UUID,      -- Ref đến user_vouchers
  converted_at TIMESTAMP,    -- Lúc quy đổi
  notes TEXT
);
```

---

## 🔄 Flow Khi Dùng Voucher (Phase 2)

### Hàm sẽ được tạo:

```javascript
/**
 * Sử dụng voucher khi đặt cọc
 * @param {string} userId
 * @param {string} userVoucherId - ID từ user_vouchers
 * @param {string} depositId - ID deposits vừa tạo
 */
export async function useVoucherForDeposit(
  userId,
  userVoucherId,
  depositId
)
```

### Luồng SQL:

```sql
-- 1. Check user_voucher exists và status = 'active'
SELECT * FROM user_vouchers 
WHERE id = userVoucherId AND user_id = userId AND status = 'active'

-- 2. Update deposits: thêm cột voucher
UPDATE deposits SET
  used_voucher_id = userVoucherId,
  applied_voucher_value = X
WHERE id = depositId

-- 3. Mark voucher as used
UPDATE user_vouchers SET
  status = 'used',
  used_at = NOW()
WHERE id = userVoucherId

-- 4. Log transaction
INSERT INTO wallet_transactions (
  user_id, type, source_type, note
) VALUES (
  userId, 'use_voucher_for_deposit', 'coc/thuong', ...
)
```

---

## ✅ Checklist Triển Khai

### Phase 1 (✅ Hoàn thành)
- [x] Bảng vouchers.sql
- [x] SQL functions cho conversion
- [x] VoucherConversionModal
- [x] MyVouchersTab
- [x] MyWalletPage integration
- [x] walletService functions

### Phase 2 (🔜 Sắp triển khai)
- [ ] VoucherSelectorForDeposit tích hợp vào PetDetailPage
- [ ] deposits table: thêm cột `used_voucher_id`, `applied_voucher_value`
- [ ] SQL function: `use_voucher_for_deposit()`
- [ ] PetDetailPage: tính toán deposit amount sau giảm giá voucher
- [ ] Handle voucher spend/usage logic
- [ ] Test flow: quy đổi → xem voucher → dùng khi đặt cọc

---

## 🎯 Examples

### Example 1: Quy Đổi Voucher

**User action:**
1. Vào "Ví của tôi"
2. Click "💳 Quy đổi Voucher" trên Balance_COC (150.000 đ)
3. Chọn tab "Tiền Cọc"
4. Chọn voucher 100.000 đ
5. Click "Xác Nhận Quy Đổi"

**Kết quả:**
```
Balance_COC: 150.000 → 50.000
User_vouchers: +1 record (id=xxx, voucher_id=yyy, status='active')
Wallet_transactions: +1 record (type='convert_to_voucher')
```

---

### Example 2: Xem Voucher

**User action:**
1. Vào "Ví của tôi"
2. Click tab "🎫 Voucher của tôi"

**Hiển thị:**
```
┌─────────────────────────────────┐
│ VOUCHER_100K                    │
│ Voucher 100k                    │
│ 💰 100.000 đ    [✅ Có thể dùng] │
│                                 │
│ • Quy đổi từ tiền cọc          │
│ • Nhận lúc: 14/12/2025         │
│                                 │
│ [📋 Copy Mã]                    │
└─────────────────────────────────┘
```

---

### Example 3: Dùng Voucher Khi Đặt Cọc (Phase 2)

**User action:**
1. Vào PetDetailPage
2. Nhập số tiền cọc: 150.000 đ
3. Scroll xuống → thấy: "🎫 Dùng voucher để giảm tiền cọc"
4. Chọn VOUCHER_100K
5. Preview hiển thị: "Cần thanh toán: 50.000 đ"
6. Click "Đặt cọc"

**Kết quả:**
```
Deposit created:
  amount: 150.000
  used_voucher_id: xxx
  applied_voucher_value: 100.000
  (cash_amount: 50.000 sau khi trừ ví)

User_vouchers:
  status: 'active' → 'used'
  used_at: NOW()

Wallet_transactions:
  type: 'use_voucher_for_deposit'
  amount: 100.000
```

---

## 🔒 Security Notes

1. **RLS Policies** - User chỉ thấy voucher của chính mình
2. **Status validation** - Chỉ voucher `active` mới có thể dùng
3. **1 lần sử dụng** - Khi mark as `used`, không thể dùng lại
4. **Amount validation** - Backend kiểm tra voucher value hợp lệ

---

## 📚 Related Docs

- [VOUCHER_CONVERSION_IMPLEMENTATION.md](VOUCHER_CONVERSION_IMPLEMENTATION.md) - Quy đổi voucher
- [WALLET_SPLIT_BALANCE_IMPLEMENTATION.md](WALLET_SPLIT_BALANCE_IMPLEMENTATION.md) - Tách cọc/thưởng
- [WALLET_SERVICE_USAGE_GUIDE.md](WALLET_SERVICE_USAGE_GUIDE.md) - API guide

---

**Last Updated**: December 14, 2025  
**Status**: ✅ Phase 1 Complete | 🔜 Phase 2 Pending
