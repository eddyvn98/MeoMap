# P2P Withdrawal System Documentation

## 📋 Overview

This is a **Binance-style P2P withdrawal system** designed for safe, transparent, and verifiable money transfers between users and admins.

**Key Philosophy:**
- ✅ **Transparency**: All parties see clear order codes and transfer details
- ✅ **Verification**: Bank transfer proof (Trace ID) + QR code validation
- ✅ **Safety**: Dispute resolution with complete audit trail
- ✅ **Simplicity**: Immutable account details + standard message format

---

## 🔄 Withdrawal Workflow

### User Flow: Create → Wait → Confirm → Done

```
1. USER CREATES WITHDRAWAL REQUEST
   ↓
   Order Code: WD-20250130-000245
   Amount: 300,000 VND
   Bank: VCB | STK: 0123456789 | Name: NGUYEN VAN A
   Status: PENDING
   
2. ADMIN APPROVES WITHDRAWAL
   ↓
   Status: WAITING_FOR_ADMIN_PAYMENT
   
3. ADMIN TRANSFERS MONEY
   ↓
   Uploads proof (Trace ID, content, time)
   Status: AWAITING_USER_CONFIRMATION
   
4. USER CONFIRMS RECEIPT
   ↓
   Status: COMPLETED ✅
   
   (or)
   
   USER OPENS DISPUTE if not received
   ↓
   Status: DISPUTED ⚠️
```

---

## 🖥️ User Interface (MyWalletPageP2P)

### Tab 1: Overview
Shows wallet balances:
- **Balance COC**: Non-withdrawable deposit escrow
- **Balance THƯỞNG**: Withdrawable rewards

### Tab 2: Create Withdrawal
Form with:
- Amount input + quick buttons (50k, 100k, 200k, 500k, "All")
- Bank name dropdown
- Account number (immutable after creation)
- Account holder name
- Validation: amount ≤ balance_thuong

**Output:**
```
✅ Đã tạo lệnh rút tiền thành công!

Mã lệnh: WD-20250130-000245

Hãy ghi lại mã này. Admin sẽ xử lý trong vòng 24-48h.
```

### Tab 3: Withdrawal History
Shows all user's withdrawals:

**For each order:**
1. **Header** - Amount + Order Code + Status badge
2. **Bank Info** - Bank, STK, Account Holder (immutable)
3. **Transfer Content** - Shows `PAY WD-20250130-000245` (what admin must use)
4. **Trace Info** - If admin confirmed (Trace ID + Transfer Time)
5. **Timestamps** - Created at, User confirmed at
6. **Actions**:
   - If `AWAITING_USER_CONFIRMATION`: 
     - ✅ "Đã nhận tiền" button
     - ⚠️ "Mở tranh chấp" button with text input

**Dispute form:**
- Textarea for reason
- "Gửi tranh chấp" button
- Cancel button

---

## 🛠️ Admin Interface (AdminWithdrawalsPageP2P)

### Features

1. **List View with Filter**
   - Filter by status: PENDING | WAITING_FOR_ADMIN_PAYMENT | AWAITING_USER_CONFIRMATION | COMPLETED | All
   - Shows: Order code, User name/email, Amount, Status badge

2. **For each withdrawal:**

   **Header Info:**
   - Amount + Order Code
   - Status badge with icon
   - User: Name (or email, or #user_id)

   **Bank Details (immutable):**
   - Bank name, STK, Account holder
   - User cannot change this

   **QR Code Section** (when status = WAITING_FOR_ADMIN_PAYMENT):
   ```
   📲 QR Chuyển khoản
   
   [QR IMAGE]
   
   Nội dung: PAY WD-20250130-000245
   Số tiền: 300,000 VND
   STK: 0123456789
   
   👉 Quét bằng app ngân hàng để tự động điền
   ```
   - Admin scans with banking app
   - App auto-fills: Account, Amount, Content
   - Admin just clicks "Confirm"

   **Timeline:**
   - 📅 Created: timestamp
   - ✓ Approved: timestamp
   - ✓ User confirmed: timestamp (if completed)

3. **Action Buttons:**
   - If `PENDING`: "Duyệt lệnh" (Approve) button
   - If `WAITING_FOR_ADMIN_PAYMENT`: "Xác nhận đã chuyển" (Confirm Payment) button

### Payment Confirmation Modal

When admin clicks "Xác nhận đã chuyển":

**Prefilled Info:**
- Order code, User name, STK, Amount (read-only display)

**Form Fields:**
- **Trace ID** * (required) - Bank transaction code
  - Example: 20250130-ABC123
- **Transfer Content** * (required) - Actual transfer text
  - Default: `PAY WD-20250130-000245`
  - Can edit if different
- **Transfer Time** * (required) - When money was sent
  - DateTime picker, defaults to now
- **Admin Notes** (optional) - Additional notes

**Warning:** ⚠️ Check info carefully before confirming

**Actions:**
- Cancel button
- "✅ Xác nhận đã chuyển" button (submits + closes)

---

## 💾 Database Schema

### withdrawal_requests
```sql
id                      UUID (Primary Key)
user_id                 UUID (References profiles)
order_code              VARCHAR(50) UNIQUE - WD-YYYYMMDD-XXXXX format
amount                  BIGINT - Amount in VND
status                  VARCHAR(50) - PENDING | WAITING_FOR_ADMIN_PAYMENT | 
                                     AWAITING_USER_CONFIRMATION | COMPLETED | 
                                     REJECTED | DISPUTED

-- Bank account (IMMUTABLE)
bank_name               VARCHAR(100)
bank_account            VARCHAR(50)
account_holder          VARCHAR(200)

-- Timestamps
requested_at            TIMESTAMP - When user created request
created_at              TIMESTAMP
updated_at              TIMESTAMP

-- User details
user_notes              TEXT - Optional notes from user

-- Admin details
admin_id                UUID (References profiles)
admin_approved_at       TIMESTAMP - When admin approved
admin_notes             TEXT

-- Payment proof
bank_trace_id           VARCHAR(100) - Trace ID from bank
transfer_content        TEXT - Actual transfer content used
transfer_time           TIMESTAMP - When transfer was made

-- Confirmation
user_confirmed_at       TIMESTAMP - When user confirmed receipt

-- Dispute
dispute_opened_at       TIMESTAMP
dispute_reason          TEXT
dispute_resolved_at     TIMESTAMP
dispute_resolution      TEXT
```

### withdrawal_proofs (optional, for file uploads)
```sql
id                      UUID
withdrawal_id           UUID (References withdrawal_requests)
file_url                TEXT - S3/Storage URL
file_type               VARCHAR(20) - 'image' or 'pdf'
uploaded_at             TIMESTAMP
uploaded_by             UUID (References profiles)
notes                   TEXT
```

### withdrawal_disputes (optional)
```sql
id                      UUID
withdrawal_id           UUID
opened_by               UUID
opened_at               TIMESTAMP
reason                  TEXT
user_proof_url          TEXT - URL to user's evidence
resolved_by             UUID
resolved_at             TIMESTAMP
resolution_type         VARCHAR(50) - 'approved', 'rejected', 'refunded'
resolution_notes        TEXT
```

---

## 🔌 API Functions (walletService.js)

### User Functions

#### `createWithdrawalRequestP2P(userId, amount, bankName, bankAccount, accountHolder, notes)`
- **Status**: PENDING → (balance_thuong deducted immediately)
- **Returns**: `{ success, orderCode, withdrawalId, error }`

#### `getWithdrawalRequestsP2P(userId)`
- **Returns**: `{ success, requests: [...], error }`

#### `userConfirmReceiptP2P(withdrawalId, userId)`
- **Requires**: Status = AWAITING_USER_CONFIRMATION
- **Effect**: Status → COMPLETED, user_confirmed_at = now
- **Returns**: `{ success, error }`

#### `userOpenDisputeP2P(withdrawalId, userId, reason, proofUrl)`
- **Effect**: Creates withdrawal_disputes record, Status → DISPUTED
- **Returns**: `{ success, disputeId, error }`

### Admin Functions

#### `adminGetPendingWithdrawalsP2P(status, limit)`
- **Returns**: `{ success, requests: [...with user/admin details], error }`

#### `adminApproveWithdrawalP2P(withdrawalId, adminId, adminNotes)`
- **Requires**: Status = PENDING
- **Effect**: Status → WAITING_FOR_ADMIN_PAYMENT
- **Returns**: `{ success, error }`

#### `adminConfirmPaymentP2P(withdrawalId, traceId, transferContent, transferTime, adminNotes)`
- **Requires**: Status = WAITING_FOR_ADMIN_PAYMENT
- **Effect**: Updates bank_trace_id, transfer_content, transfer_time
- **Effect**: Status → AWAITING_USER_CONFIRMATION
- **Returns**: `{ success, error }`

### Helper Functions

#### `getWithdrawalStatusDisplayP2P(status)`
Returns:
```javascript
{
  text: "Display Text",
  color: "Tailwind CSS classes",  // e.g., "bg-yellow-100 text-yellow-800"
  icon: "emoji"
}
```

Statuses:
- `PENDING` → ⏳ "Chờ duyệt" (yellow)
- `WAITING_FOR_ADMIN_PAYMENT` → 💳 "Admin đang chuyển" (blue)
- `AWAITING_USER_CONFIRMATION` → ⏰ "Chờ bạn xác nhận" (purple)
- `COMPLETED` → ✅ "Hoàn thành" (green)
- `REJECTED` → ❌ "Bị từ chối" (red)
- `DISPUTED` → ⚠️ "Tranh chấp" (red)

#### `generateVietQRData(bankAccount, bankCode, amount, orderCode)`
Returns VietQR format data:
```javascript
{
  accountNo: "0123456789",
  bankCode: "970416",  // VCB default
  amount: 300000,
  description: "PAY WD-20250130-000245"
}
```

---

## 🔐 RPC Functions (Supabase)

### `create_withdrawal_request_p2p(...)`
- Validates balance_thuong ≥ amount
- Generates order_code (WD-YYYYMMDD-XXXXX)
- Deducts balance_thuong (for safety - prevents oversending)
- Creates withdrawal_requests record
- RLS: Only user can create own requests

### `admin_approve_withdrawal_p2p(...)`
- Validates status = PENDING
- Sets status = WAITING_FOR_ADMIN_PAYMENT
- Records admin_id, admin_approved_at
- RLS: Only admins can call

### `admin_confirm_payment_p2p(...)`
- Updates bank_trace_id, transfer_content, transfer_time
- Sets status = AWAITING_USER_CONFIRMATION
- RLS: Only admins can call

### `user_confirm_receipt_p2p(...)`
- Validates ownership (user_id matches)
- Validates status = AWAITING_USER_CONFIRMATION
- Sets status = COMPLETED
- Records user_confirmed_at
- RLS: Only user can confirm own requests

### `user_open_dispute_p2p(...)`
- Creates withdrawal_disputes record
- Sets status = DISPUTED
- RLS: Only user can open own disputes

---

## ⚠️ Dispute Resolution

### When Dispute is Opened

**Admin sees (in disputes dashboard):**
1. **Order Info** - Code, amount, user, bank details
2. **Proof from Admin** - Trace ID, transfer content, timestamp, receipt image
3. **Proof from User** - Dispute description, evidence URL
4. **Evidence Summary**:
   - Order code (proves request exists)
   - STK (proves correct recipient)
   - Trace ID (proves transfer was made)
   - Transfer content (proves correct amount/order was transferred)
   - Transfer timestamp
   - User reason (why they claim didn't receive)

**Resolution Process:**
1. Admin reviews all evidence
2. If admin is correct: Approve dispute, mark as resolved
3. If user is correct: Refund balance_thuong + mark as resolved
4. Records resolution_type + resolution_notes

### Why This Prevents Fraud

✅ **Impossible for user to fake non-receipt:**
- Bank statement shows exact amount + timestamp
- User cannot fake bank trace ID
- If they really received, the money is in their bank account
- Admin can verify via bank's website

✅ **Impossible for admin to fake transfer:**
- User can check their bank account
- User knows their STK cannot be changed
- User can check actual bank statement
- User can see exact amount transferred

✅ **Order code as reference:**
- Unique, immutable identifier
- Prevents confusion between multiple orders
- Can search bank records by order code in transfer content

---

## 🎯 Best Practices

### For Users
1. ✅ Double-check bank details before creating order (IMMUTABLE)
2. ✅ Wait 24-48h for admin to process
3. ✅ Check bank account when status = AWAITING_USER_CONFIRMATION
4. ✅ Only click "Đã nhận tiền" AFTER money actually appears
5. ✅ If not received after 24h, click "Mở tranh chấp" with reason

### For Admins
1. ✅ Use QR code scanner for fastest, error-free transfer
2. ✅ Save bank receipt/proof image immediately
3. ✅ Record Trace ID exactly from bank
4. ✅ Use exact transfer content: `PAY WD-20250130-000245`
5. ✅ Complete all steps before marking as paid
6. ✅ Keep admin notes for audit trail

### For System
1. ✅ Deduct balance_thuong immediately on request creation (prevents oversending)
2. ✅ Make bank account immutable (prevents fraud redirects)
3. ✅ Require Trace ID (proof of actual transfer)
4. ✅ Store all timestamps (audit trail)
5. ✅ Enable full dispute resolution with evidence

---

## 📱 Routes

### User Routes
- `/my-wallet-p2p` - User withdrawal page

### Admin Routes
- `/admin/withdrawals-p2p` - Admin withdrawal management

---

## 🧪 Testing Checklist

### Happy Path
- [ ] User creates withdrawal request
- [ ] Admin approves request
- [ ] Admin confirms payment (with trace ID)
- [ ] User sees AWAITING_USER_CONFIRMATION status
- [ ] User clicks "Đã nhận tiền"
- [ ] Status becomes COMPLETED

### Error Cases
- [ ] User tries to withdraw more than balance_thuong
- [ ] Admin tries to approve twice
- [ ] User tries to confirm before admin payment
- [ ] User opens dispute with reason
- [ ] Admin reviews dispute with evidence

### QR Code
- [ ] QR displays correct data
- [ ] Admin can scan with banking app
- [ ] Banking app auto-fills: Amount, STK, Content

---

## 🔄 Database Migration

Run SQL file: `P2P_WITHDRAWAL_MIGRATION.sql`

Contains:
1. `withdrawal_requests` table
2. `withdrawal_proofs` table (optional)
3. `withdrawal_disputes` table
4. RPC functions (all 5)
5. RLS policies
6. Indexes for performance

---

## 📊 Status Flow Diagram

```
PENDING
   ↓
   (Admin approves)
   ↓
WAITING_FOR_ADMIN_PAYMENT
   ↓
   (Admin confirms payment with trace ID)
   ↓
AWAITING_USER_CONFIRMATION
   ├→ User confirms → COMPLETED ✅
   └→ User disputes → DISPUTED ⚠️
   
DISPUTED
   ├→ Admin approves dispute → COMPLETED
   └→ Admin rejects dispute → REJECTED

(Any status) → REJECTED (if admin rejects early)
```

---

## 🎓 Key Differences from Old System

### Old System
- Single withdrawal_requests table
- Status: pending/approved/completed/rejected
- No trace ID or payment proof
- No QR code
- Manual order code from user notes
- No distinct payment confirmation step

### New P2P System
- Same withdrawal_requests table but enhanced
- Status: PENDING → WAITING_FOR_ADMIN_PAYMENT → AWAITING_USER_CONFIRMATION → COMPLETED
- Requires trace ID + transfer content + transfer time
- QR code generation for quick, error-free transfer
- System-generated order code (WD-YYYYMMDD-XXXXX)
- Explicit payment confirmation step with admin proof
- Separate workflow for disputes with evidence tracking
- Immutable bank account (cannot redirect after order)

---

## 💡 Summary

This is a **production-ready P2P withdrawal system** that:
- ✅ Is as safe as Binance P2P (with order codes + trace IDs)
- ✅ Is transparent (both parties see everything)
- ✅ Prevents fraud (immutable accounts + bank proof)
- ✅ Resolves disputes (complete audit trail)
- ✅ Reduces errors (QR code auto-fill)
- ✅ Is user-friendly (3-step process + clear UI)
