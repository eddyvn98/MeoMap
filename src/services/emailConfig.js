// Email configuration and templates for adoption notifications
// Supports multiple email providers (Resend, SendGrid, SMTP, etc.)

export const EMAIL_CONFIG = {
  // Set to true when you have a real email service configured
  ENABLED: false,
  
  // Email service type: 'resend', 'sendgrid', 'smtp', 'mock'
  PROVIDER: import.meta.env.VITE_EMAIL_PROVIDER || 'mock',
  
  // API Keys (set in .env.local)
  RESEND_API_KEY: import.meta.env.VITE_RESEND_API_KEY,
  SENDGRID_API_KEY: import.meta.env.VITE_SENDGRID_API_KEY,
  
  // From email
  FROM_EMAIL: 'noreply@meomap.com',
  FROM_NAME: 'MeoMap',
  
  // Support email for users to contact
  SUPPORT_EMAIL: 'support@meomap.com'
};

export const EMAIL_TEMPLATES = {
  delivery_notification: {
    subject: (data) => `🎉 Bé mèo ${data.pet_name} đã được giao cho bạn!`,
    preview: 'Xác nhận tình hình bé mèo trong vòng 30 ngày',
    getHTML: (data) => `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #ff6b9d 0%, #ff8fab 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">🐱 Chúc mừng!</h1>
          <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Bé mèo đã được giao cho bạn</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px; background: #f9fafb;">
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">Xin chào <strong>${data.receiver_name || 'bạn'}</strong>,</p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            Bé mèo <strong>${data.pet_name}</strong> của ${data.owner_name} đã được giao cho bạn thành công! 🎉
          </p>

          <div style="background: #fffbeb; border-left: 4px solid #ff6b9d; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-weight: 600;">⏰ Quan trọng</p>
            <p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px;">
              Vui lòng xác nhận tình hình sức khỏe của bé mèo trong <strong>30 ngày</strong> tới. 
              Thông tin này giúp chủ bài yên tâm về việc chăm sóc của bạn.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
            Hãy cập nhật những thông tin sau:
          </p>
          <ul style="color: #6b7280; font-size: 14px; padding-left: 20px;">
            <li>Tình trạng sức khỏe và tâm trạng của bé mèo</li>
            <li>Thói quen ăn, uống, và vệ sinh</li>
            <li>Các hành vi bất thường hoặc cần chú ý</li>
            <li>Ảnh hoặc video (nếu có) cho chủ bài thấy bé mèo khỏe mạnh</li>
          </ul>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://meomap.com" style="display: inline-block; background: linear-gradient(135deg, #ff6b9d, #ff8fab); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              📱 Mở ứng dụng để cập nhật
            </a>
          </div>

          <p style="color: #6b7280; font-size: 13px; margin: 20px 0 0 0;">
            Nếu có thắc mắc, vui lòng liên hệ: ${EMAIL_CONFIG.SUPPORT_EMAIL}
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #374151; color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2025 MeoMap - Ứng dụng quản lý nhận nuôi mèo</p>
          <p style="margin: 5px 0 0 0; opacity: 0.8;">Hãy yêu thương bé mèo như yêu thương chính mình</p>
        </div>
      </div>
    `
  },

  reminder_1day: {
    subject: (data) => `⏰ Nhắc nhở: Cập nhật về ${data.pet_name} sau 1 ngày`,
    preview: 'Chia sẻ tình hình bé mèo với chủ bài',
    getHTML: (data) => `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
        <div style="background: linear-gradient(135deg, #fbbf24 0%, #fcd34d 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">⏰ Cập nhật sau 1 ngày</h1>
        </div>

        <div style="padding: 30px; background: #f9fafb;">
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">Xin chào <strong>${data.receiver_name || 'bạn'}</strong>,</p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            Đã 1 ngày kể từ khi nhận bé mèo <strong>${data.pet_name}</strong>. 
            Chúng tôi rất muốn nghe tin tức về bé mèo! 😊
          </p>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
            Vui lòng vào ứng dụng MeoMap để cập nhật tình hình:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://meomap.com" style="display: inline-block; background: linear-gradient(135deg, #fbbf24, #fcd34d); color: #1f2937; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              📱 Cập nhật ngay
            </a>
          </div>

          <p style="color: #6b7280; font-size: 13px;">
            Bạn còn <strong>${Math.max(0, data.days_left - 1)}</strong> ngày để hoàn tất xác nhận.
          </p>
        </div>

        <div style="background: #374151; color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2025 MeoMap</p>
        </div>
      </div>
    `
  },

  reminder_7day: {
    subject: (data) => `⏰ Nhắc nhở: Đã 7 ngày nhận ${data.pet_name}`,
    preview: 'Vui lòng cập nhật tình hình bé mèo',
    getHTML: (data) => `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
        <div style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">⏰ Cập nhật sau 7 ngày</h1>
        </div>

        <div style="padding: 30px; background: #f9fafb;">
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">Xin chào <strong>${data.receiver_name || 'bạn'}</strong>,</p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            Đã 7 ngày kể từ khi nhận ${data.pet_name}! 
            Chúng tôi rất muốn nghe tin tức mới nhất về bé mèo. 💌
          </p>

          <div style="background: #fef3c7; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #92400e; margin: 0; font-weight: 600;">💡 Gợi ý</p>
            <p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px;">
              Hãy chia sẻ một bức ảnh gần đây của bé mèo cùng với cập nhật tình hình!
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://meomap.com" style="display: inline-block; background: linear-gradient(135deg, #f97316, #fb923c); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              📱 Cập nhật ngay
            </a>
          </div>

          <p style="color: #6b7280; font-size: 13px;">
            Bạn còn <strong>${Math.max(0, data.days_left - 7)}</strong> ngày để hoàn tất xác nhận.
          </p>
        </div>

        <div style="background: #374151; color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2025 MeoMap</p>
        </div>
      </div>
    `
  },

  reminder_overdue: {
    subject: (data) => `⚠️ Hạn xác nhận ${data.pet_name} sắp hết!`,
    preview: 'Vui lòng cập nhật ngay để hoàn tất',
    getHTML: (data) => `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">⚠️ Hạn xác nhận sắp hết!</h1>
        </div>

        <div style="padding: 30px; background: #f9fafb;">
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">Xin chào <strong>${data.receiver_name || 'bạn'}</strong>,</p>
          
          <p style="color: #dc2626; font-size: 16px; font-weight: 600; line-height: 1.5;">
            ⚠️ Hạn xác nhận cho bé mèo <strong>${data.pet_name}</strong> sắp hết hoặc đã hết!
          </p>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
            Vui lòng cập nhật tình hình ngay để hoàn tất quy trình giao nhận.
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://meomap.com" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              📱 Cập nhật ngay
            </a>
          </div>
        </div>

        <div style="background: #374151; color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2025 MeoMap</p>
        </div>
      </div>
    `
  },

  receiver_reminder: {
    subject: (data) => `📬 ${data.owner_name} nhắc bạn xác nhận tình hình ${data.pet_name}`,
    preview: 'Chủ bài gửi lời nhắc về bé mèo',
    getHTML: (data) => `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
        <div style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">📬 Lời nhắc từ chủ bài</h1>
        </div>

        <div style="padding: 30px; background: #f9fafb;">
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">Xin chào <strong>${data.receiver_name || 'bạn'}</strong>,</p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            <strong>${data.owner_name}</strong> (chủ bài) vừa gửi cho bạn một lời nhắc về bé mèo <strong>${data.pet_name}</strong>. 📬
          </p>

          <div style="background: #f3e8ff; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="color: #5b21b6; margin: 0; font-weight: 600;">💌 Lời nhắn từ chủ bài</p>
            <p style="color: #5b21b6; margin: 10px 0 0 0; font-size: 14px;">
              Chủ bài mong bạn vào ứng dụng MeoMap để cập nhật tình hình sức khỏe và hành vi của bé mèo.
            </p>
          </div>

          <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
            Hãy vào MeoMap ngay để cập nhật thông tin chi tiết:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://meomap.com" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #a78bfa); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              📱 Cập nhật ngay
            </a>
          </div>
        </div>

        <div style="background: #374151; color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">© 2025 MeoMap</p>
        </div>
      </div>
    `
  }
};
