# 📝 HƯỚNG DẪN CHẠY SQL MIGRATION LÊN SUPABASE

## 🎯 Mục Đích

Chạy file `database/ADOPTION_NO_SHOW_SYSTEM.sql` để tạo:
- 6 columns mới trong bảng `profiles`
- 6 columns mới trong bảng `adoption_requests`
- 1 bảng mới: `adoption_notifications`
- 5 SQL functions (RPC)
- 2 triggers
- 4 indexes
- RLS policies

---

## 📋 Chuẩn Bị

### Bước 1: Mở Supabase Dashboard

1. Truy cập: https://app.supabase.com
2. Chọn project: `meo-map` (hoặc tên project của bạn)
3. Chờ load xong

---

## 🚀 Chạy Migration

### Cách 1: Dùng SQL Editor (Khuyên dùng - Dễ nhất)

#### Step 1.1: Mở SQL Editor

1. Trong Supabase Dashboard
2. Click vào **SQL Editor** (bên trái)
3. Sẽ thấy màn hình trống với editor

#### Step 1.2: Mở File SQL

**Option A: Copy-paste file**

1. Mở file: `database/ADOPTION_NO_SHOW_SYSTEM.sql` (trong code editor của bạn)
2. Select All: `Ctrl + A`
3. Copy: `Ctrl + C`
4. Trong Supabase SQL Editor, click vào text area
5. Paste: `Ctrl + V`

**Option B: Drag & drop file**

1. Mở file: `database/ADOPTION_NO_SHOW_SYSTEM.sql`
2. Drag file vào Supabase SQL Editor
3. Sẽ tự load nội dung

#### Step 1.3: Chạy SQL

1. Click nút **▶️ Run** (góc trên phải, button xanh)
2. Hoặc dùng shortcut: `Ctrl + Enter`
3. Chờ khoảng 10-30 giây

#### Step 1.4: Kiểm Tra Kết Quả

**Nếu thành công:**
```
✅ Executed successfully
Query took 1.2s
```

**Nếu lỗi:**
```
❌ Error: ... (error message)
```

---

### Cách 2: Dùng Supabase CLI (Cho DevOps)

#### Step 2.1: Cài đặt Supabase CLI

```bash
npm install -g supabase
```

#### Step 2.2: Login vào Supabase

```bash
supabase login
```

Sẽ yêu cầu nhập API token. Lấy token từ:
- Supabase Dashboard → Settings → API
- Copy **Service Role Secret Key**

#### Step 2.3: Chạy SQL File

```bash
# Cách 1: Push migration (nếu đã setup project)
supabase migration new adoption_no_show_system
# Paste nội dung file vào file migration được tạo
supabase db push

# Cách 2: Chạy file trực tiếp (dễ hơn)
cat database/ADOPTION_NO_SHOW_SYSTEM.sql | supabase db execute
```

---

### Cách 3: Dùng pgAdmin (Cho SQL Experts)

#### Step 3.1: Mở Connection

1. Supabase Dashboard → Settings → Database
2. Copy thông tin connection:
   - Host
   - Port
   - Database
   - User
   - Password

#### Step 3.2: Connect vào pgAdmin

```bash
psql -h HOST -p PORT -U USER -d DATABASE

# Nhập password khi được hỏi
```

#### Step 3.3: Paste SQL

```sql
-- Paste entire content of ADOPTION_NO_SHOW_SYSTEM.sql

-- Or read from file:
\i database/ADOPTION_NO_SHOW_SYSTEM.sql
```

---

## ✅ Xác Minh Migration Thành Công

### Kiểm Tra 1: Columns Mới

Chạy query này trong SQL Editor:

```sql
-- Check profiles columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN (
    'reputation_score',
    'no_show_count',
    'late_count',
    'reputation_updated_at'
  )
ORDER BY ordinal_position;
```

**Kết quả mong đợi:**
```
column_name              | data_type
------------------------+------------------------
reputation_score        | integer
no_show_count          | integer
late_count             | integer
reputation_updated_at  | timestamp with time zone
```

### Kiểm Tra 2: Table Mới

```sql
-- Check adoption_notifications table
SELECT table_name
FROM information_schema.tables
WHERE table_name = 'adoption_notifications'
  AND table_schema = 'public';
```

**Kết quả mong đợi:**
```
table_name
------------------------
adoption_notifications
```

### Kiểm Tra 3: Functions

```sql
-- Check functions created
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'log_adoption_activity',
    'create_adoption_notification',
    'send_meeting_confirmation_reminder',
    'auto_cancel_unconfirmed_meetings',
    'record_no_show_after_delivery'
  )
ORDER BY routine_name;
```

**Kết quả mong đợi:**
```
routine_name
--------------------------------------
auto_cancel_unconfirmed_meetings
create_adoption_notification
log_adoption_activity
record_no_show_after_delivery
send_meeting_confirmation_reminder
```

### Kiểm Tra 4: Triggers

```sql
-- Check triggers
SELECT trigger_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_set_confirmation_deadline',
    'trigger_notify_on_both_confirmed'
  )
ORDER BY trigger_name;
```

**Kết quả mong đợi:**
```
trigger_name
--------------------------------------
trigger_notify_on_both_confirmed
trigger_set_confirmation_deadline
```

---

## 🐛 Xử Lý Lỗi

### Lỗi 1: "Column already exists"

```
ERROR: column "reputation_score" of relation "profiles" already exists
```

**Nguyên nhân:** Column đã tồn tại từ lần chạy trước

**Giải pháp:**
- Mở file: `database/ADOPTION_NO_SHOW_SYSTEM.sql`
- Tìm các dòng `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
- Xoá các columns đã tồn tại
- Chạy lại

**Hoặc:** Xoá toàn bộ columns cũ trước khi chạy

```sql
-- Xoá columns cũ (nếu tồn tại)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS reputation_score;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS no_show_count;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS late_count;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS reputation_updated_at;

ALTER TABLE public.adoption_requests DROP COLUMN IF EXISTS confirmation_deadline;
ALTER TABLE public.adoption_requests DROP COLUMN IF EXISTS receiver_reminder_sent_at;
ALTER TABLE public.adoption_requests DROP COLUMN IF EXISTS owner_reminder_sent_at;
ALTER TABLE public.adoption_requests DROP COLUMN IF EXISTS receiver_no_show;
ALTER TABLE public.adoption_requests DROP COLUMN IF EXISTS owner_no_show;
ALTER TABLE public.adoption_requests DROP COLUMN IF EXISTS timeout_auto_cancelled;

DROP TABLE IF EXISTS public.adoption_notifications;

-- Sau đó chạy ADOPTION_NO_SHOW_SYSTEM.sql
```

### Lỗi 2: "Function already exists"

```
ERROR: function "send_meeting_confirmation_reminder" already exists
```

**Giải pháp:**
- File SQL đã có `DROP ... IF EXISTS` nên bình thường không xảy ra
- Nếu có, chạy lại là được (sẽ overwrite)

### Lỗi 3: "Permission denied"

```
ERROR: permission denied for schema public
```

**Nguyên nhân:** User không có quyền

**Giải pháp:**
1. Dùng Service Role Key thay vì Anon Key
2. Hoặc login bằng tài khoản admin

### Lỗi 4: "Relation does not exist"

```
ERROR: relation "profiles" does not exist
```

**Nguyên nhân:** Project không có table `profiles`

**Giải pháp:**
- Kiểm tra project setup có đúng không
- Chạy migration cho table `profiles` trước

---

## 📱 Kiểm Tra trong Supabase Dashboard

### Step 1: Table Explorer

1. Supabase Dashboard
2. Click **Table Editor** (bên trái)
3. Tìm table: `adoption_notifications`
4. Sẽ thấy columns: `id`, `adoption_request_id`, `recipient_id`, `notification_type`, `title`, `message`, `metadata`, `read_at`, `created_at`

### Step 2: Check RLS

1. Click table: `adoption_notifications`
2. Click tab: **RLS**
3. Sẽ thấy 3 policies:
   - `adoption_notifications_select`
   - `adoption_notifications_insert`
   - `adoption_notifications_update`

### Step 3: Check Columns

1. Click table: `profiles`
2. Scroll xuống
3. Tìm 4 columns mới:
   - `reputation_score`
   - `no_show_count`
   - `late_count`
   - `reputation_updated_at`

---

## 🔍 Test Functions

### Test 1: Call RPC Function

```javascript
// Trong JavaScript (browser console)
const { data, error } = await supabase.rpc('send_meeting_confirmation_reminder', {
  p_adoption_request_id: '00000000-0000-0000-0000-000000000000'
});

console.log(data, error);
// Should return: { success: false, error: "Adoption request not found" }
// (Vì ID không tồn tại, nhưng function hoạt động!)
```

### Test 2: Insert Notification

```javascript
// Trong JavaScript
const { data, error } = await supabase
  .from('adoption_notifications')
  .insert({
    adoption_request_id: '00000000-0000-0000-0000-000000000000',
    recipient_id: 'CURRENT_USER_ID',
    notification_type: 'meeting_confirmation_reminder',
    title: 'Test Notification',
    message: 'This is a test'
  });

console.log(data, error);
// Should return notification data
```

---

## 🎯 Tóm Tắt Từng Bước

### Cách Nhanh Nhất (5 phút)

1. ✅ Mở: https://app.supabase.com
2. ✅ Chọn project
3. ✅ Click **SQL Editor**
4. ✅ Copy nội dung `database/ADOPTION_NO_SHOW_SYSTEM.sql`
5. ✅ Paste vào editor
6. ✅ Click **▶️ Run**
7. ✅ Chờ khoảng 30 giây
8. ✅ Xác minh: Chạy các query kiểm tra ở trên
9. ✅ XONG! 🎉

---

## ⚠️ Lưu Ý Quan Trọng

### DO's ✅

- ✅ Backup database trước khi chạy (optional nhưng an toàn)
- ✅ Chạy trong environment development trước
- ✅ Xác minh migration thành công
- ✅ Test functions sau khi chạy
- ✅ Check logs nếu có lỗi

### DON'Ts ❌

- ❌ Không chạy nửa file SQL
- ❌ Không thay đổi file SQL trước khi chạy
- ❌ Không chạy migration trên production mà không backup
- ❌ Không interrupt khi đang chạy
- ❌ Không copy từng phần - chạy toàn bộ file

---

## 🆘 Support

**Nếu có vấn đề:**

1. Kiểm tra lỗi message
2. Xem phần "Xử Lý Lỗi" ở trên
3. Nếu vẫn không được:
   - Kiểm tra columns cũ có tồn tại không
   - Xoá clean và chạy lại
   - Kiểm tra version Supabase
   - Xem logs: Supabase Dashboard → Logs

---

## 📚 Tài Liệu Liên Quan

Sau khi migration thành công, xem:
- `DEPLOYMENT_NO_SHOW_SYSTEM.md` - Deployment guide
- `src/API_USAGE_EXAMPLES.js` - Code examples
- `NO_SHOW_REPUTATION_SYSTEM.md` - Technical docs

---

## ✨ Sau Khi Migration Thành Công

1. ✅ Database schema ready
2. ✅ RPC functions available
3. ✅ Ready để integrate vào React app
4. ✅ Ready để deploy Cloud Functions

**Tiếp theo:** Xem `DEPLOYMENT_NO_SHOW_SYSTEM.md` để thêm components vào UI

---

**Dễ hay khó?** Chọn một cách trên và thực hiện. Nếu có vấn đề, kiểm tra phần "Xử Lý Lỗi"! 🚀
