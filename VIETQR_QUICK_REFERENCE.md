# 🚀 VietQR & Short Order Codes - Quick Start Guide

## 🎯 What Changed?

### **Order Codes: Short & Simple**
```
Before:  TOPUP-20251214-123456  (22 characters - too long!)
After:   TU123456               (8 characters - quick & easy!)
```

### **Payment with QR Code**
```
User clicks "Nạp Tiền"
    ↓
Select amount (50k, 100k, 200k, 500k, 1M)
    ↓
See 2 options:
    ├─ 📱 Quét mã QR (Scan QR code) - RECOMMENDED
    │  └─ Opens bank app, auto-fills everything
    │
    └─ 📋 Copy nội dung (Copy content) - Manual method
       └─ Copy STK + amount + nội dung (TU123456)
```

---

## 🔧 Setup Checklist

### **1. Environment Variables** (`.env`)
```env
VITE_BANK_ACCOUNT_NUMBER=1234567890
VITE_BANK_NAME=Techcombank
VITE_BANK_ACCOUNT_HOLDER=NGUYEN VAN A
VITE_SMS_CONFIRM_API_KEY=secret-key-12345
```

### **2. Run SQL Migrations**
```sql
-- 1. Create table
psql -U postgres -d meo_map -f database/topup_migration.sql

-- 2. Create functions
psql -U postgres -d meo_map -f database/topup_functions_v2.sql
```

### **3. Deploy Code**
- ✅ `src/services/vietqrService.js` (new)
- ✅ `src/services/walletService.js` (updated)
- ✅ `src/components/TopUpModal.jsx` (updated)
- ✅ `src/services/smsConfirmService.js` (updated)

### **4. Update Android App**
```kotlin
// Change regex pattern
val orderCodeRegex = """(TU\d{6})""".toRegex()  // Short code!
```

---

## 📱 How It Works (User Perspective)

### **Method 1: Scan QR Code** ⭐ (Recommended)
```
1. User clicks "Nạp Tiền"
2. Selects amount (e.g., 100,000 VND)
3. Sees QR code
4. Opens bank app → Scan QR
5. All details auto-fill:
   ├─ STK: 1234567890 ✅
   ├─ Amount: 100,000 VND ✅
   └─ Content: TU123456 ✅
6. Confirms → Money transfers
7. SMS arrives → Auto-confirmed in 1-5 min ✅
```

### **Method 2: Manual Copy**
```
1. User clicks "Nạp Tiền"
2. Selects amount (e.g., 100,000 VND)
3. Sees bank info:
   ├─ STK: 1234567890 (copy button)
   ├─ Amount: 100,000 VND
   └─ Content: TU123456 (copy button) ← SHORT!
4. Opens bank app
5. Manually fills:
   ├─ STK → Pastes from copy
   ├─ Amount → Pastes from copy
   └─ Content → Pastes TU123456 (short code!)
6. Confirms → Money transfers
7. SMS arrives → Auto-confirmed in 1-5 min ✅
```

---

## 🔐 Security: One-Time Use Per User

### **How It Works**
```
Database Level:
├─ order_code = TU123456 (unique)
├─ user_id = UUID (unique)
└─ Constraint: (order_code, user_id) = only 1 confirmation allowed

When Android SMS arrives:
├─ Parse: TU123456
├─ Lookup: Get user_id from order_code
├─ Verify: order_code + user_id match
├─ Confirm: If valid, update status to 'success'
└─ Result: Cannot confirm twice!

Example:
├─ User A creates order: TU123456
├─ User B cannot use this code (different user_id)
├─ Even User A cannot use twice (status = 'success' already)
└─ 100% secure! ✅
```

---

## 📊 Order Code Comparison

| Feature | Old (TOPUP-...) | New (TU...) |
|---------|-----------------|------------|
| Length | 22 characters | 8 characters |
| Format | TOPUP-20251214-123456 | TU123456 |
| Pattern | Date-based | Random |
| Typing | Easy to make mistakes | Quick & simple |
| QR Embed | Awkward | Perfect |
| Predictable | Yes (date) | No (random) |
| Combinations | Limited | 1 million |

---

## 🧪 Quick Test

### **Test 1: Create Topup**
```javascript
// Frontend
const result = await createTopupRequest(userId, 100000, 'manual');
console.log(result.orderCode);    // TU123456
console.log(result.qrCodeUrl);    // https://qr.sepay.vn/img?...
```

### **Test 2: Verify Order Code Format**
```bash
# Should match: TU + 6 digits
TU123456 ✅
TU000000 ✅
TU999999 ✅
TOPUP-123456 ❌ (old format)
```

### **Test 3: SMS Auto-Confirm**
```
1. Transfer money with content: TU123456
2. Wait for SMS
3. Android app should auto-confirm
4. Check wallet balance (should increase)
5. Verify topup_requests.status = 'success'
```

---

## 📁 File Structure

```
src/
├── services/
│   ├── vietqrService.js          [NEW] QR generation
│   ├── walletService.js          [UPDATED] QR integration
│   ├── smsConfirmService.js      [UPDATED] User verification
│   └── payosService.js           (disabled)
│
├── components/
│   └── TopUpModal.jsx            [UPDATED] QR display
│
└── pages/
    └── MyWalletPage.jsx          (no changes)

database/
├── topup_migration.sql           [UPDATED] qr_code_url field
├── topup_functions.sql           (deprecated)
└── topup_functions_v2.sql        [NEW] Updated functions

docs/
├── VIETQR_INTEGRATION_GUIDE.md    [NEW] Full guide
├── PHASE_6_VIETQR_IMPLEMENTATION.md [NEW] Summary
├── ANDROID_SMS_AUTO_CONFIRM_GUIDE.md [UPDATED] Regex patterns
└── TOPUP_SYSTEM_GUIDE.md         (outdated - reference only)
```

---

## 🎓 Key Points

✅ **Shorter Code** = Easier to type & remember (TU123456)  
✅ **QR Code** = Zero manual typing required  
✅ **Secure** = One-time use per user enforced  
✅ **Fast** = Auto-confirm in 1-5 minutes  
✅ **Free** = No PayOS fees  
✅ **Simple** = Use existing bank account  

---

## ⚠️ Important Notes

### **For Frontend Team**
- VietQR service is imported dynamically (won't break if API down)
- QR image displays only if available (manual method is fallback)
- All error messages are user-friendly

### **For Backend Team**
- `topup_functions_v2.sql` has all new functions
- `verify_topup_order()` enables Android pre-check
- `confirm_topup_payment()` enforces user_id validation
- `update_topup_qr_code()` stores VietQR URL

### **For Android Team**
- Update regex: `(TU\d{6})` instead of `(TOPUP-\d{8}-\d{6})`
- All bank SMS examples in guide use TU format now
- `verify_topup_order()` endpoint available for pre-check

---

## 🚀 Deployment Order

1. **Database First** → Run migrations & functions
2. **Backend** → Update walletService, smsConfirmService
3. **Frontend** → Add vietqrService, update TopUpModal
4. **Mobile** → Update SMS regex pattern
5. **Test** → Full end-to-end testing
6. **Go Live** → Enable for all users

---

## 📞 Support

**Stuck on QR codes?** → Check `VIETQR_INTEGRATION_GUIDE.md` troubleshooting section

**Need full details?** → See `PHASE_6_VIETQR_IMPLEMENTATION.md`

**Android integration?** → Reference `ANDROID_SMS_AUTO_CONFIRM_GUIDE.md`

---

**Summary**: Transform nạp tiền from complex (long codes, PayOS) to simple (short codes, QR scan). One click to scan, auto-confirm when SMS arrives. 🎉

---

*Created: 2025-01-14*  
*Version: 1.0*  
*Status: Ready for Production* ✅
