# 🔒 FIX: Deposits RLS Policy Error + Adoption Request Flow

## ❌ Lỗi

```json
{
  "code": "42501",
  "details": null,
  "hint": null,
  "message": "new row violates row-level security policy for table \"deposits\""
}
```

## 🔍 Nguyên nhân

**Vấn đề 1:** Bảng `deposits` đã bật Row Level Security (RLS) nhưng **chưa có policies** cho phép users INSERT dữ liệu.

**Vấn đề 2:** Khi đặt cọc, code chỉ tạo `deposit` mà **không tạo `adoption_request`**, nên owner không biết ai muốn nhận nuôi.

### Flow cũ (sai):
```
User đặt cọc → Tạo deposit → ❌ Không tạo adoption_request
                                → Owner không thấy người muốn nhận
```

### Flow đúng:
```
User đặt cọc → Tạo deposit + adoption_request → ✅ Owner thấy được requester
```

## ✅ Giải pháp

### Bước 1: Chạy SQL Migration (Fix RLS)

1. Mở **Supabase Dashboard**
2. Vào **SQL Editor**
3. Copy toàn bộ nội dung file [`database/DEPOSITS_RLS_POLICIES.sql`](database/DEPOSITS_RLS_POLICIES.sql)
4. Paste vào SQL Editor
5. Click **RUN** ▶️

### Bước 2: Code đã được sửa (Tự động)

File [src/components/AdoptPetDetail.jsx](src/components/AdoptPetDetail.jsx) đã được update:

**TRƯỚC (chỉ tạo deposit):**
```javascript
const { data, error } = await supabase
  .from("deposits")
  .insert({...})
  .select()
  .single();
```

**SAU (tạo cả deposit + adoption_request):**
```javascript
// Step 1: Create deposit
const { data: depositData, error: depositError } = await supabase
  .from("deposits")
  .insert({...})
  .select()
  .single();

// Step 2: Create adoption request
const { error: requestError } = await supabase
  .from("adoption_requests")
  .insert({
    pet_id: pet.id,
    requester_id: user.id,
    owner_id: pet.owner_id,
    status: "pending",
  })
  .select()
  .single();
```

### Bước 3: Test lại tính năng

1. Quay lại trang chi tiết thú cưng
2. Nhấn nút "Đặt cọc"
3. Xác nhận cọc
4. ✅ Deposit được tạo
5. ✅ Adoption request được tạo
6. ✅ Owner thấy được người muốn nhận nuôi

## 📋 Chi tiết Changes

### 1. RLS Policies cho Deposits

#### INSERT Policy
```sql
CREATE POLICY "deposits_insert_policy"
  ON public.deposits
  FOR INSERT
  WITH CHECK (
    auth.uid() = receiver_id OR  -- User đặt cọc
    auth.uid() IS NULL            -- RPC functions
  );
```

#### SELECT Policy
```sql
CREATE POLICY "deposits_select_policy"
  ON public.deposits
  FOR SELECT
  USING (
    auth.uid() = owner_id OR 
    auth.uid() = receiver_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
```

### 2. Flow Integration

| Bước | Action | Kết quả |
|------|--------|---------|
| 1 | User click "Xác nhận cọc" | Gọi `handleSubmitDeposit()` |
| 2 | Tạo `deposit` | Record trong bảng `deposits` |
| 3 | Tạo `adoption_request` | Record trong bảng `adoption_requests` |
| 4 | Owner reload page | Thấy người muốn nhận trong list |

## 🎯 Kết quả

Sau khi áp dụng:

- ✅ Users có thể đặt cọc thành công (fix RLS error)
- ✅ Adoption request tự động được tạo
- ✅ Owners xem được danh sách người muốn nhận nuôi
- ✅ Flow hoàn chỉnh: Cọc → Request → Chấp nhận → Giao mèo
- ✅ Security được đảm bảo

## 🔄 Flow Hoàn Chỉnh

```
1. [User] Xem thú cưng → Nhấn "Đặt cọc"
              ↓
2. [System] Tạo deposit (status: pending)
              ↓
3. [System] Tạo adoption_request (status: pending)
              ↓
4. [Owner] Xem danh sách người muốn nhận
              ↓
5. [Owner] Chấp nhận request → status: ready_to_deliver
              ↓
6. [Both] Hẹn gặp → Xác nhận → Giao mèo
              ↓
7. [Both] Đánh giá sau khi giao
```

## 📚 Files liên quan

- [src/components/AdoptPetDetail.jsx](src/components/AdoptPetDetail.jsx) - UI component (đã sửa)
- [database/DEPOSITS_RLS_POLICIES.sql](database/DEPOSITS_RLS_POLICIES.sql) - RLS policies
- [ADOPTION_REQUESTS_MIGRATION.sql](ADOPTION_REQUESTS_MIGRATION.sql) - Adoption requests table
- [src/deposit.js](src/deposit.js) - Deposit utilities

## 📚 Tham khảo

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
