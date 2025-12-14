# 📖 Wallet Service - API Usage Guide

## 📚 Tệp Service
Location: `src/services/walletService.js`

---

## 🔧 IMPORT & SỬ DỤNG

```javascript
import {
  decreaseBalanceCoc,        // Nộp cọc
  increaseBalanceCoc,        // Hoàn cọc
  increaseBalanceThuong,     // Nhận thưởng
  createWithdrawalRequest,   // Tạo yêu cầu rút tiền
  getWithdrawalRequests,     // Lấy danh sách rút
  getUserWallet,             // Lấy info ví
  getWalletTransactions,     // Lấy lịch sử
  formatVND,                 // Format tiền
  hasEnoughBalanceCoc,       // Kiểm tra đủ cọc
  hasEnoughBalanceThuong,    // Kiểm tra đủ thưởng
} from '../services/walletService';
```

---

## 💼 DANH SÁCH FUNCTIONS

### 1. BALANCE_COC (Cọc)

#### Giảm balance_coc khi nộp cọc
```javascript
const result = await decreaseBalanceCoc(
  userId,          // string: user ID
  amount,          // number: số tiền cọc
  depositId,       // string: ID giao dịch (optional)
  note             // string: ghi chú (optional)
);

// Result: { success: true, new_balance_coc: 450000, amount_deducted: 50000 }
// Or: { success: false, error: 'Insufficient balance_coc' }
```

**Khi dùng:** Ở PetDetailPage khi user submit nộp cọc

---

#### Tăng balance_coc khi hoàn cọc
```javascript
const result = await increaseBalanceCoc(
  userId,          // string: user ID
  amount,          // number: số tiền hoàn
  depositId,       // string: ID giao dịch (optional)
  note             // string: ghi chú (optional)
);

// Result: { success: true, new_balance_coc: 500000, amount_added: 50000 }
```

**Khi dùng:** Backend/admin khi hoàn cọc cho user

---

### 2. BALANCE_THUONG (Thưởng)

#### Tăng balance_thuong khi nhận thưởng
```javascript
const result = await increaseBalanceThuong(
  userId,          // string: user ID
  amount,          // number: số tiền thưởng
  source,          // string: 'bounty' | 'rescue' | 'event'
  relatedId,       // string: ID pet/case (optional)
  note             // string: ghi chú (optional)
);

// Result: { success: true, new_balance_thuong: 1000000, amount_added: 1000000 }
```

**Khi dùng:** 
- Lost: Khi chủ mèo confirm báo tin
- Rescue: Khi cộng đồng ghi nhận cứu hộ
- Event: Admin tặng từ sự kiện

---

### 3. RÚT TIỀN (Withdrawal)

#### Tạo yêu cầu rút tiền
```javascript
const result = await createWithdrawalRequest(
  userId,          // string: user ID
  amount,          // number: số tiền muốn rút (min 10.000)
  bankAccount,     // string: STK nhận tiền (required)
  bankName,        // string: Tên ngân hàng (optional)
  accountHolder    // string: Tên chủ tài khoản (optional)
);

// Result: {
//   success: true,
//   request_id: 'uuid',
//   amount: 1000000,
//   status: 'pending',
//   message: 'Yêu cầu rút tiền đã gửi, vui lòng chờ admin duyệt'
// }
// Or: { success: false, error: 'Insufficient balance_thuong' }
```

**Khi dùng:** MyWalletPage - Form rút tiền

---

#### Lấy danh sách withdrawal requests
```javascript
const result = await getWithdrawalRequests(userId);

// Result: {
//   success: true,
//   requests: [
//     {
//       id: 'uuid',
//       user_id: 'uuid',
//       amount: 1000000,
//       status: 'pending',
//       bank_account: '0123456789',
//       bank_name: 'Vietcombank',
//       account_holder: 'Nguyen Van A',
//       requested_at: '2025-12-13T10:00:00Z',
//       approved_at: null,
//       completed_at: null,
//       rejection_reason: null,
//       ...
//     }
//   ]
// }
```

**Khi dùng:** MyWalletPage - Tab "Lịch sử rút tiền"

---

#### Lấy chi tiết 1 withdrawal
```javascript
const result = await getWithdrawalRequestDetail(requestId);

// Result: { success: true, request: { ...withdrawal data } }
```

---

### 4. QUẢN LÝ VÍ

#### Lấy thông tin ví (balance_coc + balance_thuong)
```javascript
const result = await getUserWallet(userId);

// Result: {
//   success: true,
//   wallet: {
//     balance_coc: 450000,
//     balance_thuong: 2500000
//   }
// }
```

**Khi dùng:** Bất kỳ trang nào cần hiển thị thông tin ví

---

### 5. LỊCH SỬ GIAO DỊCH

#### Lấy lịch sử giao dịch
```javascript
const result = await getWalletTransactions(
  userId,          // string: user ID
  sourceType,      // string: 'coc' | 'thuong' | null (tất cả)
  limit            // number: giới hạn (default 50)
);

// Result: {
//   success: true,
//   transactions: [
//     {
//       id: 'uuid',
//       user_id: 'uuid',
//       type: 'refund_deposit',       // refund_deposit, use_for_deposit, bounty, rescue, withdrawal_approved
//       amount: 500000,
//       source_type: 'coc',           // 'coc' | 'thuong'
//       deposit_id: 'uuid',
//       note: 'Hoàn cọc nhận nuôi',
//       created_at: '2025-12-13T10:00:00Z',
//       ...
//     }
//   ]
// }
```

**Khi dùng:** MyWalletPage - Tab "Lịch sử giao dịch"

---

### 6. HELPER FUNCTIONS

#### Format tiền VND
```javascript
const formatted = formatVND(1000000);
// Result: "1.000.000 đ"
```

---

#### Kiểm tra đủ tiền cọc
```javascript
const hasEnough = hasEnoughBalanceCoc(balanceCoc, amountNeeded);
// true | false

// Dùng để disable button nộp cọc
<button disabled={!hasEnoughBalanceCoc(wallet.balance_coc, amount)}>
  Nộp cọc
</button>
```

---

#### Kiểm tra đủ tiền thưởng
```javascript
const canWithdraw = hasEnoughBalanceThuong(balanceThuong, amountToWithdraw);
// true | false
```

---

#### Lấy display text cho status withdrawal
```javascript
const statusDisplay = getWithdrawalStatusDisplay('pending');
// Result: { text: 'Chờ duyệt', color: 'yellow', icon: '⏳' }

// Dùng để hiển thị badge
<span style={{ color: statusDisplay.color }}>
  {statusDisplay.icon} {statusDisplay.text}
</span>
```

---

## 🎯 EXAMPLE USAGE

### Ví dụ 1: Nộp Cọc (PetDetailPage)

```javascript
async function handleSubmitDeposit() {
  // 1. Kiểm tra đủ tiền
  const wallet = await getUserWallet(currentUser.id);
  if (!hasEnoughBalanceCoc(wallet.balance_coc, depositAmount)) {
    alert('Không đủ tiền cọc!');
    return;
  }

  // 2. Trừ balance_coc
  const result = await decreaseBalanceCoc(
    currentUser.id,
    depositAmount,
    petId,
    'Nộp cọc nhận nuôi mèo'
  );

  if (result.success) {
    alert('Nộp cọc thành công!');
    // Refresh ví
    setWallet(await getUserWallet(currentUser.id));
  } else {
    alert('Lỗi: ' + result.error);
  }
}
```

---

### Ví dụ 2: Rút Tiền (MyWalletPage)

```javascript
async function handleWithdraw() {
  // 1. Kiểm tra input
  if (!amount || amount < 10000) {
    alert('Số tiền tối thiểu là 10.000 VND');
    return;
  }

  // 2. Tạo yêu cầu rút
  const result = await createWithdrawalRequest(
    currentUser.id,
    amount,
    bankAccount,
    bankName,
    accountHolder
  );

  if (result.success) {
    alert('Yêu cầu rút tiền đã gửi! ID: ' + result.request_id);
    // Refresh withdrawal list
    const requests = await getWithdrawalRequests(currentUser.id);
    setWithdrawals(requests.requests);
  } else {
    alert('Lỗi: ' + result.error);
  }
}
```

---

### Ví dụ 3: Hiển thị Ví

```javascript
// Component: Wallet Summary
function WalletSummary() {
  const [wallet, setWallet] = React.useState(null);

  React.useEffect(() => {
    async function loadWallet() {
      const result = await getUserWallet(currentUser.id);
      setWallet(result.wallet);
    }
    loadWallet();
  }, []);

  if (!wallet) return <div>Loading...</div>;

  return (
    <div>
      <h2>Ví của tôi</h2>
      <p>💳 Cọc: {formatVND(wallet.balance_coc)}</p>
      <p>💰 Thưởng: {formatVND(wallet.balance_thuong)}</p>
    </div>
  );
}
```

---

## ⚠️ ERROR HANDLING

Tất cả functions trả về `{ success: false, error: 'message' }` khi có lỗi.

**Common errors:**
- `'Insufficient balance_coc'` - Không đủ tiền cọc
- `'Insufficient balance_thuong'` - Không đủ tiền thưởng
- `'User not found'` - User không tồn tại
- `'Withdrawal request not found'` - Yêu cầu rút không tồn tại

---

## 🚀 NEXT STEPS

1. ✅ Tạo walletService.js (DONE)
2. ⏳ Update PetDetailPage.jsx - sử dụng decreaseBalanceCoc
3. ⏳ Update MyWalletPage.jsx - hiển thị 2 balance + rút tiền
4. ⏳ Tạo admin panel - duyệt withdrawal requests
5. ⏳ Testing & deployment

---

**Created:** December 13, 2025
**Status:** Service Functions Ready
**Next:** Frontend Integration
