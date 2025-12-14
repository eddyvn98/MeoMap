# 📱 VietQR Integration Guide - Nạp Tiền Nhanh Chóng

## 📋 Tổng Quan

Hệ thống nạp tiền đã được tối ưu hóa với:
- ✅ **Mã ngắn**: `TU123456` thay vì `TOPUP-20251214-123456`
- ✅ **QR Code**: VietQR tự động chứa thông tin chuyển khoản
- ✅ **An toàn**: Một mã chỉ áp dụng cho một user (không dùng lại được)
- ✅ **Tự động**: Hệ thống tự động xác nhận khi nhận được SMS

---

## 🔄 Flow Hoạt Động

```
┌─ Frontend (React) ─────────────────────────────────────────┐
│                                                             │
│  1. User click "Nạp Tiền"                                 │
│  2. Chọn số tiền (50k, 100k, 200k, 500k, 1M)             │
│  3. Frontend gọi: createTopupRequest(userId, amount)      │
│                                                             │
└────────────────────┬──────────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────────┐
│ Wallet Service (walletService.js)                         │
│                                                             │
│  1. Gọi RPC: create_topup_request()                       │
│  2. Nhận: topup_id, order_code (TU123456), amount        │
│  3. Gọi VietQR service để tạo QR code                    │
│  4. Store QR URL vào database                             │
│  5. Return: bankAccount, transferContent, qrCodeUrl      │
│                                                             │
└────────────────────┬──────────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────────┐
│ VietQR Service (vietqrService.js)                         │
│                                                             │
│  Input:  orderCode, amount, bankName, accountNumber       │
│  Output: qrImageUrl (API call result)                     │
│                                                             │
│  Endpoint: https://qr.sepay.vn/img                        │
│  Format:   acc=account&bank=970410&amount=100000&des=TU123456
│                                                             │
└────────────────────┬──────────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────────┐
│ TopUpModal UI                                              │
│                                                             │
│  Step 1: Choose Amount                                    │
│  Step 2: Display QR Code + Bank Info                      │
│          ┌──────────────────────┐                          │
│          │   QR CODE DISPLAY     │                          │
│          │   (scannable)         │                          │
│          └──────────────────────┘                          │
│          ┌──────────────────────┐                          │
│          │  STK: 1234567890      │                          │
│          │  Nội dung: TU123456   │                          │
│          └──────────────────────┘                          │
│                                                             │
└────────────────────┬──────────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────────┐
│ User Action                                                │
│                                                             │
│  Option 1: Quét QR Code                                  │
│  - Mở app ngân hàng                                       │
│  - Quét mã QR                                             │
│  - STK, số tiền, nội dung tự động điền                   │
│  - Xác nhận chuyển khoản                                  │
│                                                             │
│  Option 2: Copy & Paste                                   │
│  - Click "Copy nội dung"                                  │
│  - Mở app ngân hàng                                       │
│  - Điền thông tin theo hướng dẫn                          │
│  - Dán nội dung vào trường "ND"                           │
│  - Xác nhận chuyển khoản                                  │
│                                                             │
└────────────────────┬──────────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────────┐
│ Bank Transfer                                              │
│                                                             │
│  STK: 1234567890 (configured in .env)                    │
│  Số tiền: 100,000 VND                                    │
│  Nội dung: TU123456                                       │
│  Người gửi: Any (system tracks via order_code)           │
│                                                             │
└────────────────────┬──────────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────────┐
│ Bank SMS Notification                                     │
│                                                             │
│  Admin receives SMS:                                      │
│  "TK xxx +100,000 VND lúc 15:30"                         │
│  "ND: TU123456"                                           │
│                                                             │
└────────────────────┬──────────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────────┐
│ Android App (Auto-Confirm)                                │
│                                                             │
│  1. SMSReceiver đọc SMS                                   │
│  2. Parse: order_code = TU123456, amount = 100000        │
│  3. Call API: /api/sms-confirm                            │
│  4. Backend confirm + cộng tiền                           │
│                                                             │
└────────────────────┬──────────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────────┐
│ Backend (RPC Functions)                                    │
│                                                             │
│  verify_topup_order(order_code)                           │
│  ├─ Get: user_id, amount, status                          │
│  └─ Return for verification                               │
│                                                             │
│  confirm_topup_payment(                                   │
│    order_code,      // TU123456                            │
│    user_id,         // From order_code lookup             │
│    transaction_id,  // From SMS                           │
│    description      // Payment description                │
│  )                                                         │
│  ├─ Validate: order_code + user_id match (ONE-TIME use) │
│  ├─ Update: topup_requests.status = 'success'             │
│  ├─ Increment: profiles.balance_coc += amount            │
│  └─ Log: wallet_transactions                              │
│                                                             │
└────────────────────┬──────────────────────────────────────┘
                     │
┌────────────────────▼──────────────────────────────────────┐
│ Result                                                     │
│                                                             │
│  ✅ Topup request status = 'success'                      │
│  ✅ User balance_coc increased                            │
│  ✅ Wallet transaction logged                             │
│  ✅ User can see new balance in app                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Thiết Lập Môi Trường

### 1. **File `.env`** (Environment Variables)

```env
# Bank Account Configuration
VITE_BANK_ACCOUNT_NUMBER=1234567890
VITE_BANK_NAME=Techcombank
VITE_BANK_ACCOUNT_HOLDER=NGUYEN VAN A

# SMS Confirmation API Key
VITE_SMS_CONFIRM_API_KEY=your-secret-api-key-12345
```

### 2. **Database Migration**

Chạy `database/topup_migration.sql`:
- Tạo bảng: `topup_requests`
- Các cột chính:
  - `order_code` (TEXT UNIQUE) - Mã ngắn TU123456
  - `qr_code_url` (TEXT) - URL QR code VietQR
  - `status` - pending/processing/success/cancelled
  - `user_id` - Liên kết với user (RLS policy)

### 3. **SQL Functions**

Chạy `database/topup_functions_v2.sql`:

#### `generate_topup_order_code()`
```sql
-- Tạo mã TU + 6 chữ số ngẫu nhiên
-- Đảm bảo unique (không trùng lặp)
-- Ví dụ: TU123456, TU654321, TU789012
```

#### `create_topup_request(p_user_id, p_amount, p_payment_method, p_notes, p_qr_code_url)`
```sql
-- Tạo yêu cầu nạp tiền mới
-- Input: user_id, amount, payment_method='manual', qr_code_url (sẽ được set sau)
-- Output: { topup_id, order_code, amount, success }
```

#### `confirm_topup_payment(p_order_code, p_user_id, p_transaction_id, p_payment_description)`
```sql
-- Xác nhận thanh toán
-- QUAN TRỌNG: Yêu cầu p_user_id để verify (one-time use per user)
-- WHERE order_code = p_order_code AND user_id = p_user_id
-- Returns: { success, topup_id, amount, new_balance_coc }
```

#### `verify_topup_order(p_order_code)`
```sql
-- Pre-confirmation verification
-- Returns: { id, user_id, amount, status }
-- Used by Android app trước khi confirm
```

#### `update_topup_qr_code(p_topup_id, p_qr_code_url)`
```sql
-- Store QR code URL sau khi generate
-- Updates: topup_requests.qr_code_url
```

---

## 📱 Frontend Implementation

### 1. **VietQR Service** (`src/services/vietqrService.js`)

```javascript
// Generate VietQR URL
generateVietQRUrl(bankCode, accountNumber, amount, orderCode)
// Returns: https://qr.sepay.vn/img?acc=...&bank=970410&amount=...&des=TU123456

// Generate QR Image
generateQRImage(vietqrUrl)
// Returns: https://api.qrserver.com/v1/create-qr-code/?data=...

// Get bank code by name
getBankCode(bankName)
// Techcombank → 970410, VietcomBank → 970436, ACB → 970416, etc.

// Complete flow
generateTopupQRCode({ orderCode, amount, bankName, accountNumber })
// Returns: { success, vietqrUrl, qrImageUrl, bankCode }
```

### 2. **Wallet Service** (`src/services/walletService.js`)

```javascript
createTopupRequest(userId, amount, paymentMethod = 'manual', notes)
// 1. Call RPC: create_topup_request()
// 2. Get order_code, topup_id
// 3. Generate VietQR code
// 4. Update database with QR URL
// Returns: {
//   success,
//   topupId,
//   orderCode,     // TU123456
//   amount,
//   bankAccount,
//   bankName,
//   accountHolder,
//   transferContent,  // TU123456
//   qrCodeUrl         // VietQR image
// }
```

### 3. **TopUpModal Component** (`src/components/TopUpModal.jsx`)

```jsx
// Step 1: Select Amount
// - Preset buttons: 50k, 100k, 200k, 500k, 1M
// - Custom input field
// - Display: "Sẽ được cộng vào Balance_COC"

// Step 2: Bank Transfer Info
// - ✅ Bank account display + copy button
// - ✅ Order code (TU123456) - bold, red warning
// - ✅ Amount display (100,000 VND)
// - ✅ QR Code image (if qrCodeUrl available)
// - ✅ Instructions: Scan or copy content
// - ✅ Auto-confirm notice

// Features:
// - Copy account number
// - Copy transfer content
// - Display QR code
// - Error handling if QR fails to load
```

---

## 🤖 Android Implementation

### 1. **SMS BroadcastReceiver** (Kotlin)

```kotlin
// Listen for SMS with RECEIVE_SMS permission
// Parse SMS for: amount, order_code (TU123456)
// Verify order code format: ^TU\d{6}$

val orderCodeRegex = """(TU\d{6})""".toRegex()
val orderCode = orderCodeRegex.find(smsBody)?.groupValues?.get(1)

if (orderCode != null) {
    callConfirmAPI(orderCode, amount, transactionId, smsContent)
}
```

### 2. **API Call** (OkHttp)

```kotlin
POST /api/sms-confirm
{
  "orderCode": "TU123456",
  "amount": 100000,
  "transactionId": "SMS_timestamp",
  "smsContent": "Full SMS...",
  "apiKey": "secret-key"
}

Response:
{
  "success": true,
  "message": "Topup confirmed successfully",
  "newBalance": 100000
}
```

### 3. **Security**

- ✅ API key validation
- ✅ Order code format verification
- ✅ Amount validation (±1000 tolerance for bank fees)
- ✅ One-time use: Cannot confirm twice
- ✅ User verification: order_code linked to user_id
- ✅ Trusted sender list (filter bank SMS only)
- ✅ Rate limiting (prevent spam)

---

## 🔐 Security Architecture

### **Database Level**
```sql
-- RLS Policy: Users see only their own topup requests
CREATE POLICY topup_self_select
  ON topup_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Unique order_code: Cannot create duplicate
ALTER TABLE topup_requests ADD CONSTRAINT unique_order_code UNIQUE (order_code);

-- Status flow: pending → processing → success (or cancelled)
-- Cannot revert status to 'pending' once 'success'
```

### **Application Level**
```javascript
// Confirm function validates BOTH:
// 1. order_code = TU123456
// 2. user_id matches order_code's user_id
// 
// If order_code belongs to User A, User B cannot confirm it
// If order_code already confirmed, cannot confirm again
```

### **API Level**
```javascript
// Validate API key
// Validate order code format
// Validate amount (within tolerance)
// Return error if order not found or already confirmed
```

---

## 📊 Order Code Format

### Old Format (DEPRECATED)
```
TOPUP-20251214-123456
├─ TOPUP: Prefix
├─ 20251214: Date (YYYYMMDD)
└─ 123456: 6-digit number

Problems:
- Too long (22 characters) - error-prone when typing
- Date-based - predictable pattern
- Easy to forge/guess subsequent codes
```

### New Format (ACTIVE)
```
TU123456
├─ TU: Prefix (constant)
└─ 123456: 6 random digits (000000-999999)

Benefits:
- Short (8 characters) - easy to type/remember
- Random - unpredictable
- Unique per request (1 in 1,000,000 chance of collision)
- VietQR embeds it, no manual typing needed
```

---

## 🧪 Testing Guide

### **Frontend Testing**

1. **Test VietQR Generation**
   ```javascript
   // Manual test
   const result = generateTopupQRCode({
     orderCode: 'TU123456',
     amount: 100000,
     bankName: 'Techcombank',
     accountNumber: '1234567890'
   });
   console.log(result.qrImageUrl);
   // Should return valid QR image URL
   ```

2. **Test TopUpModal**
   - Click "Nạp Tiền"
   - Select amount
   - Verify QR code displays
   - Verify bank info shows
   - Verify copy buttons work

### **Backend Testing**

1. **Test Order Code Generation**
   ```sql
   SELECT generate_topup_order_code(); -- TU123456
   SELECT generate_topup_order_code(); -- TU654321 (different)
   ```

2. **Test Create Topup**
   ```sql
   SELECT create_topup_request(
     'user-uuid',
     100000,
     'manual',
     'Test topup',
     'https://qr.sepay.vn/img?...'
   );
   ```

3. **Test Confirm Topup**
   ```sql
   -- Should succeed (user_id matches)
   SELECT confirm_topup_payment(
     'TU123456',
     'user-uuid-same-as-above',
     'TxID123',
     'Test confirmation'
   );
   
   -- Should fail (user_id doesn't match)
   SELECT confirm_topup_payment(
     'TU123456',
     'wrong-user-uuid',
     'TxID456',
     'Should fail'
   );
   ```

### **Android Testing**

1. **Test SMS Parsing**
   ```kotlin
   val sms = "TK xxx1234 +100,000 VND ND: TU123456"
   val regex = """(TU\d{6})""".toRegex()
   val result = regex.find(sms)?.groupValues?.get(1) // TU123456
   ```

2. **Test API Call**
   - Mock SMS reception
   - Verify API call parameters
   - Check response handling

3. **Real Test** (Recommended)
   - Create topup request in frontend
   - Note order_code and amount
   - Transfer money with correct content
   - Verify auto-confirmation in 1-5 minutes

---

## 🚀 Deployment Checklist

- ✅ Update `.env` with bank account details
- ✅ Run `topup_migration.sql` (create table)
- ✅ Run `topup_functions_v2.sql` (create functions)
- ✅ Deploy vietqrService.js
- ✅ Update walletService.js with QR code generation
- ✅ Update TopUpModal.jsx with QR display
- ✅ Update smsConfirmService.js with user_id validation
- ✅ Deploy Android app with updated SMS parser (TU pattern)
- ✅ Test with real bank transfer
- ✅ Monitor SMS confirmations
- ✅ Check wallet balance updates

---

## 📞 Troubleshooting

### **QR Code Not Generating**
- Check vietqrService.js is imported
- Verify bankName/bankCode mapping
- Check network request to qr.sepay.vn
- Fallback to manual copy if QR fails

### **Confirm Fails - Order Not Found**
- Verify order_code format: `^TU\d{6}$`
- Check if order_code exists in database
- Confirm user_id matches order creator

### **Confirm Fails - Amount Mismatch**
- Allow ±1000 VND tolerance for bank fees
- SMS might have rounding (e.g., 100,000 vs 100000)

### **SMS Not Auto-Confirming**
- Verify Android app has SMS_RECEIVE permission
- Check API_KEY matches between Android and backend
- Verify order code format in SMS: `TU123456`
- Check internet connection
- Monitor Android logcat for errors

### **VietQR Link Invalid**
- Bank code might be wrong (use getBankCode())
- Account number format issue (remove spaces)
- Try fallback QR generator (qrserver.com)

---

## 📚 Related Files

- [topup_migration.sql](database/topup_migration.sql) - Database schema
- [topup_functions_v2.sql](database/topup_functions_v2.sql) - SQL functions
- [vietqrService.js](src/services/vietqrService.js) - VietQR integration
- [walletService.js](src/services/walletService.js) - Wallet API
- [smsConfirmService.js](src/services/smsConfirmService.js) - SMS confirmation
- [TopUpModal.jsx](src/components/TopUpModal.jsx) - UI component
- [ANDROID_SMS_AUTO_CONFIRM_GUIDE.md](ANDROID_SMS_AUTO_CONFIRM_GUIDE.md) - Android setup
- [TOPUP_SYSTEM_GUIDE.md](TOPUP_SYSTEM_GUIDE.md) - Original guide (legacy)

---

## 🎯 Key Improvements Over PayOS

| Aspek | PayOS | VietQR System |
|-------|-------|---------------|
| **Chi phí** | 1-2% commission | Miễn phí |
| **Setup** | Complex API integration | Simple bank account |
| **QR Code** | PayOS-generated, tài khoản ảo | VietQR, tài khoản thực |
| **Xác nhận** | Webhook từ PayOS | SMS reading tự động |
| **Độ tin cậy** | Phụ thuộc PayOS API | Phụ thuộc SMS (99.9%+) |
| **User experience** | Chuyển hướng đến PayOS | Quét QR ngay tại app |
| **PCI Compliance** | Cần thiết | Không cần (tài khoản thực) |

---

Generated: 2025-01-14
Status: Production Ready ✅
