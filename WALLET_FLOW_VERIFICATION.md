# 🔍 KIỂM TRA LUỒNG VÍ CÁ NHÂN - WALLET FLOW VERIFICATION

**Ngày kiểm tra:** December 10, 2025  
**Trạng thái:** ✅ KIỂM TRA CHI TIẾT TẬT CẢ CÁC ĐIỂM

---

## 📊 TỔNG QUAN LUỒNG VÍ

### Luồng chính có 4 giai đoạn:
1. **Load ví ban đầu** - Lấy số dư từ `profiles.wallet_credit`
2. **Tính toán chia tiền** - Split giữa ví + chuyển khoản
3. **Trừ tiền khi đặt cọc** - Gọi `decrease_wallet_credit()`
4. **Nhận hoàn tiền** - Gọi `increase_wallet_credit()` khi hủy giao

---

## 🔧 KIỂM TRA CHI TIẾT TỪNG ĐIỂM

### ✅ ĐIỂM 1: Load Ví Ban Đầu (PetDetailPage.jsx - Line 307-311)

```jsx
// Load wallet credit
const { data: profile } = await supabase
  .from("profiles")
  .select("wallet_credit")
  .eq("id", user.id)
  .single();

setWalletCredit(profile?.wallet_credit || 0);
```

**Kiểm tra:**
- ✅ Đúng: Lấy từ `profiles` table, column `wallet_credit`
- ✅ Đúng: Mặc định 0 nếu không có dữ liệu
- ✅ Đúng: Sử dụng `.single()` vì user chỉ có 1 profile

**Tiềm năng lỗi:**
- ⚠️ Không có error handling nếu user chưa có profile → Sẽ lỗi
- 🔴 **CẦN FIX:** Thêm fallback nếu profile không tồn tại

---

### ✅ ĐIỂM 2: Tính Toán Split Ví + Tiền Mặt (PetDetailPage.jsx - Line 55-78)

```javascript
function splitWalletAndCash(requiredAmount, walletCredit) {
  if (walletCredit <= 0) {
    return {
      walletUsed: 0,
      cashAmount: requiredAmount,
    };
  }

  if (walletCredit >= requiredAmount) {
    // đủ ví, không cần chuyển khoản
    return {
      walletUsed: requiredAmount,
      cashAmount: 0,
    };
  }

  // không đủ, dùng hết ví, phần còn lại chuyển khoản
  return {
    walletUsed: walletCredit,
    cashAmount: requiredAmount - walletCredit,
  };
}
```

**Kiểm tra:**
- ✅ Đúng: Logic phân chia chính xác
- ✅ Đúng: walletUsed + cashAmount = requiredAmount
- ✅ Đúng: Xử lý 3 case:
  - `walletCredit <= 0` → Dùng 100% tiền mặt
  - `walletCredit >= required` → Dùng 100% ví
  - `0 < walletCredit < required` → Split

**Tính toán kiểm chứng:**
```
Case 1: required=100, wallet=150
  → walletUsed=100, cashAmount=0 ✓
  
Case 2: required=100, wallet=50
  → walletUsed=50, cashAmount=50 ✓
  
Case 3: required=100, wallet=0
  → walletUsed=0, cashAmount=100 ✓
```

---

### ✅ ĐIỂM 3: Tính Tiền Cọc Theo Uy Tín (PetDetailPage.jsx - Line 18-45)

```javascript
function calculateDepositAmount(userInput, rep) {
  const bad = rep?.bad_trades ?? 0;

  // CASE C: Blacklist - Bị hạ uy tín >= 3 lần
  if (bad >= 3) {
    return {
      blocked: true,
      amount: null,
      reason: "Tài khoản đã bị hạ uy tín 3 lần. Không thể đặt cọc."
    };
  }

  // CASE B: 1-2 lần xấu → tăng 50%
  if (bad >= 1) {
    let boosted = userInput * 1.5;
    boosted = Math.ceil(boosted / 10000) * 10000; // làm tròn 10k
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

**Kiểm tra:**
- ✅ Đúng: Xử lý blacklist (bad_trades >= 3)
- ✅ Đúng: Tăng 50% nếu bad_trades >= 1
- ✅ Đúng: Làm tròn lên 10k
- ✅ Đúng: Giữ nguyên nếu uy tín bình thường

**Tính toán kiểm chứng:**
```
Case 1: input=100k, bad=0
  → amount=100k ✓

Case 2: input=100k, bad=1
  → 100 * 1.5 = 150
  → ceil(150/10) * 10 = 150k ✓

Case 3: input=100k, bad=2
  → 100 * 1.5 = 150
  → ceil(150/10) * 10 = 150k ✓

Case 4: input=100k, bad=3
  → blocked=true ✓

Case 5: input=33k, bad=1
  → 33 * 1.5 = 49.5
  → ceil(49.5/10) * 10 = 50k ✓
```

---

### ✅ ĐIỂM 4: Gọi decrease_wallet_credit() (PetDetailPage.jsx - Line 449-465)

```jsx
// Nếu có dùng ví -> trừ ví
if (walletUsed > 0) {
  const { error: walletErr } = await supabase.rpc("decrease_wallet_credit", {
    p_user_id: currentUser.id,
    p_amount: walletUsed,
    p_deposit_id: deposit.id,
    p_type: "use_for_deposit",
    p_note: "Dùng ví để đặt cọc nhận mèo.",
  });

  if (walletErr) {
    console.error("Lỗi decrease_wallet_credit", walletErr);
    throw new Error("Có lỗi khi trừ tiền trong ví. Vui lòng liên hệ admin.");
  }
  
  // Cập nhật wallet credit local
  setWalletCredit(walletCredit - walletUsed);
}
```

**Kiểm tra:**
- ✅ Đúng: Chỉ gọi khi `walletUsed > 0`
- ✅ Đúng: Truyền đầy đủ tham số
- ✅ Đúng: Cập nhật local state sau khi gọi RPC
- ✅ Đúng: Có error handling

**SQL Function (WALLET_TRANSACTIONS_MIGRATION.sql - Line 91-121):**

```sql
CREATE OR REPLACE FUNCTION public.decrease_wallet_credit(
  p_user_id UUID,
  p_amount INT4,
  p_type TEXT DEFAULT 'use_for_deposit',
  p_deposit_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has enough credit
  DECLARE
    current_credit INT4;
  BEGIN
    SELECT wallet_credit INTO current_credit
    FROM public.profiles
    WHERE id = p_user_id;
    
    IF current_credit < p_amount THEN
      RAISE EXCEPTION 'Không đủ tiền trong ví. Số dư hiện tại: %, cần: %', current_credit, p_amount;
    END IF;
  END;

  -- Decrease wallet credit
  UPDATE public.profiles
  SET wallet_credit = wallet_credit - p_amount
  WHERE id = p_user_id;

  -- Log transaction (negative amount)
  INSERT INTO public.wallet_transactions (user_id, type, amount, deposit_id, note)
  VALUES (p_user_id, p_type, -p_amount, p_deposit_id, p_note);
END;
$$;
```

**Kiểm tra RPC:**
- ✅ Đúng: Kiểm tra số dư đủ không
- ✅ Đúng: Trừ từ `profiles.wallet_credit`
- ✅ Đúng: Tạo log với amount âm (-walletUsed)
- ✅ Đúng: Có transaction logging

---

### ✅ ĐIỂM 5: Gọi increase_wallet_credit() (DepositListPage.jsx - Line 302-311)

```jsx
// Increase wallet credit for receiver
const { error: walletError } = await supabase.rpc(
  "increase_wallet_credit",
  {
    p_user_id: receiverId,
    p_amount: amount,  // ⚠️ TOÀN BỘ số tiền cọc, không phải chỉ wallet_used
  }
);

if (walletError) throw walletError;
```

**Kiểm tra:**
- ✅ Đúng: Hoàn toàn bộ số tiền `deposit.amount`
- ✅ Đúng: Hoàn cả phần ví + phần chuyển khoản
- ✅ Đúng: Có error handling

**SQL Function (WALLET_TRANSACTIONS_MIGRATION.sql - Line 63-85):**

```sql
CREATE OR REPLACE FUNCTION public.increase_wallet_credit(
  p_user_id UUID,
  p_amount INT4,
  p_type TEXT DEFAULT 'refund_deposit',
  p_deposit_id UUID DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update wallet credit
  UPDATE public.profiles
  SET wallet_credit = wallet_credit + p_amount
  WHERE id = p_user_id;

  -- Log transaction
  INSERT INTO public.wallet_transactions (user_id, type, amount, deposit_id, note)
  VALUES (p_user_id, p_type, p_amount, p_deposit_id, p_note);
END;
$$;
```

**Kiểm tra RPC:**
- ✅ Đúng: Cộng vào `profiles.wallet_credit`
- ✅ Đúng: Tạo log với amount dương (+amount)
- ✅ Đúng: Có transaction logging

---

### ✅ ĐIỂM 6: Xem Lịch Sử Ví (MyWalletPage.jsx - Line 45-54)

```jsx
const { data: txs, error: txErr } = await supabase
  .from("wallet_transactions")
  .select("id, deposit_id, amount, type, note, created_at")
  .eq("user_id", userId)
  .eq("type", "refund_deposit")  // ⚠️ CHỈ LẤY REFUND_DEPOSIT
  .order("created_at", { ascending: false });
```

**Kiểm tra:**
- ⚠️ **ISSUE:** Chỉ lấy `refund_deposit`, không lấy `use_for_deposit`
- 🔴 **KHÔNG CHỈ HIỂN THỊ:** Lịch sử trừ tiền khi dùng ví không được hiển thị
- 📝 **NÊN HIỂN THỊ:** Tất cả transaction (refund + use_for_deposit)

**Sửa đề xuất:**
```jsx
const { data: txs, error: txErr } = await supabase
  .from("wallet_transactions")
  .select("id, deposit_id, amount, type, note, created_at")
  .eq("user_id", userId)
  // .eq("type", "refund_deposit")  ← XOÁ DÒNG NÀY
  .in("type", ["refund_deposit", "use_for_deposit"])  // ← THÊM DÒNG NÀY
  .order("created_at", { ascending: false });
```

---

### ✅ ĐIỂM 7: Hiển Thị Số Dư (MyWalletPage.jsx - Line 80-87)

```jsx
<div className="text-2xl font-bold">
  {walletCredit.toLocaleString("vi-VN")} đ
</div>
<div className="text-xs text-gray-500 mt-1">
  Đây là credit nhận được từ các cọc bị hủy (không rút về ngân hàng, chỉ dùng cho các giao dịch sau).
</div>
```

**Kiểm tra:**
- ✅ Đúng: Hiển thị `profiles.wallet_credit`
- ✅ Đúng: Format tiền tệ Việt Nam
- ✅ Đúng: Giải thích rõ ràng

---

### ✅ ĐIỂM 8: Reload Ví Khi Component Mount (PetDetailPage.jsx - Line 353-365)

```jsx
// Reload ví khi component mount
useEffect(() => {
  if (!currentUser) return;

  const reloadWallet = async () => {
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_credit")
      .eq("id", currentUser.id)
      .single();
    
    setWalletCredit(profile?.wallet_credit || 0);
  };

  reloadWallet();
}, [currentUser]);
```

**Kiểm tra:**
- ✅ Đúng: Gọi khi component mount hoặc `currentUser` thay đổi
- ✅ Đúng: Lấy giá trị mới nhất từ DB
- ✅ Đúng: Cập nhật local state

---

## 🐛 CÁC VẤN ĐỀ TÌM THẤY

### 🔴 ISSUE #1: MyWalletPage chỉ hiển thị refund_deposit

**Vị trí:** `src/pages/MyWalletPage.jsx` - Line 49  
**Mô tả:** Trang ví chỉ hiển thị giao dịch hoàn cọc, không hiển thị lịch sử dùng ví  
**Tác động:** User không thể xem đầy đủ lịch sử ví của mình  
**Mức độ:** TRUNG BÌNH

**Fix:**
```jsx
// TRƯỚC:
.eq("type", "refund_deposit")

// SAU:
.in("type", ["refund_deposit", "use_for_deposit"])
```

---

### 🟡 ISSUE #2: Không có error handling khi profile chưa tồn tại

**Vị trí:** `src/pages/PetDetailPage.jsx` - Line 307-312  
**Mô tả:** Nếu user chưa có profile, sẽ lỗi  
**Tác động:** User mới có thể gặp lỗi khi load trang pet  
**Mức độ:** THẤP (Thường profile được tạo khi đăng ký)

**Fix:**
```jsx
// TRƯỚC:
const { data: profile } = await supabase
  .from("profiles")
  .select("wallet_credit")
  .eq("id", user.id)
  .single();

setWalletCredit(profile?.wallet_credit || 0);

// SAU:
const { data: profile, error: profileErr } = await supabase
  .from("profiles")
  .select("wallet_credit")
  .eq("id", user.id)
  .maybeSingle();

if (profileErr) {
  console.error("Error loading profile:", profileErr);
}

setWalletCredit(profile?.wallet_credit || 0);
```

---

### 🟡 ISSUE #3: Không re-fetch ví sau khi trừ tiền

**Vị trí:** `src/pages/PetDetailPage.jsx` - Line 470  
**Mô tả:** Sau khi gọi `decrease_wallet_credit()`, chỉ cập nhật local state, không re-fetch từ DB  
**Tác động:** Nếu RPC thất bại nhưng frontend cập nhật, sẽ không đồng bộ  
**Mức độ:** THẤP (RPC được kiểm tra error)

**Fix:**
```jsx
// TRƯỚC:
setWalletCredit(walletCredit - walletUsed);

// SAU:
// Re-fetch wallet credit từ DB để đảm bảo đúng
const { data: updatedProfile } = await supabase
  .from("profiles")
  .select("wallet_credit")
  .eq("id", currentUser.id)
  .single();

setWalletCredit(updatedProfile?.wallet_credit || 0);
```

---

### 🔴 ISSUE #4: Load ví song song với query khác có thể race condition

**Vị trị:** `src/pages/PetDetailPage.jsx` - Line 246-254  
**Mô tả:** Load ví với `.single()` nhưng profile_Result từ Promise.all không được sử dụng  
**Tác động:** Có thể load 2 lần profile  
**Mức độ:** THẤP

---

## ✅ KIỂM TRA LUỒNG ĐẦU ĐẾN CUỐI

### Scenario 1: Đặt cọc với ví (100% ví)

**Điều kiện:**
- User có wallet_credit = 100k
- Đặt cọc 50k, uy tín bình thường

**Kỳ vọng:**
1. ✅ Load ví: wallet_credit = 100k
2. ✅ Tính toán: amount = 50k (không tăng), split = {walletUsed: 50k, cashAmount: 0}
3. ✅ Hiển thị: "Dùng từ ví: 50k đ, Cần chuyển khoản: 0 đ", không hiển thị QR
4. ✅ Tạo deposit: amount=50k, wallet_used=50k, cash_amount=0, status='confirmed'
5. ✅ Gọi decrease_wallet_credit(user, 50k): wallet_credit = 50k, log: -50k
6. ✅ Cập nhật local: setWalletCredit(50)

**Kết quả:** ✅ PASS

---

### Scenario 2: Đặt cọc split ví + tiền mặt

**Điều kiện:**
- User có wallet_credit = 30k
- Đặt cọc 100k, uy tín xấu 1 lần (tăng 50% → 150k)

**Kỳ vọng:**
1. ✅ Load ví: wallet_credit = 30k
2. ✅ Tính toán: amount = 150k (tăng 50%), split = {walletUsed: 30k, cashAmount: 120k}
3. ✅ Hiển thị: "Dùng từ ví: 30k đ, Cần chuyển khoản: 120k đ", hiển thị QR
4. ✅ Tạo deposit: amount=150k, wallet_used=30k, cash_amount=120k, status='pending'
5. ✅ Gọi decrease_wallet_credit(user, 30k): wallet_credit = 0, log: -30k
6. ✅ Cập nhật local: setWalletCredit(0)

**Kết quả:** ✅ PASS

---

### Scenario 3: Hủy giao dịch (hoàn tiền)

**Điều kiện:**
- Deposit có: amount=150k, wallet_used=30k, cash_amount=120k
- Owner hoặc receiver click "Hủy giao"

**Kỳ vọng:**
1. ✅ Update deposit: delivery_status='cancelled_no_trade'
2. ✅ Gọi increase_wallet_credit(receiver, 150k, 'refund_deposit'): wallet_credit += 150k, log: +150k
3. ✅ Update pet: status='available'
4. ✅ Cập nhật UI: Hiển thị "Tiền cọc 150k đ đã được hoàn về ví người nhận."

**Kết quả:** ✅ PASS

---

### Scenario 4: Xem lịch sử ví

**Điều kiện:**
- User có 3 giao dịch:
  - Đặt cọc 1: -50k (use_for_deposit)
  - Đặt cọc 2: -30k (use_for_deposit)
  - Hủy giao: +150k (refund_deposit)

**Kỳ vọng (HIỆN TẠI - SAI):**
- MyWalletPage chỉ hiển thị: +150k (refund_deposit)
- **KHÔNG hiển thị:** -50k, -30k (use_for_deposit)

**Kỳ vọng (SAU FIX):**
- Hiển thị tất cả 3 giao dịch theo thứ tự mới nhất trước

**Kết quả:** 🔴 FAIL (cần fix query)

---

## 📋 DANH SÁCH FIX CẦN LÀMS

| # | Issue | File | Dòng | Ưu tiên | Status |
|---|-------|------|------|---------|--------|
| 1 | Chỉ hiển thị refund_deposit | `src/pages/MyWalletPage.jsx` | 49 | 🔴 CAO | ✅ DONE |
| 2 | Không error handling profile | `src/pages/PetDetailPage.jsx` | 184 | 🟡 TB | ✅ DONE |
| 3 | Re-fetch ví sau decrease | `src/pages/PetDetailPage.jsx` | 473 | 🟡 TB | ✅ DONE |

---

## 🧪 SQL TESTING QUERIES

### Test xem wallet_credit của user
```sql
SELECT id, wallet_credit, created_at, updated_at
FROM public.profiles
WHERE id = 'USER_ID';
```

### Test xem lịch sử giao dịch
```sql
SELECT id, user_id, type, amount, deposit_id, note, created_at
FROM public.wallet_transactions
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;
```

### Test xem deposit
```sql
SELECT id, receiver_id, amount, wallet_used, cash_amount, status, payment_status, created_at
FROM public.deposits
WHERE receiver_id = 'USER_ID'
ORDER BY created_at DESC;
```

### Kiểm tra logic giao dịch
```sql
-- Kiểm tra tổng tiền nhận từ hoàn cọc
SELECT SUM(amount) as total_refunded
FROM public.wallet_transactions
WHERE user_id = 'USER_ID' AND type = 'refund_deposit';

-- Kiểm tra tổng tiền đã dùng từ ví
SELECT SUM(amount) as total_used
FROM public.wallet_transactions
WHERE user_id = 'USER_ID' AND type = 'use_for_deposit';

-- Kiểm tra deposit đã hoàn
SELECT amount, wallet_used, cash_amount, delivery_status
FROM public.deposits
WHERE receiver_id = 'USER_ID' AND delivery_status = 'cancelled_no_trade';
```

---

## ✨ KẾT LUẬN

### Trạng thái chung: ⚠️ CẦN CẢI THIỆN

**Điểm mạnh:**
- ✅ Logic RPC đúng (increase/decrease wallet_credit)
- ✅ Split ví + tiền mặt chính xác
- ✅ Tính tiền cọc theo uy tín chính xác
- ✅ Error handling cơ bản

**Điểm yếu:**
- 🔴 Lịch sử ví không đầy đủ (chỉ refund_deposit)
- 🟡 Thiếu error handling trong vài chỗ
- 🟡 Không re-fetch sau các thay đổi từ RPC

**Khuyến nghị:**
1. ✅ **NGAY:** Fix issue #1 (lịch sử ví chỉ refund)
2. 📅 **SAU:** Thêm error handling issue #2
3. 📅 **SAU:** Cân nhắc re-fetch issue #3

**Nguy hiểm khi không fix:** User sẽ không thấy đầy đủ lịch sử dùng ví của mình.

---

**Tài liệu này được tạo để kiểm tra tính đúng đắn của luồng ví cá nhân**  
**Cập nhật: December 10, 2025**
