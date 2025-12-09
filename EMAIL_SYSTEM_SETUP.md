# Email Notification System Setup Guide

## Overview
MeoMap sends automated email notifications during the adoption post-delivery follow-up process.

## Email Types

### 1. **Delivery Notification** (`delivery_notification`)
- **When**: Immediately after owner scans QR code and marks delivery as complete
- **To**: Pet receiver
- **Content**: Congratulations email explaining the 30-day check-in requirement
- **Subject**: 🎉 Bé mèo [pet_name] đã được giao cho bạn!

### 2. **1-Day Reminder** (`reminder_1day`)
- **When**: Auto-sent 1 day after delivery
- **To**: Pet receiver
- **Content**: Gentle reminder to update pet status
- **Subject**: ⏰ Nhắc nhở: Cập nhật về bé mèo sau 1 ngày

### 3. **7-Day Reminder** (`reminder_7day`)
- **When**: Auto-sent 7 days after delivery
- **To**: Pet receiver
- **Content**: Second reminder with encouragement to share photos
- **Subject**: ⏰ Nhắc nhở: Đã 7 ngày nhận [pet_name]

### 4. **Overdue Reminder** (`reminder_overdue`)
- **When**: Auto-sent after 30-day deadline has passed
- **To**: Pet receiver
- **Content**: Urgent reminder that deadline has passed
- **Subject**: ⚠️ Hạn xác nhận [pet_name] sắp hết!

### 5. **Owner Reminder** (`receiver_reminder`)
- **When**: Manual - when owner clicks "Nhắc người nhận" button
- **To**: Pet receiver
- **Content**: Personal message from owner asking for confirmation
- **Subject**: 📬 [owner_name] nhắc bạn xác nhận tình hình [pet_name]

## Implementation Steps

### Step 1: Run Database Migration
Execute the SQL in `database/adoption_emails.sql`:
```sql
-- Creates adoption_emails table for logging all sent emails
```

### Step 2: Configure Email Service

#### Option A: Using Resend (Recommended)
1. Sign up at https://resend.com
2. Get your API key
3. Add to `.env.local`:
```
VITE_EMAIL_PROVIDER=resend
VITE_RESEND_API_KEY=your_api_key_here
```
4. Update `src/services/emailService.js` to uncomment Resend code

#### Option B: Using SendGrid
1. Sign up at https://sendgrid.com
2. Get your API key
3. Add to `.env.local`:
```
VITE_EMAIL_PROVIDER=sendgrid
VITE_SENDGRID_API_KEY=your_api_key_here
```
4. Create the SendGrid integration in `src/services/emailService.js`

#### Option C: Using Supabase Edge Functions
1. Set up Supabase CLI
2. Create Edge Function to handle email sending
3. Update ProfileDrawer.jsx to call the Edge Function

#### Option D: Using Custom SMTP
1. Configure SMTP credentials
2. Update emailService.js with nodemailer or similar

### Step 3: Enable Email Service
In `src/services/emailConfig.js`, set:
```javascript
ENABLED: true,
PROVIDER: 'resend' // or your chosen provider
```

### Step 4: Test Email Sending
1. Create an adoption request
2. Scan QR code to mark delivery
3. Check console logs and adoption_emails table
4. Verify email was received by test recipient

## Current Status

### ✅ Completed
- Email templates created with HTML styling
- EmailService integration with ProfileDrawer
- Delivery notification triggered on QR scan
- "Nhắc người nhận" button sends reminder email
- Email logging to adoption_emails table
- Mock mode for testing without actual email sending

### ⏳ In Progress
- Automatic reminder scheduler (cron job)
- Email service provider integration

### 📋 Todo
- Set up scheduled reminders for days 1, 7, 30
- Integrate with Supabase pg_cron or external scheduler
- Add email bounce/failure handling
- Create email template customization admin panel
- Add email preference management (opt-in/out)

## Testing

### Test in Mock Mode (No Real Emails)
```javascript
// In emailConfig.js
ENABLED: false // Emails logged to console only
PROVIDER: 'mock'
```

### View Email Logs
```sql
-- Check all sent emails
SELECT * FROM adoption_emails ORDER BY sent_at DESC LIMIT 10;

-- Check emails for specific adoption
SELECT * FROM adoption_emails 
WHERE adoption_request_id = 'your-adoption-id'
ORDER BY sent_at DESC;

-- Check emails by type
SELECT email_type, COUNT(*) as count, MAX(sent_at) as last_sent
FROM adoption_emails
GROUP BY email_type
ORDER BY last_sent DESC;
```

## Email Template Customization

Edit `src/services/emailConfig.js` to:
- Change email subject lines
- Modify HTML styling and layout
- Add new email types
- Update sender name and support email

## Troubleshooting

### Email Not Sent
1. Check console logs for `[EMAIL SERVICE]` messages
2. Verify recipient email is valid
3. Check adoption_emails table for log entry
4. Verify email service credentials in .env.local

### Email Not Received
1. Check spam/junk folder
2. Verify sender domain (if using custom domain)
3. Check email service provider dashboard for delivery status
4. Review SPF/DKIM/DMARC records if using custom domain

### Template Issues
1. Check EMAIL_TEMPLATES in emailConfig.js
2. Verify template function returns valid HTML
3. Test with console.log(getHTML(...))

## Security Considerations

- Store API keys in `.env.local` (not in git)
- Use environment variables for sensitive data
- Validate email addresses before sending
- Rate limit email sending per user
- Monitor for email service quota usage
- Log all email activities for audit trail

## Future Enhancements

1. **Smart Reminders**: Send reminders based on pet status
2. **Email Preferences**: Let users choose notification frequency
3. **Multi-language**: Support Vietnamese, English, other languages
4. **A/B Testing**: Test different email content versions
5. **Analytics**: Track open rates, click rates
6. **Scheduled Reminders**: Automatic reminders without manual trigger
7. **Batch Processing**: Send multiple emails efficiently
8. **Template Builder**: Visual email template editor

## Cost Estimates

- **Resend**: ~$0.0005 per email (free tier: 100/day)
- **SendGrid**: $9.95/month for 10k emails/month
- **AWS SES**: $0.10 per 1000 emails
- **Supabase Edge Functions**: ~$0.50 per 1M invocations
