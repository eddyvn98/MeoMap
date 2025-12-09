# NO-SHOW HANDLING & REPUTATION SYSTEM

## Tổng quan

Hệ thống này giải quyết 4 vấn đề chính:

1. ✅ **Nhắc nhở tự động** - Gửi reminder nếu một bên không xác nhận hẹn gặp
2. ✅ **Auto-timeout** - Tự động hủy nếu quá hạn mà vẫn không xác nhận
3. ✅ **Reputation scoring** - Trừ điểm danh tiếng cho no-show
4. ✅ **Notifications** - Gửi thông báo cho cả 2 bên

---

## 1. Database Schema

### Columns thêm vào `profiles`

```sql
reputation_score INTEGER DEFAULT 100    -- Điểm danh tiếng (0-100)
no_show_count INTEGER DEFAULT 0         -- Số lần không tới
late_count INTEGER DEFAULT 0            -- Số lần đến muộn
reputation_updated_at TIMESTAMPTZ       -- Lần cập nhật cuối
```

**Logic:**
- Mỗi user bắt đầu với `reputation_score = 100`
- Mỗi no-show: `-10 điểm`
- Mỗi lần đến muộn: `-5 điểm`
- Min score: 0

### Columns thêm vào `adoption_requests`

```sql
confirmation_deadline TIMESTAMPTZ           -- Deadline xác nhận (3 ngày)
receiver_reminder_sent_at TIMESTAMPTZ      -- Lần nhắc nhở người nhận
owner_reminder_sent_at TIMESTAMPTZ         -- Lần nhắc nhở chủ
receiver_no_show BOOLEAN                   -- Người nhận không tới
owner_no_show BOOLEAN                      -- Chủ không tới
timeout_auto_cancelled BOOLEAN             -- Hủy do timeout
```

### Bảng mới: `adoption_notifications`

```sql
CREATE TABLE adoption_notifications (
  id UUID PRIMARY KEY,
  adoption_request_id UUID,
  recipient_id UUID,
  notification_type TEXT,        -- Types: see below
  title TEXT,
  message TEXT,
  metadata JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
);
```

**Notification Types:**
- `'meeting_confirmation_reminder'` - Nhắc nhở xác nhận hẹn gặp
- `'meeting_confirmed_both'` - Cả 2 đã xác nhận
- `'no_show_detected'` - Ghi nhận không tới
- `'timeout_cancelled'` - Hủy do timeout

---

## 2. Flow Chi Tiết

### Flow A: Nhắc nhở & Timeout Confirmation

```
[Adoption Request Accepted]
          ↓
  Set confirmation_deadline = now() + 3 days
          ↓
     [Day 1-2]
   (No action)
          ↓
     [Day 3]
  Send reminder to BOTH if not confirmed
  - receiver_reminder_sent_at = now()
  - owner_reminder_sent_at = now()
          ↓
  [Day 3, 23:59]
  Auto-check: confirmation_deadline < now()?
  AND receiver_confirmed_meet = false?
  AND owner_confirmed_meet = false?
          ↓
        YES ↓
          
  UPDATE adoption_requests:
  - status = 'cancelled'
  - timeout_auto_cancelled = true
  - receiver_no_show = true OR false (nếu họ không confirm)
  - owner_no_show = true OR false (nếu họ không confirm)
  
  UPDATE profiles (nếu là no-show):
  - no_show_count += 1
  - reputation_score -= 10
  - reputation_updated_at = now()
  
  NOTIFY both parties:
  - "Yêu cầu tự động hủy"
  - "Bạn không xác nhận trong 3 ngày"
  - "Điểm danh tiếng -10"
  
  LOG ACTIVITY:
  - activity_type = 'meeting_confirmation_timeout'
          ↓
        [CANCELLED]
```

### Flow B: Ghi Nhận No-Show Sau Giao Mèo Thất Bại

```
[Giao mèo thất bại - một bên không tới]
          ↓
   [Owner hoặc Receiver báo cáo]
   recordNoShow(adoptionRequestId, 'receiver' or 'owner')
          ↓
  UPDATE profiles (no-show person):
  - no_show_count += 1
  - reputation_score -= 15  (Hình phạt nặng hơn)
  - reputation_updated_at = now()
  
  NOTIFY both parties:
  - Receiver/Owner: "Bạn đã bị ghi nhận không tới, -15 điểm"
  - Other party: "Người kia không tới gặp, chúng tôi đã ghi nhận"
  
  LOG ACTIVITY:
  - activity_type = 'no_show_recorded'
          ↓
  [NO-SHOW RECORDED]
```

---

## 3. API & Functions

### Backend Functions (SQL)

#### A. `send_meeting_confirmation_reminder(p_adoption_request_id)`

```javascript
// Gửi nhắc nhở cho người chưa xác nhận
const result = await supabase.rpc('send_meeting_confirmation_reminder', {
  p_adoption_request_id: adoptionRequestId
});

// Returns:
{
  "success": true,
  "message": "Reminders sent successfully"
}
```

#### B. `auto_cancel_unconfirmed_meetings()`

```javascript
// Tự động hủy những cái quá hạn
const result = await supabase.rpc('auto_cancel_unconfirmed_meetings');

// Returns:
{
  "cancelled_count": 5  // Số cái đã hủy
}
```

#### C. `record_no_show_after_delivery(p_adoption_request_id, p_no_show_party)`

```javascript
// Ghi nhận no-show
const result = await supabase.rpc('record_no_show_after_delivery', {
  p_adoption_request_id: adoptionRequestId,
  p_no_show_party: 'receiver'  // or 'owner'
});

// Returns:
{
  "success": true,
  "reputation_deducted": 15
}
```

### Frontend Services (JavaScript)

#### `src/services/adoptionNotifications.js`

```javascript
// 1. Gửi reminder
import { sendMeetingReminder } from '../services/adoptionNotifications';
const result = await sendMeetingReminder(adoptionRequestId);

// 2. Lấy notifications
import { getNotifications } from '../services/adoptionNotifications';
const notifications = await getNotifications({ unreadOnly: true });

// 3. Đánh dấu đã đọc
import { markNotificationAsRead } from '../services/adoptionNotifications';
await markNotificationAsRead(notificationId);

// 4. Ghi nhận no-show
import { recordNoShow } from '../services/adoptionNotifications';
const result = await recordNoShow(adoptionRequestId, 'receiver');

// 5. Lấy reputation info
import { getReputationInfo } from '../services/adoptionNotifications';
const rep = await getReputationInfo(userId);
```

### Frontend Hooks

```javascript
// 1. useAdoptionNotifications - Quản lý notifications
import { useAdoptionNotifications } from '../hooks/useAdoptionNotifications';

const {
  notifications,      // Danh sách notifications
  unreadCount,        // Số lượng chưa đọc
  loading,
  markAsRead          // Hàm để đánh dấu đã đọc
} = useAdoptionNotifications();

// 2. useReputationInfo - Lấy danh tiếng
import { useReputationInfo } from '../hooks/useAdoptionNotifications';

const { reputation, loading } = useReputationInfo(userId);
// Returns: {
//   reputation_score: 85,
//   no_show_count: 1,
//   late_count: 0,
//   reputation_updated_at: "..."
// }

// 3. useMeetingReminder - Gửi reminder
import { useMeetingReminder } from '../hooks/useAdoptionNotifications';
const { send, sending, error } = useMeetingReminder();
await send(adoptionRequestId);

// 4. useNoShowRecorder - Ghi no-show
import { useNoShowRecorder } from '../hooks/useAdoptionNotifications';
const { record, recording, error } = useNoShowRecorder();
await record(adoptionRequestId, 'receiver');
```

### Admin Services

```javascript
import { sendPendingReminders } from '../services/adoptionAdminHelper';
import { handleTimeoutCancellations } from '../services/adoptionAdminHelper';
import { getRecentNoShowCases } from '../services/adoptionAdminHelper';
import { getLowReputationUsers } from '../services/adoptionAdminHelper';

// 1. Gửi tất cả pending reminders
const result = await sendPendingReminders();
// { success: true, sentCount: 5, message: "..." }

// 2. Xử lý timeout cancellations
const result = await handleTimeoutCancellations();
// { success: true, cancelledCount: 3, message: "..." }

// 3. Lấy no-show cases gần đây
const { cases } = await getRecentNoShowCases(7);

// 4. Lấy user có danh tiếng thấp
const { users } = await getLowReputationUsers(50);

// 5. Chạy tất cả maintenance tasks
const result = await runMaintenanceTasks();
```

---

## 4. Components

### NotificationCenter

```jsx
import NotificationCenter from '../components/NotificationCenter';

// Usage in Header or BottomNav
<NotificationCenter />

// Hiển thị:
// - Bell icon với unread count
// - Dropdown list của notifications
// - Click để mark as read
// - Real-time updates
```

### ReputationCard

```jsx
import ReputationCard from '../components/ReputationCard';

// Usage in profile page or detail page
<ReputationCard userId={currentUserId} />

// Hiển thị:
// - Reputation score (0-100) với progress bar
// - Màu sắc: green (90+), amber (70-89), orange (50-69), red (<50)
// - No-show count
// - Late count
// - Last updated time
// - Warning nếu score < 50
```

---

## 5. Cron Jobs / Cloud Scheduler

**Cần setup Cloud Function để chạy daily:**

### Setup (Firebase Cloud Functions)

```javascript
// File: functions/index.js

const functions = require('firebase-functions');
const { runMaintenanceTasks } = require('./adoptionAdminHelper');

// Chạy hàng ngày lúc 00:00 UTC
exports.adoptionMaintenanceScheduled = functions
  .region('asia-southeast1')
  .pubsub.schedule('0 0 * * *')
  .timeZone('Asia/Ho_Chi_Minh')
  .onRun(async (context) => {
    try {
      const result = await runMaintenanceTasks();
      console.log('Maintenance tasks completed:', result);
      return null;
    } catch (error) {
      console.error('Maintenance tasks failed:', error);
      throw error;
    }
  });

// Alternative: HTTP trigger (call từ external service)
exports.adoptionMaintenance = functions
  .region('asia-southeast1')
  .https.onRequest(async (req, res) => {
    // Check authorization
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.MAINTENANCE_SECRET}`) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await runMaintenanceTasks();
    res.json(result);
  });
```

**Setup Cloud Scheduler:**

```bash
# Create scheduler job
gcloud scheduler jobs create pubsub adoptionMaintenanceJob \
  --location=asia-southeast1 \
  --schedule='0 0 * * *' \
  --time-zone='Asia/Ho_Chi_Minh' \
  --topic=<TOPIC_NAME>

# Test
gcloud scheduler jobs run adoptionMaintenanceJob --location=asia-southeast1
```

---

## 6. Integration Points

### Trong PetDetailPage.jsx

```jsx
// Khi owner xác nhận hẹn gặp
const handleOwnerConfirmMeet = async (request) => {
  // ... existing code ...
  
  // Log activity
  await logAdoptionActivity({
    adoptionRequestId: request.id,
    activityType: 'meeting_confirmed',
    actorType: 'owner',
    description: 'Chủ xác nhận hẹn gặp'
  });
  
  // Notify if both confirmed
  if (request.receiver_confirmed_meet) {
    // Trigger notification will happen via trigger
  }
};
```

### Trong DeliveryConfirmPage.jsx

```jsx
// Nếu giao mèo thất bại
const handleNoShowReport = async (noShowParty) => {
  const result = await recordNoShow(adoptionRequestId, noShowParty);
  
  if (result.success) {
    alert(`✅ Đã ghi nhận. Điểm danh tiếng ${noShowParty} trừ 15 điểm`);
    // Refresh page or navigate
  }
};
```

### Trong Header.jsx hoặc BottomNav.jsx

```jsx
import NotificationCenter from '../components/NotificationCenter';

// Add to header
<NotificationCenter />
```

### Trong ProfilePage hoặc PetDetailPage

```jsx
import ReputationCard from '../components/ReputationCard';

// Display user's reputation
<ReputationCard userId={currentUserId} />
```

---

## 7. Reputation Score Rules

| Action | Score Change | Notes |
|--------|-------------|-------|
| Mỗi no-show (timeout confirm) | -10 | Tự động sau 3 ngày |
| Mỗi no-show (delivery failed) | -15 | Báo cáo sau giao mèo thất bại |
| Mỗi lần đến muộn | -5 | (Trong tương lai) |
| Mỗi giao dịch thành công | - | Không cộng điểm (giữ current score) |

**Levels:**
- 90-100: ⭐⭐⭐⭐⭐ Xuất sắc (Excellent)
- 70-89: ⭐⭐⭐⭐ Tốt (Good)
- 50-69: ⭐⭐⭐ Bình thường (Fair)
- 0-49: ⭐⭐ Cần cải thiện (Needs improvement)

---

## 8. Testing Checklist

- [ ] Chạy SQL migration `ADOPTION_NO_SHOW_SYSTEM.sql` trong Supabase
- [ ] Test gửi reminder: `sendMeetingReminder(id)`
- [ ] Test timeout auto-cancel: `auto_cancel_unconfirmed_meetings()`
- [ ] Test no-show recording: `recordNoShow(id, 'receiver')`
- [ ] Test lấy notifications: `getNotifications()`
- [ ] Test lấy reputation: `getReputationInfo(userId)`
- [ ] Test real-time updates via hooks
- [ ] Test NotificationCenter component hiển thị đúng
- [ ] Test ReputationCard hiển thị đúng
- [ ] Test Cloud Function chạy hàng ngày
- [ ] Check activities được log đúng
- [ ] Check profiles reputation_score update đúng

---

## 9. Troubleshooting

### Vấn đề: Notifications không hiện lên

**Kiểm tra:**
1. RLS policies trong `adoption_notifications` có enable không?
2. User có quyền SELECT/INSERT không?
3. Trigger `notify_on_both_confirmed` có trigger không?

### Vấn đề: Auto-cancel không chạy

**Kiểm tra:**
1. Cloud Function deployed không?
2. Scheduler job active không? Check Cloud Scheduler
3. Deadline đã passed chưa? (confirmation_deadline < now())
4. Function return value có đúng format không?

### Vấn đề: Reputation không update

**Kiểm tra:**
1. Function `record_no_show_after_delivery` execute đúng không?
2. User profile tồn tại không?
3. Check `reputation_updated_at` timestamp

---

## 10. Future Enhancements

- [ ] Late arrival penalty integration
- [ ] Reputation boost khi hoàn thành giao dịch thành công
- [ ] Notification preferences (email, SMS, push)
- [ ] Appeal/dispute system cho no-show cases
- [ ] Whitelist users với reputation cao
- [ ] Reputation history timeline
- [ ] Automated admin alerts khi reputation < 30
