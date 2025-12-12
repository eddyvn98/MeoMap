import { supabase } from '../supabaseClient';

/**
 * Lưu lời cảm ơn/động viên
 */
export async function saveSupportMessage(caseId, userId, message, anonymous = false) {
  try {
    const { data, error } = await supabase
      .from('support_messages')
      .insert([
        {
          case_id: caseId,
          user_id: userId || null,
          message: message.trim(),
          anonymous: anonymous
        }
      ])
      .select();

    if (error) {
      console.error('Error saving support message:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data };
  } catch (err) {
    console.error('Exception saving support message:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Load lời cảm ơn cho một case
 */
export async function getSupportMessages(caseId) {
  try {
    const { data: messages, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading support messages:', error);
      return { messages: [], error: error.message };
    }

    // Load user profiles cho những tin nhắn không ẩn danh
    const userIds = [...new Set(
      messages
        ?.filter(m => m.user_id && !m.anonymous)
        .map(m => m.user_id) || []
    )];

    let profiles = {};
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);

      if (profileData) {
        profileData.forEach(p => {
          profiles[p.id] = p;
        });
      }
    }

    return { messages, profiles, error: null };
  } catch (err) {
    console.error('Exception loading support messages:', err);
    return { messages: [], profiles: {}, error: err.message };
  }
}
