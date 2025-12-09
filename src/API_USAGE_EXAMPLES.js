/**
 * QUICK REFERENCE - API CALLS & CODE SNIPPETS
 * Copy-paste ready code examples
 */

// ================================================================
// 1. SHOW NOTIFICATIONS
// ================================================================

// In any component:
import NotificationCenter from '../components/NotificationCenter';

export default function Header() {
  return (
    <header>
      {/* ... other stuff ... */}
      <NotificationCenter />
    </header>
  );
}


// ================================================================
// 2. SHOW REPUTATION
// ================================================================

import ReputationCard from '../components/ReputationCard';

export default function ProfilePage() {
  return (
    <div>
      <ReputationCard userId={currentUser.id} />
    </div>
  );
}


// ================================================================
// 3. SEND REMINDER WHEN ACCEPTING REQUEST
// ================================================================

import { sendMeetingReminder } from '../services/adoptionNotifications';

const handleAcceptAdoptionRequest = async (adoptionRequestId) => {
  try {
    // 1. Update adoption_requests status
    await supabase
      .from('adoption_requests')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', adoptionRequestId);

    // 2. Send reminder immediately
    const reminderResult = await sendMeetingReminder(adoptionRequestId);
    
    if (reminderResult.success) {
      alert('✅ Yêu cầu đã được chấp nhận, nhắc nhở đã được gửi');
    }
  } catch (error) {
    alert('❌ Lỗi: ' + error.message);
  }
};


// ================================================================
// 4. RECORD NO-SHOW AFTER FAILED DELIVERY
// ================================================================

import { recordNoShow } from '../services/adoptionNotifications';

// Khi giao mèo thất bại
const handleReceiverNoShow = async (adoptionRequestId) => {
  if (!window.confirm('Xác nhận người nhận không tới gặp? -15 điểm danh tiếng')) {
    return;
  }

  try {
    const result = await recordNoShow(adoptionRequestId, 'receiver');
    
    if (result.success) {
      alert('✅ Đã ghi nhận. Điểm danh tiếng người nhận trừ 15 điểm.');
      // Refresh or navigate
    }
  } catch (error) {
    alert('❌ Lỗi: ' + error.message);
  }
};

const handleOwnerNoShow = async (adoptionRequestId) => {
  if (!window.confirm('Xác nhận chủ không tới gặp? -15 điểm danh tiếng')) {
    return;
  }

  try {
    const result = await recordNoShow(adoptionRequestId, 'owner');
    
    if (result.success) {
      alert('✅ Đã ghi nhận. Điểm danh tiếng chủ trừ 15 điểm.');
      // Refresh or navigate
    }
  } catch (error) {
    alert('❌ Lỗi: ' + error.message);
  }
};


// ================================================================
// 5. USE NOTIFICATION HOOKS
// ================================================================

import { useAdoptionNotifications } from '../hooks/useAdoptionNotifications';

export default function MyComponent() {
  const { notifications, unreadCount, loading, markAsRead } = useAdoptionNotifications();

  const handleNotificationClick = (notificationId) => {
    markAsRead(notificationId);
  };

  if (loading) return <div>⏳ Đang tải...</div>;

  return (
    <div>
      <h2>Thông báo ({unreadCount} chưa đọc)</h2>
      {notifications.map(n => (
        <div key={n.id} onClick={() => handleNotificationClick(n.id)}>
          <h3>{n.title}</h3>
          <p>{n.message}</p>
          <small>{new Date(n.created_at).toLocaleString('vi-VN')}</small>
        </div>
      ))}
    </div>
  );
}


// ================================================================
// 6. USE REPUTATION HOOK
// ================================================================

import { useReputationInfo } from '../hooks/useAdoptionNotifications';

export default function UserCard({ userId }) {
  const { reputation, loading } = useReputationInfo(userId);

  if (loading) return <div>⏳ Đang tải...</div>;

  return (
    <div>
      <h3>Danh tiếng: {reputation.reputation_score}/100</h3>
      <p>❌ Không tới: {reputation.no_show_count}</p>
      <p>⏱️ Đến muộn: {reputation.late_count}</p>
    </div>
  );
}


// ================================================================
// 7. LOG ADOPTION ACTIVITY
// ================================================================

import { logAdoptionActivity } from '../services/adoptionNotifications';

const handleCompleteAdoption = async (adoptionRequestId, userId) => {
  try {
    await logAdoptionActivity({
      adoptionRequestId,
      activityType: 'request_completed',
      actorId: userId,
      actorType: 'owner',
      description: 'Hoàn tất nhận nuôi mèo',
      metadata: { petName: 'Miu' }
    });
    
    alert('✅ Đã ghi nhận hoàn tất');
  } catch (error) {
    alert('❌ Lỗi: ' + error.message);
  }
};


// ================================================================
// 8. ADMIN: GET PENDING REQUESTS
// ================================================================

import { getPendingAdoptionRequests } from '../services/adoptionAdminHelper';

const AdminMonitorPage = () => {
  const [pending, setPending] = React.useState(null);

  React.useEffect(() => {
    const load = async () => {
      const result = await getPendingAdoptionRequests();
      setPending(result);
    };
    load();
  }, []);

  if (!pending) return <div>⏳ Loading...</div>;

  return (
    <div>
      <h2>Chờ xác nhận hẹn gặp ({pending.nearDeadline.length})</h2>
      {pending.nearDeadline.map(req => (
        <div key={req.id}>
          <p>{req.pet?.name} - {req.requester?.display_name}</p>
          <p>Deadline: {new Date(req.confirmation_deadline).toLocaleString('vi-VN')}</p>
        </div>
      ))}

      <h2>Quá hạn - Cần auto-cancel ({pending.overDeadline.length})</h2>
      {pending.overDeadline.map(req => (
        <div key={req.id} style={{ background: '#fee2e2', padding: 8 }}>
          <p>🔴 {req.pet?.name} - {req.requester?.display_name}</p>
          <p>Deadline: {new Date(req.confirmation_deadline).toLocaleString('vi-VN')}</p>
        </div>
      ))}
    </div>
  );
};


// ================================================================
// 9. ADMIN: SEND PENDING REMINDERS
// ================================================================

import { sendPendingReminders } from '../services/adoptionAdminHelper';

const AdminRemindersPage = () => {
  const [sending, setSending] = React.useState(false);

  const handleSendReminders = async () => {
    setSending(true);
    const result = await sendPendingReminders();
    if (result.success) {
      alert(`✅ Đã gửi ${result.sentCount} nhắc nhở`);
    } else {
      alert('❌ Lỗi: ' + result.error);
    }
    setSending(false);
  };

  return (
    <button 
      onClick={handleSendReminders}
      disabled={sending}
    >
      {sending ? '⏳ Đang gửi...' : '📬 Gửi nhắc nhở'}
    </button>
  );
};


// ================================================================
// 10. ADMIN: TRIGGER AUTO-CANCEL
// ================================================================

import { handleTimeoutCancellations } from '../services/adoptionAdminHelper';

const AdminCancelPage = () => {
  const [cancelling, setCancelling] = React.useState(false);

  const handleAutoCancel = async () => {
    if (!window.confirm('Auto-cancel những request quá hạn?')) return;
    
    setCancelling(true);
    const result = await handleTimeoutCancellations();
    if (result.success) {
      alert(`✅ Auto-cancelled ${result.cancelledCount} requests`);
    } else {
      alert('❌ Lỗi: ' + result.error);
    }
    setCancelling(false);
  };

  return (
    <button 
      onClick={handleAutoCancel}
      disabled={cancelling}
      style={{ background: '#ef4444', color: '#fff' }}
    >
      {cancelling ? '⏳ Đang xử lý...' : '🔴 Auto-cancel timeouts'}
    </button>
  );
};


// ================================================================
// 11. ADMIN: GET NO-SHOW STATISTICS
// ================================================================

import { getNoShowStatistics, getRecentNoShowCases } from '../services/adoptionAdminHelper';

const AdminStatsPage = () => {
  const [stats, setStats] = React.useState(null);
  const [cases, setCases] = React.useState(null);

  React.useEffect(() => {
    const load = async () => {
      const statsResult = await getNoShowStatistics();
      const casesResult = await getRecentNoShowCases(7);
      setStats(statsResult);
      setCases(casesResult);
    };
    load();
  }, []);

  if (!stats || !cases) return <div>⏳ Loading...</div>;

  return (
    <div>
      <h2>📊 Thống kê No-show</h2>
      <p>Tổng cases: {stats.totalNoShowCases}</p>
      
      <h3>Top 10 Người có no-show</h3>
      {stats.topNoShowUsers.map((user, i) => (
        <div key={user.userId}>
          {i + 1}. User {user.userId}: {user.count} lần
        </div>
      ))}

      <h3>No-show gần đây (7 ngày)</h3>
      {cases.cases?.map(c => (
        <div key={c.id}>
          {c.adoption_request?.pet?.name} - {new Date(c.created_at).toLocaleString('vi-VN')}
        </div>
      ))}
    </div>
  );
};


// ================================================================
// 12. ADMIN: GET LOW REPUTATION USERS
// ================================================================

import { getLowReputationUsers } from '../services/adoptionAdminHelper';

const AdminLowRepPage = () => {
  const [users, setUsers] = React.useState(null);

  React.useEffect(() => {
    const load = async () => {
      const result = await getLowReputationUsers(50); // Score < 50
      setUsers(result.users);
    };
    load();
  }, []);

  if (!users) return <div>⏳ Loading...</div>;

  return (
    <div>
      <h2>⚠️ Người dùng danh tiếng thấp ({users.length})</h2>
      {users.map(user => (
        <div key={user.id} style={{ background: '#fee2e2', padding: 8, marginBottom: 8 }}>
          <p><strong>{user.display_name}</strong></p>
          <p>Điểm: {user.reputation_score}/100</p>
          <p>❌ No-show: {user.no_show_count} | ⏱️ Muộn: {user.late_count}</p>
        </div>
      ))}
    </div>
  );
};


// ================================================================
// 13. FULL INTEGRATION EXAMPLE - PetDetailPage
// ================================================================

import { sendMeetingReminder, logAdoptionActivity } from '../services/adoptionNotifications';

export default function PetDetailPage() {
  // ... existing code ...

  const handleOwnerConfirmMeet = async (request) => {
    try {
      const payload = {
        owner_confirmed_meet: true,
        owner_confirmed_at: new Date().toISOString()
      };

      // If receiver already confirmed → generate token
      if (request.receiver_confirmed_meet) {
        const token = Math.random().toString(36).substring(2, 10).toUpperCase();
        payload.delivery_token = token;
        payload.status = 'ready_to_deliver';
        payload.token_generated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('adoption_requests')
        .update(payload)
        .eq('id', request.id);

      if (error) throw error;

      // Log activity
      await logAdoptionActivity({
        adoptionRequestId: request.id,
        activityType: 'meeting_confirmed',
        actorType: 'owner',
        description: 'Chủ xác nhận hẹn gặp'
      });

      alert(
        request.receiver_confirmed_meet
          ? '✅ Đã sinh mã giao mèo!'
          : '✅ Đã xác nhận. Chờ người nhận xác nhận...'
      );

      // Refresh request
      await loadRequest();
    } catch (err) {
      alert('❌ Lỗi: ' + err.message);
    }
  };

  // ... rest of component ...
}


// ================================================================
// 14. TRIGGER REAL-TIME NOTIFICATIONS
// ================================================================

import { subscribeToNotifications } from '../services/adoptionNotifications';

export default function NotificationListener() {
  React.useEffect(() => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Subscribe to changes
    const unsubscribe = subscribeToNotifications(user.id, (payload) => {
      console.log('📬 New notification:', payload);

      // Show toast or alert
      if (payload.eventType === 'INSERT') {
        // New notification arrived
        console.log('🔔 Alert:', payload.new.title);
        // Can trigger browser notification here
      }
    });

    return () => unsubscribe();
  }, []);

  return null; // Background listener
}
