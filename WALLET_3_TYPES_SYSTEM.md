# Hệ Thống 3 Ví - MeoMap Wallet System

## Tổng Quan

Hệ thống ví MeoMap được thiết kế với **3 loại ví riêng biệt**, mỗi ví có mục đích và quy tắc sử dụng khác nhau:

---

## 1️⃣ Ví Chính (balance_main)

### 📌 Mục đích
- Ví cá nhân chính của người dùng
- Nạp tiền tự do, rút tiền tự do
- Dùng cho mua sắm và các giao dịch thông thường
- Dùng để cọc khi nhận chó mèo

### ✅ Được phép
- ✓ Nạp tiền (top-up)
- ✓ Rút tiền (withdrawal)
- ✓ Mua hàng (purchase)
- ✓ Cọc chó mèo (deposit)

### 🔄 Luồng tiền
```
Người dùng nạp tiền → balance_main
Mua hàng → Trừ từ balance_main
Cọc chó mèo → Trừ từ balance_main (tiền bị khóa)
```

---

## 2️⃣ Ví Cọc (balance_coc)

### 📌 Mục đích
- Chỉ nhận tiền hoàn cọc khi giao dịch thành công
- Tiền trong ví này KHÔNG thể rút được
- Chỉ có thể quy đổi thành voucher để mua hàng

### ✅ Được phép
- ✓ Nhận hoàn cọc (khi giao dịch thành công)
- ✓ Quy đổi voucher

### ❌ KHÔNG được phép
- ✗ Rút tiền
- ✗ Mua hàng trực tiếp
- ✗ Nạp tiền vào

### 🔄 Luồng tiền
```
Giao dịch nhận chó mèo thành công → Hoàn cọc vào balance_coc
balance_coc → Quy đổi voucher → Dùng voucher mua hàng
```

### 💡 Lý do thiết kế
- Khuyến khích người dùng giao dịch nhiều (tích lũy cọc)
- Giữ chân người dùng trong hệ thống (không rút được → phải dùng voucher)
- Tạo chu trình tiêu dùng nội bộ

---

## 3️⃣ Ví Thưởng (balance_thuong)

### 📌 Mục đích
- Nhận thưởng từ hoạt động rescue (cứu chó mèo)
- Nhận thưởng từ báo mất tìm thấy (lost pet found)
- Có thể rút tiền hoặc mua hàng

### ✅ Được phép
- ✓ Nhận thưởng (rescue/lost rewards)
- ✓ Rút tiền (withdrawal)
- ✓ Mua hàng (purchase)

### ❌ KHÔNG được phép
- ✗ Nạp tiền vào
- ✗ Cọc chó mèo

### 🔄 Luồng tiền
```
Cứu chó mèo thành công → balance_thuong
Tìm thấy chó mèo mất → balance_thuong
balance_thuong → Rút tiền hoặc Mua hàng
```

---

## 📊 So Sánh 3 Ví

| Tính năng | Ví Chính | Ví Cọc | Ví Thưởng |
|-----------|----------|--------|-----------|
| **Nạp tiền** | ✅ | ❌ | ❌ |
| **Rút tiền** | ✅ | ❌ | ✅ |
| **Mua hàng** | ✅ | ❌ | ✅ |
| **Cọc** | ✅ | ❌ | ❌ |
| **Nhận hoàn cọc** | ❌ | ✅ | ❌ |
| **Nhận thưởng** | ❌ | ❌ | ✅ |
| **Quy đổi voucher** | ❌ | ✅ | ❌ |

---

## 🎯 Ưu Tiên Sử Dụng

### Mua hàng (Purchase)
1. Trừ từ **balance_main** trước
2. Nếu không đủ → Trừ tiếp từ **balance_thuong**
3. **KHÔNG sử dụng balance_coc**

### Rút tiền (Withdrawal)
1. Trừ từ **balance_main** trước
2. Nếu không đủ → Trừ tiếp từ **balance_thuong**
3. **KHÔNG rút được balance_coc**

### Cọc chó mèo (Deposit)
1. Chỉ trừ từ **balance_main**
2. Tiền bị khóa cho đến khi giao dịch hoàn tất

---

## 🔧 Database Schema

```sql
-- Bảng profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  balance_main INTEGER DEFAULT 0 CHECK (balance_main >= 0),  -- Ví chính
  balance_coc INTEGER DEFAULT 0 CHECK (balance_coc >= 0),    -- Ví cọc
  balance_thuong INTEGER DEFAULT 0 CHECK (balance_thuong >= 0), -- Ví thưởng
  ...
);

COMMENT ON COLUMN profiles.balance_main IS 'Ví chính - nạp/rút tự do, mua hàng, cọc';
COMMENT ON COLUMN profiles.balance_coc IS 'Ví cọc - chỉ nhận hoàn cọc, quy đổi voucher, KHÔNG rút';
COMMENT ON COLUMN profiles.balance_thuong IS 'Ví thưởng - từ rescue/lost, có thể rút/mua hàng';
```

---

## 🛠️ Functions Đã Sửa

### 1. `confirm_topup_payment` - Nạp tiền
- **Trước:** Nạp vào `balance_coc`
- **Sau:** Nạp vào `balance_main` ✅

### 2. `purchase_product` - Mua hàng
- **Trước:** Ưu tiên trừ `balance_coc`
- **Sau:** Ưu tiên trừ `balance_main` → `balance_thuong` ✅

### 3. `decrease_balance_coc` - Cọc tiền
- **Trước:** Trừ từ `balance_coc`
- **Sau:** Trừ từ `balance_main` ✅

### 4. `increase_balance_coc` - Hoàn cọc
- **Giữ nguyên:** Hoàn vào `balance_coc` ✅

### 5. `create_withdrawal_request_p2p` - Rút tiền
- **Trước:** Cho phép rút cả 3 ví
- **Sau:** Chỉ rút `balance_main` + `balance_thuong` ✅

---

## 📱 Frontend Updates

### Components Updated
- ✅ `StorePage.jsx` - Hiển thị 3 ví
- ✅ `MultiStepCheckoutModal.jsx` - Tính toán từ main + thuong
- ✅ `TopUpModal.jsx` - Nạp vào ví chính
- ✅ `walletService.js` - Fetch 3 ví

### Các file cần review thêm
- `ProfilePage.jsx` - Hiển thị profile
- `PetDetailPage.jsx` - Cọc tiền khi nhận pet
- `MyWalletPageP2P.jsx` - Trang ví P2P
- `CheckoutModal.jsx` - Modal checkout cũ (nếu còn dùng)

---

## 🚀 Migration Steps

### 1. Chạy migration thêm cột
```bash
# File: database/ADD_BALANCE_MAIN_MIGRATION.sql
```

### 2. Chạy fix functions
```bash
# File: database/FIX_WALLET_FUNCTIONS.sql
```

### 3. Test từng chức năng
- [ ] Nạp tiền → Kiểm tra balance_main tăng
- [ ] Mua hàng → Kiểm tra trừ từ balance_main
- [ ] Cọc chó mèo → Kiểm tra trừ từ balance_main
- [ ] Hoàn cọc → Kiểm tra balance_coc tăng
- [ ] Rút tiền → Kiểm tra KHÔNG rút được balance_coc

---

## ⚠️ Lưu Ý Quan Trọng

1. **Migrate dữ liệu cũ:** Tiền hiện tại trong `balance_coc` sẽ được chuyển sang `balance_main` (vì đó là tiền nạp từ trước)

2. **Balance_coc mới:** Sau migration, `balance_coc` reset về 0, chỉ nhận tiền từ hoàn cọc

3. **Không breaking change:** User cũ sẽ thấy tiền của họ trong "Ví Chính", có thể dùng ngay

4. **UI/UX:** Cần giải thích rõ 3 ví cho user hiểu, tránh nhầm lẫn

---

## 📈 Benefits

✅ **Tách biệt rõ ràng** nguồn tiền và mục đích sử dụng

✅ **Kiểm soát cash flow** tốt hơn (biết tiền từ đâu, đi đâu)

✅ **Khuyến khích giao dịch** (cọc hoàn → voucher → mua hàng)

✅ **Giữ chân người dùng** (balance_coc không rút được)

✅ **Minh bạch** với người dùng về từng loại tiền

---

## 🎨 UI Display Example

```
┌─────────────────────────────────────┐
│  💳 Ví Chính: 500.000 đ            │
│  📝 Nạp/rút tự do                   │
├─────────────────────────────────────┤
│  🔒 Ví Cọc: 200.000 đ              │
│  📝 Chỉ quy đổi voucher             │
├─────────────────────────────────────┤
│  🎁 Ví Thưởng: 150.000 đ           │
│  📝 Từ rescue/lost                  │
└─────────────────────────────────────┘
```

---

Tạo bởi: GitHub Copilot
Ngày: 2025-12-14
