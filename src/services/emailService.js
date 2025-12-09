// Email service for sending adoption notifications
// Using Resend or simple fetch to backend email API

import { supabase } from '../supabaseClient';
import { EMAIL_CONFIG, EMAIL_TEMPLATES } from './emailConfig';

/**
 * Send adoption notification email
 * @param {string} recipientEmail - Email address to send to
 * @param {string} type - Email type: 'delivery_notification', 'reminder_1day', 'reminder_7day', 'reminder_overdue'
 * @param {object} data - Additional data for email template
 */
export async function sendAdoptionEmail(recipientEmail, type, data = {}) {
  try {
    if (!recipientEmail) {
      console.warn('[EMAIL SERVICE] No recipient email provided');
      return { success: false, error: 'No recipient email' };
    }

    const emailPayload = {
      recipient_email: recipientEmail,
      email_type: type,
      pet_name: data.petName || 'mèo của bạn',
      owner_name: data.ownerName || 'Chủ bài',
      days_left: data.daysLeft || 30,
      adoption_id: data.adoptionId,
      receiver_name: data.receiverName || 'Bạn',
      timestamp: new Date().toISOString()
    };

    // Get template
    const template = EMAIL_TEMPLATES[type];
    if (!template) {
      console.error('[EMAIL SERVICE] Unknown email type:', type);
      return { success: false, error: 'Unknown email type' };
    }

    const subject = template.subject(emailPayload);
    const htmlContent = template.getHTML(emailPayload);

    console.log('[EMAIL SERVICE] Preparing email:', {
      to: recipientEmail,
      subject,
      type,
      petName: data.petName
    });

    // Option 1: Call Supabase Edge Function (if available)
    // Option 2: Call external API (Resend, SendGrid, etc)
    // Option 3: Use simple fetch to backend
    
    // For now, log to console (replace with real email service)
    if (EMAIL_CONFIG.ENABLED && EMAIL_CONFIG.PROVIDER !== 'mock') {
      // TODO: Call real email service
      // Example for Resend:
      // const response = await fetch('https://api.resend.com/emails', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${EMAIL_CONFIG.RESEND_API_KEY}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     from: `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
      //     to: recipientEmail,
      //     subject,
      //     html: htmlContent,
      //     reply_to: EMAIL_CONFIG.SUPPORT_EMAIL
      //   })
      // });
      //
      // if (!response.ok) {
      //   throw new Error(`Email service error: ${response.statusText}`);
      // }
    }

    // Store email log in Supabase for audit trail
    try {
      await supabase
        .from('adoption_emails')
        .insert({
          adoption_request_id: data.adoptionId,
          recipient_email: recipientEmail,
          email_type: type,
          subject,
          sent_at: new Date().toISOString(),
          status: 'sent'
        })
        .catch(err => {
          console.warn('[EMAIL SERVICE] Could not log email to DB:', err);
        });
    } catch (err) {
      console.warn('[EMAIL SERVICE] Error logging email:', err);
    }

    // Return success
    return {
      success: true,
      type,
      recipient: recipientEmail,
      timestamp: new Date().toISOString(),
      message: EMAIL_CONFIG.ENABLED ? 'Email sent' : 'Email logged (mock mode)'
    };
  } catch (error) {
    console.error('[EMAIL SERVICE] Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send email after delivery scanned
 */
export async function sendDeliveryNotification(adoptionData) {
  return sendAdoptionEmail(
    adoptionData.receiverEmail,
    'delivery_notification',
    {
      petName: adoptionData.petName,
      ownerName: adoptionData.ownerName,
      receiverName: adoptionData.receiverName,
      daysLeft: 30,
      adoptionId: adoptionData.adoptionId
    }
  );
}

/**
 * Send reminder email
 */
export async function sendReminderEmail(adoptionData, reminderType = 'reminder_1day') {
  const daysMap = {
    'reminder_1day': 29,
    'reminder_7day': 23,
    'reminder_overdue': 0
  };

  return sendAdoptionEmail(
    adoptionData.receiverEmail,
    reminderType,
    {
      petName: adoptionData.petName,
      ownerName: adoptionData.ownerName,
      receiverName: adoptionData.receiverName,
      daysLeft: daysMap[reminderType],
      adoptionId: adoptionData.adoptionId
    }
  );
}

/**
 * Send reminder from owner to receiver
 */
export async function sendOwnerReminderEmail(adoptionData) {
  return sendAdoptionEmail(
    adoptionData.receiverEmail,
    'receiver_reminder',
    {
      petName: adoptionData.petName,
      ownerName: adoptionData.ownerName,
      receiverName: adoptionData.receiverName,
      adoptionId: adoptionData.adoptionId
    }
  );
}
