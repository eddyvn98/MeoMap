# HƯỚNG DẪN TRIỂN KHAI NO-SHOW & REPUTATION SYSTEM

## 🚀 Quick Start

### Step 1: Chạy Database Migration

1. Mở **Supabase Dashboard** → **SQL Editor**
2. Copy toàn bộ nội dung từ file: `database/ADOPTION_NO_SHOW_SYSTEM.sql`
3. Dán vào SQL Editor
4. Click **Run** (⚡)
5. Chờ execute xong (khoảng 10-30 giây)

✅ Nếu không có error → Migration thành công!

---

### Step 2: Update File Activities

File `database/adoption_activities.sql` đã được update với 4 activity types mới:
- `meeting_confirmation_reminder`
- `meeting_confirmation_timeout`
- `no_show_recorded`
- `notification_sent`

✅ Không cần chạy lại migration, chỉ là reference.

---

### Step 3: Thêm Components vào Header

**File: `src/components/Header.jsx` hoặc `src/components/BottomNav.jsx`**

```jsx
import NotificationCenter from './NotificationCenter';

// Thêm vào header/nav
<NotificationCenter />
```

**Position:** Bên cạnh avatar hoặc ở phía trên cùng

---

### Step 4: Thêm Reputation Card vào Profile

**File: `src/pages/ProfilePage.jsx` hoặc tương tự**

```jsx
import ReputationCard from '../components/ReputationCard';

export default function ProfilePage() {
  const { currentUser } = useAuth();

  return (
    <div>
      {/* ... other components ... */}
      <ReputationCard userId={currentUser.id} />
      {/* ... other components ... */}
    </div>
  );
}
```

---

### Step 5: Setup Cloud Function (Optional nhưng Recommended)

**Để auto-cancel timeout requests, cần setup Cloud Function**

#### 5a. Tạo Cloud Function

```bash
# Navigate to functions folder
cd functions

# Tạo file index.js nếu chưa có
# Thêm code dưới đây:
```

**File: `functions/index.js`** (hoặc append vào file hiện tại)

```javascript
const functions = require('firebase-functions');
const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Khởi tạo Firebase Admin (tự động với service account)
initializeApp({
  credential: applicationDefault(),
});

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // Service key, không phải anon key
);

/**
 * Daily maintenance job - Chạy hàng ngày lúc 00:00 Vietnam time
 */
exports.adoptionMaintenanceScheduled = functions
  .region('asia-southeast1')
  .pubsub.schedule('0 0 * * *')
  .timeZone('Asia/Ho_Chi_Minh')
  .onRun(async (context) => {
    try {
      console.log('🔄 Starting adoption maintenance...');

      // 1. Send reminders
      const remindersResult = await supabase.rpc(
        'send_meeting_confirmation_reminder'
      );
      console.log('✅ Reminders sent:', remindersResult);

      // 2. Auto-cancel timeouts
      const cancelResult = await supabase.rpc(
        'auto_cancel_unconfirmed_meetings'
      );
      console.log('✅ Auto-cancelled:', cancelResult);

      return {
        success: true,
        reminders: remindersResult,
        cancellations: cancelResult
      };
    } catch (error) {
      console.error('❌ Maintenance failed:', error);
      throw error;
    }
  });

/**
 * Manual trigger endpoint (optional)
 * curl -X POST https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/adoptionMaintenance \
 *   -H "Authorization: Bearer YOUR_SECRET"
 */
exports.adoptionMaintenance = functions
  .region('asia-southeast1')
  .https.onRequest(async (req, res) => {
    // Verify authorization
    const secret = req.headers['x-maintenance-secret'];
    if (secret !== process.env.MAINTENANCE_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
      // 1. Send reminders
      const remindersResult = await supabase.rpc(
        'send_meeting_confirmation_reminder'
      );

      // 2. Auto-cancel timeouts
      const cancelResult = await supabase.rpc(
        'auto_cancel_unconfirmed_meetings'
      );

      res.json({
        success: true,
        reminders: remindersResult,
        cancellations: cancelResult
      });
    } catch (error) {
      console.error('Maintenance error:', error);
      res.status(500).json({ error: error.message });
    }
  });
```

#### 5b. Update `.env.local` (hoặc Firebase config)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here  # Từ Supabase Settings → API
MAINTENANCE_SECRET=your_secret_here         # Set bất kỳ string nào
```

⚠️ **IMPORTANT:** Service key có full access, bảo mật kỹ!

#### 5c. Deploy Cloud Function

```bash
firebase deploy --only functions:adoptionMaintenanceScheduled

# Verify
firebase functions:log --limit 50
```

---

### Step 6: Test Toàn Bộ System

#### Test 6a: Database Schema

```sql
-- Check profiles columns
SELECT reputation_score, no_show_count, late_count 
FROM profiles 
LIMIT 1;

-- Check adoption_requests columns
SELECT 
  confirmation_deadline,
  receiver_reminder_sent_at,
  owner_reminder_sent_at,
  receiver_no_show,
  owner_no_show,
  timeout_auto_cancelled
FROM adoption_requests 
LIMIT 1;

-- Check notifications table
SELECT * FROM adoption_notifications LIMIT 1;
```

#### Test 6b: Frontend Functions

```javascript
// In browser console
import { sendMeetingReminder } from '/src/services/adoptionNotifications';

// Get a test adoption_request_id từ database
const adoptionRequestId = 'YOUR_TEST_ID';

// Test sending reminder
const result = await sendMeetingReminder(adoptionRequestId);
console.log(result); // Should return { success: true, ... }
```

#### Test 6c: Auto-cancel (Manual)

```javascript
// Call directly
const result = await supabase.rpc('auto_cancel_unconfirmed_meetings');
console.log(result); // Should return { cancelled_count: X }
```

---

## 🔗 Integration Checklist

- [ ] SQL migration chạy thành công
- [ ] NotificationCenter component thêm vào Header
- [ ] ReputationCard component thêm vào Profile
- [ ] Services (`adoptionNotifications.js`) hoạt động
- [ ] Hooks (`useAdoptionNotifications.js`) được import
- [ ] Cloud Function deployed (nếu cần auto-cancel)
- [ ] Environment variables cấu hình đúng
- [ ] Test UI hiển thị notifications
- [ ] Test real-time updates

---

## 📱 UI/UX Components

### 1. Notification Bell (Header)

```
🔔 [5]  ← Shows unread count
├─ 🔔 Nhắc nhở: Xác nhận hẹn gặp
│  "Vui lòng xác nhận đã hẹn gặp..."
│  5 phút trước
│
├─ ✅ Cả 2 đã xác nhận hẹn gặp!
│  "Mã QR giao mèo đã được tạo"
│  1 giờ trước
│
└─ ❌ Yêu cầu tự động hủy
   "Đã hủy do quá hạn không xác nhận, -10 điểm"
   3 giờ trước
```

### 2. Reputation Card (Profile)

```
📊 Danh tiếng
┌────────────────────────────┐
│ Điểm danh tiếng: 75/100    │
│ ████████░░ 75%             │
│ Tốt ⭐⭐⭐⭐               │
└────────────────────────────┘

❌ Không tới: 1 lần
⏱️ Đến muộn: 0 lần

Cập nhật: 09/12/2025
```

---

## 🐛 Debugging Tips

### Logs

```javascript
// Check Cloud Function logs
firebase functions:log --limit 100

// Check Supabase logs (in dashboard)
// SQL Editor → View queries
```

### Common Issues

**1. Notifications không gửi**
- ✅ Check RLS policies trong `adoption_notifications`
- ✅ Check user có quyền INSERT không?
- ✅ Check trigger `notify_on_both_confirmed` exist không?

**2. Auto-cancel không chạy**
- ✅ Check Cloud Function deployed?
- ✅ Check scheduler active? (Cloud Scheduler UI)
- ✅ Check confirmation_deadline < now()?

**3. Reputation không update**
- ✅ Check user profile exist?
- ✅ Check function execute success (no error)?
- ✅ Check activity được log không?

---

## 📊 Monitoring Dashboard (Optional)

Tạo admin page để giám sát:

```jsx
// pages/AdminAdoptionMonitorPage.jsx
import {
  getPendingAdoptionRequests,
  getRecentNoShowCases,
  getLowReputationUsers,
  getNoShowStatistics
} from '../services/adoptionAdminHelper';

// Display:
// - Pending confirmations (quá hạn, chưa confirm)
// - Recent no-shows
// - Low reputation users
// - Statistics
```

---

## 🎯 Success Criteria

✅ **System hoạt động đúng khi:**

1. User nhận reminder notification sau khi request accepted
2. User thấy notification center bell icon
3. Reputation card hiển thị score và stats
4. Auto-cancel chạy hàng ngày (check Cloud Function logs)
5. No-show được ghi nhận và reputation trừ điểm
6. Real-time notifications cập nhật không refresh page

---

## 📝 Notes

- Tất cả timestamps sử dụng UTC trong database
- Timezone conversion xảy ra ở client side (browser)
- Cloud Scheduler theo Asia/Ho_Chi_Minh time
- Mỗi notification là immutable (không thể edit, chỉ read/unread)
- Reputation score capped tại 0-100 (không âm, không quá 100)

---

## ❓ Q&A

**Q: Nếu user không nhận notification?**
A: Có thể bị block bởi RLS. Check policies trong adoption_notifications.

**Q: Nếu auto-cancel không chạy?**
A: Deploy Cloud Function hoặc call endpoint manually.

**Q: Nếu reputation bị trừ nhầm?**
A: Check adoption_activities log để see who deducted.

**Q: Làm sao recovery reputation?**
A: Hiện tại không có automatic recovery. Có thể thêm admin action (future feature).

---

## 🎓 Learning Resources

- Supabase RPC: https://supabase.com/docs/guides/database/functions
- PostgreSQL Functions: https://www.postgresql.org/docs/current/sql-createfunction.html
- Cloud Scheduler: https://cloud.google.com/scheduler/docs/quickstart
- Pub/Sub: https://cloud.google.com/pubsub/docs/
