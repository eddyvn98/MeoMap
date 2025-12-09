/**
 * Component: NotificationCenter
 * Hiển thị thông báo adoption cho user
 */

import React, { useState } from 'react';
import { useAdoptionNotifications } from '../hooks/useAdoptionNotifications';

export default function NotificationCenter() {
  const { notifications, unreadCount, markAsRead } = useAdoptionNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'meeting_confirmation_reminder':
        return '🔔';
      case 'meeting_confirmed_both':
        return '✅';
      case 'no_show_detected':
        return '⚠️';
      case 'timeout_cancelled':
        return '❌';
      default:
        return '📬';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'meeting_confirmation_reminder':
        return '#fbbf24'; // amber
      case 'meeting_confirmed_both':
        return '#10b981'; // green
      case 'no_show_detected':
      case 'timeout_cancelled':
        return '#ef4444'; // red
      default:
        return '#3b82f6'; // blue
    }
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Notification Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: 20,
          padding: '8px'
        }}
        title="Thông báo"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: '#fff',
            borderRadius: 8,
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            zIndex: 1000,
            minWidth: 320,
            maxHeight: 400,
            overflowY: 'auto',
            marginTop: 8
          }}
        >
          {notifications.length === 0 ? (
            <div
              style={{
                padding: 16,
                textAlign: 'center',
                color: '#999',
                fontSize: 14
              }}
            >
              Không có thông báo nào
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                style={{
                  padding: 12,
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  background: notification.read_at ? '#fff' : '#f3f4f6',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = notification.read_at
                    ? '#fff'
                    : '#f3f4f6';
                }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ fontSize: 20 }}>
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: '#1f2937',
                        marginBottom: 4
                      }}
                    >
                      {notification.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#666',
                        lineHeight: 1.4,
                        wordBreak: 'break-word'
                      }}
                    >
                      {notification.message}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: '#999',
                        marginTop: 4
                      }}
                    >
                      {new Date(notification.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  {!notification.read_at && (
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: getNotificationColor(
                          notification.notification_type
                        ),
                        marginTop: 4
                      }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
