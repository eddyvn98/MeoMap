/**
 * PayOS Integration Service
 * Tích hợp cổng thanh toán PayOS cho nạp tiền vào ví
 */

const PAYOS_API_URL = import.meta.env.VITE_PAYOS_API_URL || 'https://api-merchant.payos.vn/v2';
const PAYOS_CLIENT_ID = import.meta.env.VITE_PAYOS_CLIENT_ID;
const PAYOS_API_KEY = import.meta.env.VITE_PAYOS_API_KEY;
const PAYOS_CHECKSUM_KEY = import.meta.env.VITE_PAYOS_CHECKSUM_KEY;

// URL webhook để nhận callback từ PayOS
const WEBHOOK_URL = import.meta.env.VITE_PAYOS_WEBHOOK_URL || 'https://your-domain.com/api/payos-webhook';

// Return URL sau khi thanh toán
const RETURN_URL = import.meta.env.VITE_PAYOS_RETURN_URL || 'https://your-domain.com/wallet?topup=success';
const CANCEL_URL = import.meta.env.VITE_PAYOS_CANCEL_URL || 'https://your-domain.com/wallet?topup=cancelled';

/**
 * Tạo payment link PayOS cho topup
 * @param {string} orderCode - Mã đơn hàng (TOPUP-YYYYMMDD-XXXXX)
 * @param {number} amount - Số tiền (VND)
 * @param {string} description - Mô tả giao dịch
 * @returns {Promise<{success: boolean, data?: object, error?: string}>}
 */
export async function createPayOSPaymentLink(orderCode, amount, description = 'Nạp tiền vào ví MeoMap') {
  try {
    // Validate env variables
    if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY || !PAYOS_CHECKSUM_KEY) {
      console.error('PayOS credentials not configured');
      return {
        success: false,
        error: 'Hệ thống thanh toán chưa được cấu hình. Vui lòng liên hệ admin.',
      };
    }

    // Build request body
    const requestBody = {
      orderCode: parseInt(orderCode.replace(/\D/g, '')), // PayOS yêu cầu orderCode là số
      amount: amount,
      description: description,
      returnUrl: RETURN_URL,
      cancelUrl: CANCEL_URL,
      webhookUrl: WEBHOOK_URL,
    };

    // Calculate checksum (nếu PayOS yêu cầu)
    // Công thức: SHA256(amount + cancelUrl + description + orderCode + returnUrl + checksumKey)
    const checksumData = `${amount}${CANCEL_URL}${description}${requestBody.orderCode}${RETURN_URL}${PAYOS_CHECKSUM_KEY}`;
    const checksum = await generateSHA256(checksumData);
    requestBody.signature = checksum;

    // Call PayOS API
    const response = await fetch(`${PAYOS_API_URL}/payment-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': PAYOS_CLIENT_ID,
        'x-api-key': PAYOS_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok || result.code !== '00') {
      console.error('PayOS API error:', result);
      return {
        success: false,
        error: result.desc || 'Không thể tạo link thanh toán',
      };
    }

    // Return payment data
    return {
      success: true,
      data: {
        paymentLinkId: result.data.paymentLinkId,
        checkoutUrl: result.data.checkoutUrl,
        qrCode: result.data.qrCode, // Base64 QR code image
        orderCode: orderCode,
        amount: amount,
      },
    };
  } catch (error) {
    console.error('Error creating PayOS payment link:', error);
    return {
      success: false,
      error: error.message || 'Có lỗi xảy ra khi tạo link thanh toán',
    };
  }
}

/**
 * Kiểm tra trạng thái thanh toán từ PayOS
 * @param {string} orderCode - Mã đơn hàng
 * @returns {Promise<{success: boolean, status?: string, data?: object, error?: string}>}
 */
export async function checkPayOSPaymentStatus(orderCode) {
  try {
    if (!PAYOS_CLIENT_ID || !PAYOS_API_KEY) {
      return {
        success: false,
        error: 'Hệ thống thanh toán chưa được cấu hình',
      };
    }

    const numericOrderCode = parseInt(orderCode.replace(/\D/g, ''));

    const response = await fetch(`${PAYOS_API_URL}/payment-requests/${numericOrderCode}`, {
      method: 'GET',
      headers: {
        'x-client-id': PAYOS_CLIENT_ID,
        'x-api-key': PAYOS_API_KEY,
      },
    });

    const result = await response.json();

    if (!response.ok || result.code !== '00') {
      return {
        success: false,
        error: result.desc || 'Không thể kiểm tra trạng thái',
      };
    }

    return {
      success: true,
      status: result.data.status, // 'PENDING', 'PAID', 'CANCELLED', 'EXPIRED'
      data: result.data,
    };
  } catch (error) {
    console.error('Error checking PayOS status:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Verify webhook signature từ PayOS
 * @param {object} webhookData - Data từ webhook
 * @param {string} signature - Signature từ header
 * @returns {Promise<boolean>}
 */
export async function verifyPayOSWebhookSignature(webhookData, signature) {
  try {
    if (!PAYOS_CHECKSUM_KEY) return false;

    // Build checksum string theo định dạng PayOS
    const checksumData = `${webhookData.amount}${webhookData.code}${webhookData.desc}${webhookData.orderCode}${webhookData.success}${PAYOS_CHECKSUM_KEY}`;
    const calculatedSignature = await generateSHA256(checksumData);

    return calculatedSignature === signature;
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Generate SHA256 hash
 * @param {string} data - Data to hash
 * @returns {Promise<string>}
 */
async function generateSHA256(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Mock function cho development (khi chưa có API key)
 */
export async function createMockPaymentLink(orderCode, amount) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    success: true,
    data: {
      paymentLinkId: `mock_${orderCode}`,
      checkoutUrl: `https://pay.payos.vn/mock/${orderCode}`,
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', // 1x1 transparent PNG
      orderCode: orderCode,
      amount: amount,
    },
  };
}
