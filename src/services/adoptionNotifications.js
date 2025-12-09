/**
 * Service để quản lý thông báo adoption
 * Handles reminders, notifications, và no-show tracking
 */

import { supabase } from '../supabaseClient';

/**
 * Gửi nhắc nhở xác nhận hẹn gặp cho cả 2 bên
 * @param {string} adoptionRequestId - ID của adoption request
 * @returns {Promise<Object>}
 */
export const sendMeetingReminder = async (adoptionRequestId) => {
  try {
    const { data, error } = await supabase.rpc(
      'send_meeting_confirmation_reminder',
      {
        p_adoption_request_id: adoptionRequestId
      }
    );

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error sending meeting reminder:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Lấy danh sách thông báo của user hiện tại
 * @param {Object} options - Filter options
 * @returns {Promise<Array>}
 */
export const getNotifications = async (options = {}) => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let query = supabase
      .from('adoption_notifications')
      .select(`
        *,
        adoption_requests (
          id,
          pet_id,
          status,
          receiver_confirmed_meet,
          owner_confirmed_meet,
          pets (name)
        )
      `)
      .eq('recipient_id', user.user.id)
      .order('created_at', { ascending: false });

    if (options.unreadOnly) {
      query = query.is('read_at', null);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
};

/**
 * Đánh dấu thông báo là đã đọc
 * @param {string} notificationId - ID của notification
 * @returns {Promise<Object>}
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('adoption_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Ghi nhận no-show sau khi giao mèo thất bại
 * @param {string} adoptionRequestId - ID của adoption request
 * @param {string} noShowParty - 'receiver' hoặc 'owner'
 * @returns {Promise<Object>}
 */
export const recordNoShow = async (adoptionRequestId, noShowParty) => {
  try {
    if (!['receiver', 'owner'].includes(noShowParty)) {
      throw new Error('Invalid no_show_party');
    }

    const { data, error } = await supabase.rpc(
      'record_no_show_after_delivery',
      {
        p_adoption_request_id: adoptionRequestId,
        p_no_show_party: noShowParty
      }
    );

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error recording no-show:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Chạy auto-cancel cho những yêu cầu quá hạn
 * (Thường được gọi bởi backend scheduler)
 * @returns {Promise<Object>}
 */
export const triggerAutoCancelTimeout = async () => {
  try {
    const { data, error } = await supabase.rpc(
      'auto_cancel_unconfirmed_meetings'
    );

    if (error) throw error;
    return { success: true, cancelledCount: data[0]?.cancelled_count || 0 };
  } catch (error) {
    console.error('Error triggering auto-cancel:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Lấy thông tin reputation của user
 * @param {string} userId - ID của user
 * @returns {Promise<Object>}
 */
export const getReputationInfo = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, reputation_score, no_show_count, late_count, reputation_updated_at')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('Error getting reputation info:', error);
    return null;
  }
};

/**
 * Lấy danh sách adoption activities của một request
 * @param {string} adoptionRequestId - ID của adoption request
 * @returns {Promise<Array>}
 */
export const getAdoptionActivities = async (adoptionRequestId) => {
  try {
    const { data, error } = await supabase
      .from('adoption_activities')
      .select(`
        *,
        profiles (display_name, avatar_url)
      `)
      .eq('adoption_request_id', adoptionRequestId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting adoption activities:', error);
    return [];
  }
};

/**
 * Ghi log adoption activity
 * @param {Object} activityData - Data cho activity
 * @returns {Promise<Object>}
 */
export const logAdoptionActivity = async (activityData) => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc(
      'log_adoption_activity',
      {
        p_adoption_request_id: activityData.adoptionRequestId,
        p_activity_type: activityData.activityType,
        p_actor_id: activityData.actorId || user.user.id,
        p_actor_type: activityData.actorType,
        p_description: activityData.description || null,
        p_metadata: activityData.metadata || null
      }
    );

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error logging adoption activity:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe to real-time notifications
 * @param {string} userId - ID của user
 * @param {Function} callback - Callback function khi có notification mới
 * @returns {Function} Unsubscribe function
 */
export const subscribeToNotifications = (userId, callback) => {
  const subscription = supabase
    .from(`adoption_notifications:recipient_id=eq.${userId}`)
    .on('*', (payload) => {
      callback(payload);
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
};
