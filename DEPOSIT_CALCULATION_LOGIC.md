# 📊 HỆ THỐNG TÍNH TIỀN CỌC DỰA TRÊN UY TÍN

## 🎯 Quy tắc mới: KHÔNG CÓ MỨC TỐI THIỂU

### Logic hoàn toàn mới:
- ❌ **KHÔNG còn** mức cọc tối thiểu bắt buộc
- ✅ Người dùng tự nhập số tiền họ muốn cọc
- ✅ Hệ thống tự động điều chỉnh dựa trên uy tín

---

## 📋 3 Trường hợp

### CASE A: Uy tín bình thường (chưa bị đánh giá xấu)

**Điều kiện:** `bad_trades = 0`

**Xử lý:**
- Giữ nguyên số tiền người dùng nhập
- Không có cảnh báo
- Không tăng tiền

**Ví dụ:**
```
User nhập: 50.000 đ
→ Tiền cọc thực tế: 50.000 đ
```

---

### CASE B: Bị hạ uy tín 1-2 lần

**Điều kiện:** `bad_trades = 1` hoặc `bad_trades = 2`

**Công thức:**
```javascript
realDeposit = userInput × 1.5
realDeposit = ceil(realDeposit / 10000) × 10000  // Làm tròn lên 10k
```

**Ví dụ:**

| User nhập | bad_trades | Tính toán | Kết quả |
|-----------|------------|-----------|---------|
| 50.000    | 1          | 50.000 × 1.5 = 75.000 | **80.000** |
| 120.000   | 2          | 120.000 × 1.5 = 180.000 | **180.000** |
| 21.000    | 1          | 21.000 × 1.5 = 31.500 | **40.000** |
| 35.000    | 1          | 35.000 × 1.5 = 52.500 | **60.000** |

**UI hiển thị:**
```
⚠️ Bạn đã bị đánh giá không tốt 1 lần, số tiền cọc sẽ tăng 50% và làm tròn.
Số tiền cọc thực tế: 80.000 đ
```

---

### CASE C: Blacklist (≥ 3 lần xấu)

**Điều kiện:** `bad_trades >= 3`

**Xử lý:**
- Chặn hoàn toàn không cho đặt cọc
- Nút "Đặt cọc" bị disabled
- Hiển thị thông báo đỏ

**UI hiển thị:**
```
🚫 Tài khoản đã bị hạ uy tín 3 lần. Không thể đặt cọc.
```

---

## 🔧 Implementation

### File: `src/pages/PetDetailPage.jsx`

### Hàm tính toán:

```javascript
function calculateDepositAmount(userInput, rep) {
  const bad = rep?.bad_trades ?? 0;

  // CASE C: Blacklist
  if (bad >= 3) {
    return {
      blocked: true,
      amount: null,
      reason: "Tài khoản đã bị hạ uy tín 3 lần. Không thể đặt cọc."
    };
  }

  // CASE B: 1–2 lần xấu → tăng 50%
  if (bad >= 1) {
    let boosted = userInput * 1.5;
    boosted = Math.ceil(boosted / 10000) * 10000;
    return {
      blocked: false,
      amount: boosted,
      reason: `Bạn đã bị đánh giá không tốt ${bad} lần, số tiền cọc sẽ tăng 50% và làm tròn.`
    };
  }

  // CASE A: bình thường → giữ nguyên
  return {
    blocked: false,
    amount: userInput,
    reason: null
  };
}
```

### Áp dụng trong handler:

```javascript
const handleDepositClick = async () => {
  const userInput = Number(depositAmount);
  
  // Tính toán dựa trên uy tín
  const calculation = calculateDepositAmount(userInput, currentUserReputation);

  // Kiểm tra blacklist
  if (calculation.blocked) {
    throw new Error(calculation.reason);
  }

  const finalAmount = calculation.amount;

  // Insert deposit với finalAmount
  await createDepositAndTicket({
    petId,
    ownerId,
    amount: finalAmount,
  });
};
```

### Real-time calculation:

```javascript
// Tự động tính khi user nhập số tiền
useEffect(() => {
  if (depositAmount && currentUserReputation !== null) {
    const userInput = Number(depositAmount);
    if (userInput > 0) {
      const result = calculateDepositAmount(userInput, currentUserReputation);
      setDepositCalculation(result);
    }
  }
}, [depositAmount, currentUserReputation]);
```

---

## 🎨 UI Components

### 1. Input không có min constraint:

```jsx
<input
  type="number"
  step={10000}
  min={10000}  // Chỉ có min tối thiểu 10k để tránh số âm/0
  value={depositAmount}
  onChange={(e) => setDepositAmount(Number(e.target.value))}
/>
```

### 2. Warning box (CASE B):

```jsx
{depositCalculation && depositCalculation.reason && (
  <div style={{ 
    background: "#fef2f2", 
    border: "1px solid #fca5a5",
    padding: 10,
    borderRadius: 6
  }}>
    ⚠️ {depositCalculation.reason}
    <div style={{ marginTop: 6, fontWeight: "bold" }}>
      Số tiền cọc thực tế: {depositCalculation.amount.toLocaleString()} đ
    </div>
  </div>
)}
```

### 3. Blocking message (CASE C):

```jsx
{depositCalculation && depositCalculation.blocked && (
  <div style={{ 
    background: "#fee2e2", 
    border: "1px solid #dc2626",
    padding: 10
  }}>
    🚫 {depositCalculation.reason}
  </div>
)}
```

### 4. Disabled button:

```jsx
<button 
  disabled={loadingDeposit || (depositCalculation && depositCalculation.blocked)}
  onClick={handleDepositClick}
>
  Đặt cọc & hiện mã QR
</button>
```

---

## 📊 Flow Chart

```
User nhập số tiền
       ↓
Load user_reputation
       ↓
Kiểm tra bad_trades
       ↓
    ┌──┴──┐
    │     │
bad=0   bad≥1
    │     │
    │     ├── bad=1,2 → × 1.5 → Làm tròn 10k
    │     │
    │     └── bad≥3 → BLOCK
    │
Giữ nguyên
```

---

## 🧪 Test Cases

### Test 1: User bình thường
```
Input: 60.000 đ
bad_trades: 0
Expected: 60.000 đ
Warning: Không có
```

### Test 2: User bị 1 lần xấu
```
Input: 50.000 đ
bad_trades: 1
Calculation: 50.000 × 1.5 = 75.000
Expected: 80.000 đ (làm tròn)
Warning: "Bạn đã bị đánh giá không tốt 1 lần..."
```

### Test 3: User bị 2 lần xấu
```
Input: 100.000 đ
bad_trades: 2
Calculation: 100.000 × 1.5 = 150.000
Expected: 150.000 đ
Warning: "Bạn đã bị đánh giá không tốt 2 lần..."
```

### Test 4: User blacklist
```
Input: Bất kỳ
bad_trades: 3
Expected: Blocked
Warning: "Tài khoản đã bị hạ uy tín 3 lần. Không thể đặt cọc."
Button: Disabled
```

### Test 5: Làm tròn
```
Input: 21.000 đ
bad_trades: 1
Calculation: 21.000 × 1.5 = 31.500
Expected: 40.000 đ (ceil to 10k)
```

---

## ⚡ State Management

### New States:

```javascript
const [currentUser, setCurrentUser] = useState(null);
const [currentUserReputation, setCurrentUserReputation] = useState(null);
const [depositCalculation, setDepositCalculation] = useState(null);
```

### depositCalculation structure:

```javascript
{
  blocked: boolean,      // true nếu >= 3 lần xấu
  amount: number | null, // Số tiền thực tế sau tính toán
  reason: string | null  // Lý do tăng tiền / chặn
}
```

---

## 🔄 Migration từ logic cũ

### Trước (có mức tối thiểu):
```javascript
const min = maxDeposit ? maxDeposit + 10000 : 50000;
const amount = Math.max(userInput, min);
```

### Sau (không mức tối thiểu):
```javascript
const calculation = calculateDepositAmount(userInput, reputation);
const amount = calculation.amount; // Tự động điều chỉnh
```

---

## 📝 Notes

- **Không có mức tối thiểu:** User tự do nhập bao nhiêu cũng được
- **Tăng tiền tự động:** Chỉ khi có lịch sử xấu
- **Transparent:** User thấy rõ lý do và số tiền thực tế
- **Làm tròn 10k:** Để số đẹp, dễ chuyển khoản
- **Blacklist clear:** >= 3 lần xấu = không cho cọc

---

## 🚀 Deployment Checklist

- [x] Thêm hàm `calculateDepositAmount()`
- [x] Thêm states: `currentUser`, `currentUserReputation`, `depositCalculation`
- [x] Load user reputation trong useEffect
- [x] Real-time calculation với useEffect
- [x] Update `handleDepositClick` với blacklist check
- [x] UI warning box (CASE B)
- [x] UI blocking message (CASE C)
- [x] Remove min constraint từ input
- [x] Disable button khi blocked
- [x] Test với các case: 0, 1, 2, 3+ bad_trades

---

**Last Updated:** December 7, 2025
**Version:** 2.0 - No Minimum Deposit
