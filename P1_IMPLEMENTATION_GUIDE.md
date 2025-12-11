# 🔒 P1: Production-Ready Security - Race Condition & Audit

**Status**: 🟡 Ready for Implementation  
**Priority**: 🔴 CRITICAL - Blocks production deployment  
**Estimated work**: 2-3 hours  

---

## 📋 Tóm tắt các fix P1

Dự án đã 95% hoàn thiện, nhưng **thiếu 4 lỗ hổng bảo mật** ngăn lên production:

| # | Vấn đề | Rủi ro | Fix |
|---|--------|--------|-----|
| 1️⃣ | Race condition khi hoàn cọc | Hoàn cọc 2 lần | RPC atomic `finish_delivery_with_refund` |
| 2️⃣ | Double spending ví | Trừ ví 2 lần | RPC atomic `atomic_decrease_wallet` |
| 3️⃣ | Spam báo cáo | Tải server | Rate limit + 1 report/deposit |
| 4️⃣ | Không có audit log | Tranh chấp mất bằng chứng | `deposit_status_logs` + `admin_action_logs` |

---

## ✅ Đã tạo

### 1. SQL: P1_ATOMIC_TRANSACTIONS_AND_AUDIT.sql

**Nội dung:**
- ✅ RPC `finish_delivery_with_refund(deposit_id, user_id)` - Atomic refund với lock
- ✅ RPC `atomic_decrease_wallet(user_id, amount, reason)` - Ngăn double spending  
- ✅ Table `deposit_status_logs` - Log mọi thay đổi trạng thái cọc
- ✅ Table `admin_action_logs` - Log mọi action của admin
- ✅ Function `can_submit_report()` - Rate limit báo cáo
- ✅ RLS policies cho audit tables

**Cách sử dụng:**
```sql
-- Chạy file này lên Supabase SQL editor
-- SELECT finish_delivery_with_refund('deposit-uuid', 'user-uuid')
-- SELECT atomic_decrease_wallet('user-uuid', 50000, 'Cọc nhận nuôi')
-- SELECT can_submit_report('deposit-uuid', 'user-uuid')
```

---

## 🔧 Cần update trong Frontend

### 1. PetDetailPage.jsx - Dùng RPC atomic thay vì logic cũ

**Hiện tại** (KHÔNG an toàn):
```javascript
// ❌ Logic cũ - dễ race condition
await supabase
  .from("deposits")
  .update({ status: "delivered" })
  .eq("id", depositId);

// Sau đó refund
await supabase
  .from("profiles")
  .update({ wallet_credit: wallet_credit + amount })
  .where(id = receiverId)
```

**Sau khi fix** (Atomic, an toàn):
```javascript
// ✅ RPC atomic - 1 transaction duy nhất
const { data, error } = await supabase
  .rpc('finish_delivery_with_refund', {
    p_deposit_id: depositId,
    p_user_id: currentUser.id
  });

if (error) {
  alert('Lỗi: ' + error.message);
} else {
  alert('✅ Giao mèo thành công, cọc đã hoàn lại!');
}
```

**File cần sửa**: Tìm nơi xử lý "Xác nhận giao mèo" → thay logic bằng RPC

---

### 2. AdoptionDetail.jsx + MyWalletPage.jsx - Dùng RPC atomic khi trừ ví

**Hiện tại** (KHÔNG an toàn):
```javascript
// ❌ Dễ bị double spend
const result = await supabase.rpc('decrease_wallet_credit', {...});
// Refetch sau
const newBalance = await supabase
  .from('profiles')
  .select('wallet_credit')
```

**Sau khi fix** (Atomic):
```javascript
// ✅ Atomic decrease với lock
const { data, error } = await supabase
  .rpc('atomic_decrease_wallet', {
    p_user_id: currentUser.id,
    p_amount: 50000,
    p_reason: 'Cọc nhận nuôi mèo',
    p_related_id: adoptionRequestId,
    p_related_type: 'adoption_request'
  });

if (data.success) {
  // Balance đã chắc chắn được trừ
  const newBalance = data.balance_after;
}
```

**File cần sửa**: 
- `src/components/AdoptionDetail.jsx` - khi submit form đăng ký
- `src/pages/MyWalletPage.jsx` - khi xử lý giao dịch

---

### 3. Adoption Reports - Kiểm tra rate limit

**Hiện tại** (KHÔNG kiểm tra):
```javascript
// ❌ User có thể spam báo cáo
const { error } = await supabase
  .from('adoption_reports')
  .insert({ ... })
```

**Sau khi fix** (Kiểm tra trước):
```javascript
// ✅ Kiểm tra rate limit
const rateCheckResult = await supabase
  .rpc('can_submit_report', {
    p_deposit_id: depositId,
    p_user_id: currentUser.id
  });

if (!rateCheckResult.allowed) {
  alert('❌ ' + rateCheckResult.reason);
  return;
}

// OK, insert báo cáo
const { error } = await supabase
  .from('adoption_reports')
  .insert({ ... })
```

**File cần sửa**: Tìm nơi user submit báo cáo

---

## 📊 Benefit sau P1

| Trước | Sau |
|-------|-----|
| ❌ Race condition hoàn cọc → tiền mất | ✅ Atomic transaction → an toàn 100% |
| ❌ Double spending ví → balance sai | ✅ SELECT FOR UPDATE → chặn race condition |
| ❌ Spam 100 báo cáo → tải server | ✅ Rate limit → chỉ 1 báo cáo/deposit |
| ❌ Tranh chấp mất bằng chứng | ✅ Audit log đầy đủ → giải quyết tranh chấp |
| ⚠️ Chưa sẵn production | ✅ **Sẵn production** |

---

## 🚀 Implementation Steps

### Step 1: Chạy SQL migration
1. Mở Supabase dashboard
2. SQL Editor → Paste `P1_ATOMIC_TRANSACTIONS_AND_AUDIT.sql`
3. Run

### Step 2: Update PetDetailPage.jsx
- Tìm nơi xử lý "Xác nhận giao mèo"
- Replace bằng call `finish_delivery_with_refund` RPC
- Test: Click xác nhận, check DB logs

### Step 3: Update AdoptionDetail.jsx
- Tìm hàm `handleSubmitRequest`
- Replace wallet decrease logic bằng `atomic_decrease_wallet` RPC

### Step 4: Update báo cáo
- Kiểm tra rate limit trước insert
- Test spam: click báo cáo 2 lần → lần 2 bị block

### Step 5: Verify logs
- Tạo 1 giao dịch hoàn cọc
- Check `deposit_status_logs` → có log
- Check `admin_action_logs` → admin action được log

---

## ✋ Chú ý

1. **RPC có FOR UPDATE** → ngăn race condition, nhưng transaction sẽ lock row
   - Điều này là **tốt** (an toàn)
   - Performance OK vì adoption flow không có concurrency cao

2. **Rate limit**: 
   - 1 báo cáo/deposit/user (không báo cáo cùng deposit 2 lần)
   - 1 báo cáo/15min/user (ngăn spam)
   - Có thể adjust time nếu cần

3. **Audit logs**: Sẽ lưu trữ vĩnh viễn → sau này dùng cho analytics/dispute

---

## 📝 Checklist

- [ ] Chạy SQL P1_ATOMIC_TRANSACTIONS_AND_AUDIT.sql
- [ ] Update PetDetailPage.jsx dùng RPC atomic
- [ ] Update AdoptionDetail.jsx dùng RPC atomic  
- [ ] Update Report form check rate limit
- [ ] Test: Hoàn cọc → verify logs
- [ ] Test: Double spend ví → verify ngăn được
- [ ] Test: Spam báo cáo → verify rate limit
- [ ] Deploy & monitor logs
- [ ] ✅ Ready production!

---

**Timeline**: 2-3 hours cho dev + 30 min test = ~3.5 hours total

**Blocker nào**: Hỏi tôi, tôi sẽ code sample hoặc debug cùng.
