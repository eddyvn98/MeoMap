/**
 * Admin API: Adoption System Maintenance
 * Được sử dụng bởi Cloud Functions hoặc scheduler
 * 
 * This should be called periodically (e.g., daily via Cloud Scheduler)
 * to handle reminders, timeouts, and cleanup
 */

import { supabase } from '../supabaseClient';

/**
 * Gửi nhắc nhở cho các adoption request sắp hết hạn
 * Chỉ gửi một lần
 */
export const sendPendingReminders = async () => {
  try {
    // Find all adopted requests in 'accepted' status
    // that don't have reminders sent yet and are NOT yet confirmed
    const { data: requests, error: fetchError } = await supabase
      .from('adoption_requests')
      .select('*')
      .eq('status', 'accepted')
      .is('receiver_reminder_sent_at', null)
      .is('owner_reminder_sent_at', null)
      .eq('receiver_confirmed_meet', false)
      .eq('owner_confirmed_meet', false);

    if (fetchError) throw fetchError;

    if (!requests || requests.length === 0) {
      return { success: true, sentCount: 0, message: 'No reminders to send' };
    }

    let sentCount = 0;

    // Send reminders for each request
    for (const request of requests) {
      const result = await supabase.rpc('send_meeting_confirmation_reminder', {
        p_adoption_request_id: request.id
      });

      if (!result.error) {
        sentCount++;
      }
    }

    return { success: true, sentCount, message: `Sent ${sentCount} reminders` };
  } catch (error) {
    console.error('Error sending pending reminders:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Tự động hủy các adoption request quá hạn
 * Chỉ hủy những cái có confirmation_deadline < now() và chưa confirm
 */
export const handleTimeoutCancellations = async () => {
  try {
    const { data: result, error } = await supabase.rpc(
      'auto_cancel_unconfirmed_meetings'
    );

    if (error) throw error;

    const cancelledCount = result[0]?.cancelled_count || 0;

    return {
      success: true,
      cancelledCount,
      message: `Auto-cancelled ${cancelledCount} requests`
    };
  } catch (error) {
    console.error('Error handling timeout cancellations:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Lấy danh sách adoption request cần xử lý (timeout, quá hạn nhắc nhở)
 */
export const getPendingAdoptionRequests = async () => {
  try {
    // Requests that accepted but haven't confirmed
    const { data: unconfirmed, error: error1 } = await supabase
      .from('adoption_requests')
      .select(`
        *,
        requester:requester_id (id, display_name, email),
        owner:owner_id (id, display_name, email),
        pet:pet_id (id, name)
      `)
      .eq('status', 'accepted')
      .or('receiver_confirmed_meet.eq.false,owner_confirmed_meet.eq.false');

    if (error1) throw error1;

    // Filter out those that are already confirmed
    const needsReminder = unconfirmed.filter(
      r =>
        (!r.receiver_confirmed_meet || !r.owner_confirmed_meet) &&
        r.confirmation_deadline &&
        new Date(r.confirmation_deadline) > new Date()
    );

    const nearDeadline = unconfirmed.filter(
      r =>
        (!r.receiver_confirmed_meet || !r.owner_confirmed_meet) &&
        r.confirmation_deadline &&
        new Date(r.confirmation_deadline) < new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
    );

    const overDeadline = unconfirmed.filter(
      r =>
        (!r.receiver_confirmed_meet || !r.owner_confirmed_meet) &&
        r.confirmation_deadline &&
        new Date(r.confirmation_deadline) < new Date()
    );

    return {
      success: true,
      needsReminder,
      nearDeadline,
      overDeadline
    };
  } catch (error) {
    console.error('Error getting pending adoption requests:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Lấy các no-show cases gần đây
 */
export const getRecentNoShowCases = async (days = 7) => {
  try {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: activities, error } = await supabase
      .from('adoption_activities')
      .select(`
        *,
        adoption_request:adoption_request_id (
          id,
          status,
          requester:requester_id (id, display_name, email),
          owner:owner_id (id, display_name, email),
          pet:pet_id (id, name)
        )
      `)
      .eq('activity_type', 'no_show_recorded')
      .gt('created_at', sinceDate)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, cases: activities };
  } catch (error) {
    console.error('Error getting recent no-show cases:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Lấy danh sách user có danh tiếng thấp (cần giám sát)
 */
export const getLowReputationUsers = async (scoreThreshold = 50) => {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, display_name, email, reputation_score, no_show_count, late_count')
      .lt('reputation_score', scoreThreshold)
      .order('reputation_score', { ascending: true });

    if (error) throw error;

    return { success: true, users };
  } catch (error) {
    console.error('Error getting low reputation users:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Lấy thống kê no-show của hệ thống
 */
export const getNoShowStatistics = async () => {
  try {
    const { data: stats, error } = await supabase
      .from('adoption_activities')
      .select('actor_id')
      .eq('activity_type', 'no_show_recorded');

    if (error) throw error;

    // Count by user
    const noShowByUser = {};
    stats.forEach(stat => {
      noShowByUser[stat.actor_id] = (noShowByUser[stat.actor_id] || 0) + 1;
    });

    const topNoShowUsers = Object.entries(noShowByUser)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      success: true,
      totalNoShowCases: stats.length,
      topNoShowUsers: topNoShowUsers.map(([userId, count]) => ({
        userId,
        count
      }))
    };
  } catch (error) {
    console.error('Error getting no-show statistics:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Run all maintenance tasks
 * Được gọi bởi Cloud Scheduler (daily)
 */
export const runMaintenanceTasks = async () => {
  try {
    const results = {
      reminders: await sendPendingReminders(),
      timeouts: await handleTimeoutCancellations()
    };

    return { success: true, results };
  } catch (error) {
    console.error('Error running maintenance tasks:', error);
    return { success: false, error: error.message };
  }
};
