# 💳 Hệ Thống Nạp Tiền Tự Động (Top-up via PayOS)

## ✅ Tổng Quan

Hệ thống cho phép user **nạp tiền vào Balance_COC** qua cổng thanh toán **PayOS** với:
- ✅ Thanh toán tự động qua chuyển khoản ngân hàng
- ✅ QR Code để quét thanh toán
- ✅ Webhook tự động xác nhận và cộng tiền
- ✅ Lịch sử nạp tiền đầy đủ

---

## 📁 Files Đã Tạo

### 1. **Database Layer**
- `database/topup_migration.sql` - Schema cho bảng `topup_requests`
- `database/topup_functions.sql` - SQL functions:
  - `create_topup_request()` - Tạo yêu cầu nạp tiền
  - `confirm_topup_payment()` - Xác nhận thanh toán từ webhook
  - `cancel_topup_request()` - Hủy yêu cầu
  - `get_topup_requests()` - Lấy danh sách topup
  - `update_topup_payment_info()` - Cập nhật thông tin PayOS

### 2. **Service Layer**
- `src/services/payosService.js` - Tích hợp PayOS API:
  - `createPayOSPaymentLink()` - Tạo payment link
  - `checkPayOSPaymentStatus()` - Kiểm tra trạng thái
  - `verifyPayOSWebhookSignature()` - Xác thực webhook
  - `createMockPaymentLink()` - Mock cho development

- `src/services/walletService.js` - Thêm 4 functions mới:
  - `createTopupRequest()` - Tạo topup + PayOS link
  - `getTopupRequests()` - Lấy lịch sử topup
  - `cancelTopupRequest()` - Hủy topup
  - `checkTopupPaymentStatus()` - Check status

### 3. **UI Components**
- `src/components/TopUpModal.jsx` - Modal nạp tiền:
  - Chọn số tiền preset hoặc custom
  - Hiển thị QR code PayOS
  - Link thanh toán
  - Hướng dẫn chi tiết

- `src/pages/MyWalletPage.jsx` - Thêm:
  - Nút "➕ Nạp Tiền" ở Balance_COC card
  - Tích hợp TopUpModal

---

## 🗄️ Database Schema

### Bảng `topup_requests`

```sql
CREATE TABLE topup_requests (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Payment info
  amount INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'payos',
  
  -- PayOS data
  order_code TEXT UNIQUE, -- TOPUP-YYYYMMDD-XXXXX
  payment_link_id TEXT,
  checkout_url TEXT,
  qr_code TEXT, -- Base64 image
  
  -- Status tracking
  status TEXT DEFAULT 'pending', -- pending | processing | success | cancelled | failed
  
  -- Timestamps
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Transaction tracking
  transaction_id TEXT, -- From PayOS webhook
  payment_description TEXT,
  
  notes TEXT,
  metadata JSONB
);
```

### Indexes
- `user_id` - Tra cứu theo user
- `status` - Filter theo trạng thái
- `order_code` - Lookup từ webhook
- `created_at DESC` - Sắp xếp lịch sử

---

## 🔄 Flow Hoạt Động

### **User Flow (Frontend)**

```
1. User nhấn "➕ Nạp Tiền" trong MyWalletPage
   ↓
2. TopUpModal hiển thị:
   - Chọn số tiền (50k, 100k, 200k, 500k, 1M)
   - Hoặc nhập custom amount
   ↓
3. User nhấn "Nạp Tiền"
   ↓
4. Frontend gọi createTopupRequest(userId, amount)
   ↓
5. Hiển thị:
   - QR Code PayOS
   - Link thanh toán
   - Mã giao dịch (TOPUP-YYYYMMDD-XXXXX)
   ↓
6. User quét QR hoặc mở link
   ↓
7. Thanh toán qua ngân hàng
   ↓
8. PayOS webhook tự động gọi backend
   ↓
9. Backend xác nhận → Cộng tiền vào Balance_COC
   ↓
10. User thấy tiền đã vào ví
```

### **Backend Flow (SQL + Webhook)**

```
1. create_topup_request(user_id, amount)
   - Generate order_code (TOPUP-20251214-123456)
   - Insert vào topup_requests (status = 'pending')
   - Return order_code
   ↓
2. Frontend gọi PayOS API
   - createPayOSPaymentLink(order_code, amount)
   - Nhận: payment_link_id, checkout_url, qr_code
   ↓
3. update_topup_payment_info(topup_id, payment_data)
   - Lưu PayOS data vào DB
   - Update status = 'processing'
   ↓
4. User thanh toán xong
   ↓
5. PayOS gọi webhook → Backend endpoint
   ↓
6. Backend verify signature
   ↓
7. confirm_topup_payment(order_code, transaction_id)
   - Lock topup_requests row
   - Update status = 'success'
   - UPDATE profiles SET balance_coc += amount
   - Insert wallet_transactions log
   - Update paid_at, confirmed_at
   ↓
8. Return success
```

---

## ⚙️ Cấu Hình PayOS

### Environment Variables (.env.local)

```env
# PayOS Credentials
VITE_PAYOS_CLIENT_ID=your_client_id
VITE_PAYOS_API_KEY=your_api_key
VITE_PAYOS_CHECKSUM_KEY=your_checksum_key

# PayOS URLs
VITE_PAYOS_API_URL=https://api-merchant.payos.vn/v2
VITE_PAYOS_WEBHOOK_URL=https://your-domain.com/api/payos-webhook
VITE_PAYOS_RETURN_URL=https://your-domain.com/wallet?topup=success
VITE_PAYOS_CANCEL_URL=https://your-domain.com/wallet?topup=cancelled
```

### Lấy PayOS Credentials

1. Đăng ký tài khoản tại: https://payos.vn
2. Vào Dashboard → Settings → API Keys
3. Copy: Client ID, API Key, Checksum Key
4. Paste vào `.env.local`

---

## 🔌 Webhook Endpoint

### Backend Endpoint (Express.js example)

```javascript
// server.js hoặc api/payos-webhook.js

import { supabase } from './supabaseClient';
import { verifyPayOSWebhookSignature } from './services/payosService';

app.post('/api/payos-webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    const signature = req.headers['x-signature'];

    // 1. Verify signature
    const isValid = await verifyPayOSWebhookSignature(webhookData, signature);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2. Check payment success
    if (webhookData.code === '00' && webhookData.success === true) {
      // 3. Call confirm_topup_payment
      const { data, error } = await supabase.rpc('confirm_topup_payment', {
        p_order_code: `TOPUP-${webhookData.orderCode}`,
        p_transaction_id: webhookData.transactionId || webhookData.orderCode,
        p_payment_description: webhookData.desc || 'Nạp tiền thành công qua PayOS',
      });

      if (error) {
        console.error('Error confirming topup:', error);
        return res.status(500).json({ error: 'Failed to confirm topup' });
      }

      const result = data[0];
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // 4. Return success
      return res.json({ success: true, message: 'Topup confirmed' });
    } else {
      // Payment failed or cancelled
      return res.json({ success: false, message: 'Payment not successful' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Supabase Edge Function Alternative

```typescript
// supabase/functions/payos-webhook/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const webhookData = await req.json();
  const signature = req.headers.get('x-signature');

  // Verify signature here...

  if (webhookData.code === '00' && webhookData.success) {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase.rpc('confirm_topup_payment', {
      p_order_code: `TOPUP-${webhookData.orderCode}`,
      p_transaction_id: webhookData.transactionId,
      p_payment_description: webhookData.desc,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: false }), { status: 200 });
});
```

---

## 🚀 Triển Khai (Deployment)

### Bước 1: Chạy Database Migrations

```bash
# Trong Supabase SQL Editor:
1. Chạy database/topup_migration.sql
2. Chạy database/topup_functions.sql
```

### Bước 2: Cấu Hình PayOS

```bash
# Thêm vào .env.local
VITE_PAYOS_CLIENT_ID=...
VITE_PAYOS_API_KEY=...
VITE_PAYOS_CHECKSUM_KEY=...
```

### Bước 3: Deploy Webhook Endpoint

**Option A: Express Backend**
```bash
npm install express
node server.js
# Deploy lên Heroku/Railway/Render
```

**Option B: Supabase Edge Function**
```bash
supabase functions deploy payos-webhook
# Update webhook URL trong PayOS dashboard
```

### Bước 4: Cấu Hình Webhook trong PayOS

1. Vào PayOS Dashboard → Webhooks
2. Thêm webhook URL: `https://your-domain.com/api/payos-webhook`
3. Chọn events: `payment.success`, `payment.failed`
4. Lưu lại

### Bước 5: Test

```bash
# Development mode (mock payment)
npm run dev

# Production mode (real payment)
npm run build
npm run preview
```

---

## 🧪 Testing

### Test Flow User

1. Vào `/my-wallet`
2. Nhấn "➕ Nạp Tiền"
3. Chọn 50,000đ
4. Nhấn "Nạp Tiền"
5. Kiểm tra QR code hiển thị
6. (Development) Mock payment sẽ không thực tế thanh toán
7. (Production) Quét QR → Thanh toán → Webhook tự động

### Test Webhook Locally

```bash
# Dùng ngrok để expose local server
ngrok http 3000

# Copy ngrok URL vào PayOS webhook settings
# Test payment → Xem webhook log
```

---

## 📊 Monitoring & Logs

### Kiểm tra topup requests

```sql
-- Xem tất cả topup
SELECT * FROM topup_requests ORDER BY created_at DESC LIMIT 20;

-- Topup đang pending
SELECT * FROM topup_requests WHERE status = 'pending';

-- Topup thành công hôm nay
SELECT * FROM topup_requests 
WHERE status = 'success' 
AND DATE(created_at) = CURRENT_DATE;

-- Tổng tiền nạp trong tháng
SELECT SUM(amount) as total_topup
FROM topup_requests
WHERE status = 'success'
AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);
```

---

## 🔒 Security

### 1. Webhook Signature Verification
- ✅ Mọi webhook phải verify signature trước khi xử lý
- ✅ Dùng SHA256 hash với checksum key

### 2. Database Security
- ✅ RLS policies cho topup_requests
- ✅ User chỉ xem được topup của mình
- ✅ Webhook dùng service role key (bypass RLS)

### 3. Amount Validation
- ✅ Min: 10,000đ
- ✅ Max: 50,000,000đ (có thể điều chỉnh)
- ✅ Kiểm tra ở cả frontend và backend

### 4. Idempotency
- ✅ `order_code` UNIQUE → Không thể confirm 2 lần
- ✅ Check status trước khi update

---

## 🐛 Troubleshooting

### Lỗi: "Hệ thống thanh toán chưa được cấu hình"
**Nguyên nhân:** Thiếu PayOS credentials trong `.env.local`  
**Giải pháp:** Thêm `VITE_PAYOS_CLIENT_ID`, `VITE_PAYOS_API_KEY`, `VITE_PAYOS_CHECKSUM_KEY`

### Lỗi: "Không thể tạo link thanh toán"
**Nguyên nhân:** PayOS API trả lỗi  
**Giải pháp:** 
- Check API key còn valid không
- Check network connection
- Xem log PayOS response

### Lỗi: Webhook không được gọi
**Nguyên nhân:** Webhook URL không public hoặc sai  
**Giải pháp:**
- Dùng ngrok cho local testing
- Check webhook URL trong PayOS dashboard
- Verify firewall không block

### Tiền không vào ví sau thanh toán
**Nguyên nhân:** Webhook xử lý lỗi hoặc signature invalid  
**Giải pháp:**
- Check webhook logs
- Verify signature calculation
- Check database function `confirm_topup_payment`

---

## 📋 Checklist Deploy

- [ ] Chạy `topup_migration.sql` trong Supabase
- [ ] Chạy `topup_functions.sql` trong Supabase
- [ ] Thêm PayOS credentials vào `.env.local`
- [ ] Deploy webhook endpoint (Express hoặc Edge Function)
- [ ] Cấu hình webhook URL trong PayOS dashboard
- [ ] Test payment flow trong development
- [ ] Test payment flow trong production
- [ ] Setup monitoring cho webhook logs
- [ ] Document webhook endpoint cho team

---

## 🎯 Next Steps (Optional)

1. **Admin Dashboard:**
   - Xem tất cả topup requests
   - Filter by status, date range
   - Export CSV reports

2. **Email Notifications:**
   - Gửi email khi topup thành công
   - Receipt với transaction details

3. **Refund System:**
   - Admin có thể refund topup
   - Trừ lại Balance_COC

4. **Multiple Payment Providers:**
   - Thêm VNPay, MoMo
   - User chọn provider

5. **Promotion/Bonus:**
   - Nạp 100k → Tặng 10k
   - First-time topup bonus

---

## 📞 Support

- PayOS Docs: https://docs.payos.vn
- PayOS Support: support@payos.vn
- MeoMap Team: [Your contact]

---

**Status:** ✅ Ready to Deploy  
**Last Updated:** 2025-01-14  
**Version:** 1.0.0
