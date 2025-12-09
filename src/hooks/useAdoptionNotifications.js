/**
 * Hook để quản lý adoption notifications và reminders
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getNotifications,
  markNotificationAsRead,
  getReputationInfo,
  subscribeToNotifications,
  sendMeetingReminder,
  recordNoShow
} from '../services/adoptionNotifications';

/**
 * Hook: useAdoptionNotifications
 * Quản lý thông báo adoption cho user hiện tại
 */
export const useAdoptionNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load initial notifications
    const loadNotifications = async () => {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read_at).length);
      setLoading(false);
    };

    loadNotifications();

    // Subscribe to real-time updates
    const unsubscribe = subscribeToNotifications((payload) => {
      if (payload.eventType === 'INSERT') {
        setNotifications(prev => [payload.new, ...prev]);
        setUnreadCount(prev => prev + 1);
      } else if (payload.eventType === 'UPDATE') {
        setNotifications(prev =>
          prev.map(n => (n.id === payload.new.id ? payload.new : n))
        );
        if (!payload.new.read_at) {
          setUnreadCount(prev => prev + 1);
        }
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    const result = await markNotificationAsRead(notificationId);
    if (result.success) {
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    return result;
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead
  };
};

/**
 * Hook: useReputationInfo
 * Lấy thông tin danh tiếng của user
 */
export const useReputationInfo = (userId) => {
  const [reputation, setReputation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadReputation = async () => {
      setLoading(true);
      const data = await getReputationInfo(userId);
      setReputation(data);
      setLoading(false);
    };

    loadReputation();
  }, [userId]);

  return { reputation, loading };
};

/**
 * Hook: useMeetingReminder
 * Gửi nhắc nhở xác nhận hẹn gặp
 */
export const useMeetingReminder = () => {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const send = useCallback(async (adoptionRequestId) => {
    setSending(true);
    setError(null);
    try {
      const result = await sendMeetingReminder(adoptionRequestId);
      if (!result.success) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setSending(false);
    }
  }, []);

  return { send, sending, error };
};

/**
 * Hook: useNoShowRecorder
 * Ghi nhận no-show sau khi giao/nhận mèo thất bại
 */
export const useNoShowRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState(null);

  const record = useCallback(async (adoptionRequestId, noShowParty) => {
    setRecording(true);
    setError(null);
    try {
      const result = await recordNoShow(adoptionRequestId, noShowParty);
      if (!result.success) {
        setError(result.error);
      }
      return result;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setRecording(false);
    }
  }, []);

  return { record, recording, error };
};
