// Adoption reminder scheduler
// Handles automatic reminders at 1 day, 7 days, and 30 days after delivery

import { supabase } from '../supabaseClient';
import { sendReminderEmail } from './emailService';

/**
 * Calculate days since delivery
 */
function daysSinceDelivery(deliveredAt) {
  if (!deliveredAt) return 0;
  const delivered = new Date(deliveredAt);
  const now = new Date();
  return Math.floor((now - delivered) / (1000 * 60 * 60 * 24));
}

/**
 * Check if reminder should be sent for a specific day milestone
 */
function shouldSendReminder(adoptionRequest, dayMilestone) {
  if (!adoptionRequest.delivered_at) return false;
  if (adoptionRequest.status !== 'delivered') return false;
  if (adoptionRequest.receiver_confirmed_checkin) return false; // Already confirmed

  const days = daysSinceDelivery(adoptionRequest.delivered_at);
  
  // Allow 2-hour window for sending (e.g., day 1 = 24-26 hours)
  const hoursSinceDelivery = (new Date() - new Date(adoptionRequest.delivered_at)) / (1000 * 60 * 60);
  const expectedHours = dayMilestone * 24;
  
  return Math.abs(hoursSinceDelivery - expectedHours) <= 2;
}

/**
 * Send all pending reminders for adoption requests
 * Should be called periodically (e.g., every hour or via cron job)
 */
export async function processPendingReminders() {
  try {
    console.log('[REMINDER SCHEDULER] Starting reminder processing...');

    // Fetch all delivered adoption requests that need reminders
    const { data: adoptions, error: fetchErr } = await supabase
      .from('adoption_requests')
      .select(`
        id,
        pet_id,
        requester_id,
        delivered_at,
        receiver_confirmed_checkin,
        status,
        requester:profiles!requester_id(display_name, email),
        pet:pets(name)
      `)
      .eq('status', 'delivered')
      .eq('receiver_confirmed_checkin', false)
      .gte('delivered_at', new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()); // Last 35 days

    if (fetchErr) {
      console.error('[REMINDER SCHEDULER] Error fetching adoptions:', fetchErr);
      return { success: false, error: fetchErr.message };
    }

    if (!adoptions || adoptions.length === 0) {
      console.log('[REMINDER SCHEDULER] No pending adoptions to process');
      return { success: true, processed: 0, sent: 0 };
    }

    let sent = 0;
    const reminders = [];

    // Process each adoption
    for (const adoption of adoptions) {
      const daysSince = daysSinceDelivery(adoption.delivered_at);
      
      // Check for each milestone
      const milestones = [1, 7, 30];
      
      for (const milestone of milestones) {
        if (Math.abs(daysSince - milestone) <= 1) { // Allow 1-day tolerance
          const reminderType = milestone === 1 ? 'reminder_1day' : 
                              milestone === 7 ? 'reminder_7day' : 
                              'reminder_overdue';

          // Check if we already sent this reminder
          const { data: existingReminder } = await supabase
            .from('adoption_emails')
            .select('id')
            .eq('adoption_request_id', adoption.id)
            .eq('email_type', reminderType)
            .limit(1);

          if (!existingReminder || existingReminder.length === 0) {
            // Send reminder
            const adoptionData = {
              adoptionId: adoption.id,
              petName: adoption.pet?.name || 'mèo',
              ownerName: 'Chủ bài',
              receiverName: adoption.requester?.display_name || 'Bạn',
              receiverEmail: adoption.requester?.email,
              daysLeft: Math.max(0, 30 - daysSince)
            };

            const result = await sendReminderEmail(adoptionData, reminderType);
            
            if (result.success) {
              sent++;
              reminders.push({
                adoption_id: adoption.id,
                type: reminderType,
                sent_at: new Date().toISOString(),
                days_since: daysSince
              });
              
              console.log(`[REMINDER SCHEDULER] Sent ${reminderType} for adoption ${adoption.id}`);
            } else {
              console.warn(`[REMINDER SCHEDULER] Failed to send ${reminderType}:`, result.error);
            }
          }
        }
      }
    }

    console.log(`[REMINDER SCHEDULER] Processing complete. Sent ${sent} reminders.`);
    
    return {
      success: true,
      processed: adoptions.length,
      sent,
      reminders
    };

  } catch (error) {
    console.error('[REMINDER SCHEDULER] Error processing reminders:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get reminder status for an adoption request
 */
export async function getAdoptionReminderStatus(adoptionId) {
  try {
    const { data: emails, error } = await supabase
      .from('adoption_emails')
      .select('email_type, sent_at')
      .eq('adoption_request_id', adoptionId)
      .order('sent_at', { ascending: false });

    if (error) throw error;

    const status = {
      adoption_id: adoptionId,
      reminders_sent: emails?.length || 0,
      delivery_notification_sent: !!emails?.find(e => e.email_type === 'delivery_notification'),
      reminder_1day_sent: !!emails?.find(e => e.email_type === 'reminder_1day'),
      reminder_7day_sent: !!emails?.find(e => e.email_type === 'reminder_7day'),
      reminder_overdue_sent: !!emails?.find(e => e.email_type === 'reminder_overdue'),
      last_email: emails?.[0]?.sent_at
    };

    return status;
  } catch (error) {
    console.error('[REMINDER SCHEDULER] Error getting reminder status:', error);
    return null;
  }
}

/**
 * Manually resend a reminder (for admin use)
 */
export async function resendReminder(adoptionId, reminderType) {
  try {
    const { data: adoption, error: fetchErr } = await supabase
      .from('adoption_requests')
      .select(`
        id,
        pet:pets(name),
        requester:profiles!requester_id(display_name, email)
      `)
      .eq('id', adoptionId)
      .single();

    if (fetchErr) throw fetchErr;
    if (!adoption) throw new Error('Adoption not found');

    const adoptionData = {
      adoptionId: adoption.id,
      petName: adoption.pet?.name || 'mèo',
      ownerName: 'Chủ bài',
      receiverName: adoption.requester?.display_name || 'Bạn',
      receiverEmail: adoption.requester?.email,
      daysLeft: 30
    };

    return await sendReminderEmail(adoptionData, reminderType);

  } catch (error) {
    console.error('[REMINDER SCHEDULER] Error resending reminder:', error);
    return { success: false, error: error.message };
  }
}
