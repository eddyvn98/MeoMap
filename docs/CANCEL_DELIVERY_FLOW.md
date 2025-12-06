# Flow "Không Giao Mèo" - Cancel Delivery

## Tổng quan
Flow này cho phép cả người đăng (owner) và người nhận (receiver) hủy giao dịch sau khi tiền cọc đã được admin xác nhận nhưng chưa giao mèo. Khi hủy, tiền cọc sẽ được hoàn vào ví của người nhận.

## 1. Database Schema

### Các cột mới trong bảng `deposits`:
```sql
delivery_status TEXT              -- 'delivered' | 'cancelled_no_trade' | NULL
delivery_cancel_reason TEXT       -- Lý do hủy giao dịch
delivery_cancelled_by UUID        -- User ID của người bấm hủy
```

### Bảng `wallets`:
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  credit BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Function tăng credit:
```sql
CREATE FUNCTION increase_wallet_credit(p_user_id UUID, p_amount BIGINT)
-- Tự động insert hoặc update wallet.credit += p_amount
```

## 2. Điều kiện cho phép hủy

✅ **CHO PHÉP HỦY KHI:**
- `status = 'confirmed'` (tiền đã được admin xác nhận)
- `delivery_status IS NULL` hoặc `delivery_status = 'pending_meet'` 
- Chưa `delivered` và chưa `cancelled_no_trade`

❌ **KHÔNG CHO PHÉP HỦY KHI:**
- `status != 'confirmed'` (chưa xác nhận tiền)
- `delivery_status = 'delivered'` (đã giao mèo)
- `delivery_status = 'cancelled_no_trade'` (đã hủy trước đó)

## 3. Giao diện người dùng

### Trên máy người đăng (Owner):
- Sau khi `status = 'confirmed'`, hiển thị:
  - ✅ Mã QR giao mèo
  - 🚫 Nút: **"🚫 Hủy giao dịch, không trao mèo"**

### Trên máy người nhận (Receiver):
- Sau khi `status = 'confirmed'`, hiển thị:
  - ✅ Mã QR giao mèo (nếu có)
  - 🚫 Nút: **"🚫 Không nhận mèo nữa, hủy giao dịch"**

## 4. Logic xử lý hủy giao dịch

### File: `src/pages/DepositListPage.jsx`

```javascript
async function handleCancelDelivery(deposit) {
  // 1. Validate
  if (deposit.status !== "confirmed") {
    alert("Cọc chưa được xác nhận tiền, không cần hủy giao mèo.");
    return;
  }

  if (deposit.delivery_status === "delivered") {
    alert("Mèo đã được đánh dấu là giao xong, không thể hủy.");
    return;
  }

  if (deposit.delivery_status === "cancelled_no_trade") {
    alert("Giao dịch đã bị hủy trước đó.");
    return;
  }

  // 2. Confirm với user
  const confirmMsg = isOwner
    ? "Bạn có chắc muốn HỦY GIAO DỊCH (không trao mèo)? Tiền cọc sẽ được trả về ví người nhận."
    : "Bạn có chắc muốn HỦY GIAO DỊCH (không nhận mèo)? Tiền cọc sẽ được trả về ví của bạn.";

  if (!confirm(confirmMsg)) return;

  // 3. Update deposits table
  await supabase
    .from("deposits")
    .update({
      delivery_status: "cancelled_no_trade",
      delivery_cancel_reason: "Hai bên không giao mèo, tiền giữ lại trong ví người cọc.",
      delivery_cancelled_by: currentUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", depositId);

  // 4. Hoàn tiền vào ví người nhận (receiver)
  await supabase.rpc("increase_wallet_credit", {
    p_user_id: deposit.receiver_id,
    p_amount: deposit.amount,
  });

  // 5. Đặt lại pet status về available
  await supabase
    .from("pets")
    .update({ status: "available" })
    .eq("id", deposit.pet_id);

  alert(`Đã hủy giao dịch. Tiền cọc ${amount.toLocaleString()} đ đã được trả về ví người nhận.`);
}
```

## 5. Flow hoàn chỉnh

### Scenario 1: Người đăng hủy
1. Owner vào `/deposits`
2. Thấy cọc `status = 'confirmed'` với QR code
3. Bấm **"🚫 Hủy giao dịch, không trao mèo"**
4. Confirm → System:
   - Update `delivery_status = 'cancelled_no_trade'`
   - Hoàn tiền vào `wallets` của receiver
   - Pet status → `'available'`
5. Hiển thị: "⚠️ Giao dịch đã bị hủy (không trao mèo)"

### Scenario 2: Người nhận hủy
1. Receiver vào `/deposits`
2. Thấy cọc `status = 'confirmed'`
3. Bấm **"🚫 Không nhận mèo nữa, hủy giao dịch"**
4. Confirm → System: (giống như trên)
5. Tiền về ví của chính mình

### Scenario 3: QR bị quét sau khi hủy
1. User quét QR code với token
2. `/deliver/:token` kiểm tra:
   ```javascript
   if (deposit.delivery_status === "cancelled_no_trade") {
     setMsg("Giao dịch đã bị hủy (không trao mèo). Tiền đã hoàn về ví.");
     return;
   }
   ```
3. Hiển thị thông báo và không cho giao mèo

## 6. Migration SQL

Chạy file: `sql/cancel_delivery_migration.sql`

```sql
-- 1. Thêm cột mới
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS delivery_status TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS delivery_cancel_reason TEXT;
ALTER TABLE deposits ADD COLUMN IF NOT EXISTS delivery_cancelled_by UUID;

-- 2. Tạo bảng wallets
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit BIGINT DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Tạo function
CREATE OR REPLACE FUNCTION increase_wallet_credit(
  p_user_id UUID,
  p_amount BIGINT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO wallets (user_id, credit, updated_at)
  VALUES (p_user_id, p_amount, NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    credit = wallets.credit + p_amount,
    updated_at = NOW();
END;
$$;
```

## 7. Testing Checklist

- [ ] Chạy SQL migration trong Supabase
- [ ] Test owner bấm hủy → tiền vào ví receiver
- [ ] Test receiver bấm hủy → tiền vào ví của chính mình
- [ ] Test không thể hủy khi `status != 'confirmed'`
- [ ] Test không thể hủy khi đã `delivered`
- [ ] Test không thể hủy khi đã `cancelled_no_trade`
- [ ] Test quét QR sau khi hủy → hiển thị lỗi
- [ ] Test pet status trở về `'available'` sau khi hủy
- [ ] Kiểm tra wallet.credit tăng đúng số tiền

## 8. UI States

### Confirmed (chưa hủy):
```
✅ Trạng thái: Cọp đã ĐƯỢC XÁC NHẬN
📱 Mã QR giao mèo
🚫 [Nút hủy giao dịch]
```

### Cancelled (đã hủy):
```
⚠️ Giao dịch đã bị hủy (không trao mèo)
Lý do: Hai bên không giao mèo, tiền giữ lại trong ví người cọc.
Tiền cọc 50,000 đ đã được hoàn về ví người nhận.
```

## 9. Error Handling

| Error | Message |
|-------|---------|
| Chưa confirm | "Cọc chưa được xác nhận tiền, không cần hủy giao mèo." |
| Đã delivered | "Mèo đã được đánh dấu là giao xong, không thể hủy." |
| Đã hủy trước đó | "Giao dịch đã bị hủy trước đó." |
| Không phải owner/receiver | "Bạn không có quyền hủy giao dịch này." |
| Lỗi DB | "Không thể hủy giao dịch." + error message |

## 10. Files Changed

✅ `src/pages/DepositListPage.jsx` - Thêm button + logic hủy  
✅ `src/pages/DeliverPage.tsx` - Check delivery_status trước khi giao  
✅ `sql/cancel_delivery_migration.sql` - Migration script  
✅ `docs/CANCEL_DELIVERY_FLOW.md` - Documentation này

---

**Lưu ý quan trọng:**
- Tiền luôn hoàn về `receiver_id` (người đặt cọc), không phải người bấm hủy
- Pet status phải reset về `'available'` để người khác có thể đặt cọc lại
- `delivery_status` là trường riêng, khác với `status` (pending/confirmed/cancelled)
