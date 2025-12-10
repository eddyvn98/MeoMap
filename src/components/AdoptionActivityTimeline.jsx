import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AdoptionActivityTimeline({ adoptionRequestId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!adoptionRequestId) return;

    const loadActivities = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('adoption_activities')
          .select(`
            *,
            actor:profiles(display_name, avatar_url)
          `)
          .eq('adoption_request_id', adoptionRequestId)
          .order('created_at', { ascending: true });

        if (error) {
          // If table doesn't exist (404 PGRST205), silently skip
          if (error.code === 'PGRST205') {
            console.warn('[AdoptionActivityTimeline] adoption_activities table not found; skipping');
            setActivities([]);
          } else {
            console.error('Load activities failed:', error);
          }
          return;
        }
        setActivities(data || []);
      } catch (err) {
        console.error('Load activities exception:', err);
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [adoptionRequestId]);

  const getActivityIcon = (type) => {
    const icons = {
      request_sent: '📬',
      request_accepted: '✅',
      request_rejected: '❌',
      meeting_confirmed: '🤝',
      delivery_prepared: '📦',
      delivery_scanned: '📱',
      receiver_checkin_confirmed: '🎉',
      owner_checkin_confirmed: '✔️',
      reminder_sent: '🔔',
      rating_submitted: '⭐',
      request_completed: '🏆'
    };
    return icons[type] || '•';
  };

  const getActivityLabel = (type) => {
    const labels = {
      request_sent: 'Yêu cầu nhận nuôi được gửi',
      request_accepted: 'Yêu cầu đã được chấp nhận',
      request_rejected: 'Yêu cầu bị từ chối',
      meeting_confirmed: 'Hẹn gặp đã xác nhận',
      delivery_prepared: 'Sẵn sàng giao mèo',
      delivery_scanned: 'Mã giao được quét - Mèo đã giao',
      receiver_checkin_confirmed: 'Người nhận xác nhận mèo ổn',
      owner_checkin_confirmed: 'Chủ bài xác nhận hoàn thành',
      reminder_sent: 'Gửi nhắc tới người nhận',
      rating_submitted: 'Đánh giá được gửi',
      request_completed: 'Giao dịch hoàn tất'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div style={{ padding: 12, color: '#6b7280', fontSize: 12 }}>
        Đang tải lịch sử...
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div style={{ padding: 12, color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>
        Chưa có hoạt động nào
      </div>
    );
  }

  return (
    <div style={{ padding: 12, background: '#f9fafb', borderRadius: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 12, color: '#374151' }}>
        📋 Lịch sử giao dịch
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {activities.map((activity, idx) => {
          const isLast = idx === activities.length - 1;
          const time = new Date(activity.created_at);
          return (
            <div
              key={activity.id}
              style={{
                display: 'flex',
                gap: 10,
                position: 'relative',
                paddingBottom: isLast ? 0 : 8
              }}
            >
              {/* Timeline line */}
              {!isLast && (
                <div
                  style={{
                    position: 'absolute',
                    left: 15,
                    top: 32,
                    width: 2,
                    height: 24,
                    background: '#d1d5db'
                  }}
                />
              )}

              {/* Icon */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#dbeafe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                  zIndex: 1
                }}
              >
                {getActivityIcon(activity.activity_type)}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: '#374151', marginBottom: 2 }}>
                  {getActivityLabel(activity.activity_type)}
                </div>
                {activity.actor?.display_name && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>
                    bởi <strong>{activity.actor.display_name}</strong>
                  </div>
                )}
                {activity.description && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>
                    {activity.description}
                  </div>
                )}
                <div style={{ fontSize: 10, color: '#9ca3af' }}>
                  {time.toLocaleString('vi-VN')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
