import { supabase } from '../../supabaseClient';

// 9. TOP-UP (Nạp tiền vào ví)
// ================================================================

/**
 * Tạo yêu cầu nạp tiền vào ví
 * @param {string} userId - ID người dùng
 * @param {number} amount - Số tiền nạp
 * @param {string} paymentMethod - Phương thức thanh toán (default 'payos')
 * @param {string} notes - Ghi chú (optional)
 * @returns {Promise} { success, topupId, orderCode, checkoutUrl, qrCode, error }
 */
export async function createTopupRequest(userId, amount, paymentMethod = 'manual', notes = null) {
  try {
    // MANUAL BANK TRANSFER MODE (PayOS disabled)
    // User transfers to personal bank account
    // Android app reads SMS and confirms automatically
    
    // 1. Create topup request in database
    const { data, error } = await supabase.rpc('create_topup_request', {
      p_user_id: userId,
      p_amount: amount,
      p_payment_method: paymentMethod,
      p_notes: notes,
    });

    if (error) {
      console.error('Error create_topup_request:', error);
      return { success: false, error: error.message };
    }

    const result = data;
    if (!result || !result.success) {
      return { success: false, error: result?.error || 'Không thể tạo yêu cầu nạp tiền' };
    }

    // 2. Get bank account info from environment
    const bankAccount = import.meta.env.VITE_BANK_ACCOUNT_NUMBER || '19073263957014';
    const bankName = import.meta.env.VITE_BANK_NAME || 'Techcombank';
    const accountHolder = import.meta.env.VITE_BANK_ACCOUNT_HOLDER || 'HA THANH TU';
    const orderCode = result.order_code;

    // 3. Generate VietQR code
    let qrCodeUrl = null;
    try {
      const { generateTopupQRCode } = await import('../vietqrService');
      const qrResult = await generateTopupQRCode({
        orderCode,
        amount,
        bankName,
        accountNumber: bankAccount,
      });
      
      if (qrResult.success) {
        qrCodeUrl = qrResult.qrImageUrl;
        
        // Store QR code URL in database
        await supabase.rpc('update_topup_qr_code', {
          p_topup_id: result.topup_id,
          p_qr_code_url: qrCodeUrl,
        });
      }
    } catch (qrError) {
      console.warn('VietQR generation failed, continuing without QR:', qrError);
      // Continue without QR code - not critical
    }

    // 4. Static QR code (alternative - no auto-fill)
    const staticQrUrl = 'https://img.vietqr.io/image/970410-19073263957014-compact2.jpg';

    // 5. Return bank transfer info with QR
    return {
      success: true,
      topupId: result.topup_id,
      orderCode: orderCode,
      amount: result.amount,
      // Bank account info
      bankAccount: bankAccount,
      bankName: bankName,
      accountHolder: accountHolder,
      transferContent: orderCode, // Short code: 6 digits
      qrCodeUrl: qrCodeUrl, // VietQR with embedded transfer details (dynamic)
      staticQrUrl: staticQrUrl, // Static QR (user must enter amount + content manually)
    };

    /* PAYOS CODE - TEMPORARILY DISABLED
    // Import PayOS service dynamically
    const { createPayOSPaymentLink, createMockPaymentLink } = await import('../payosService');
    
    // 2. Create PayOS payment link
    const isDevelopment = !import.meta.env.VITE_PAYOS_API_KEY;
    const paymentResult = isDevelopment
      ? await createMockPaymentLink(result.order_code, amount)
      : await createPayOSPaymentLink(result.order_code, amount, `Nạp tiền vào ví MeoMap - ${result.order_code}`);

    if (!paymentResult.success) {
      return {
        success: false,
        error: paymentResult.error || 'Không thể tạo link thanh toán',
      };
    }

    // 3. Update topup with payment info
    const { error: updateError } = await supabase.rpc('update_topup_payment_info', {
      p_topup_id: result.topup_id,
      p_payment_link_id: paymentResult.data.paymentLinkId,
      p_checkout_url: paymentResult.data.checkoutUrl,
      p_qr_code: paymentResult.data.qrCode,
    });

    if (updateError) {
      console.error('Error updating topup payment info:', updateError);
    }

    // 4. Return complete data
    return {
      success: true,
      topupId: result.topup_id,
      orderCode: result.order_code,
      amount: result.amount,
      checkoutUrl: paymentResult.data.checkoutUrl,
      qrCode: paymentResult.data.qrCode,
    };
    */
  } catch (error) {
    console.error('Lỗi tạo yêu cầu nạp tiền:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy danh sách topup requests của user
 * @param {string} userId - ID người dùng
 * @param {number} limit - Số lượng (default 50)
 * @param {number} offset - Offset (default 0)
 * @returns {Promise} { success, topups, error }
 */
export async function getTopupRequests(userId, limit = 50, offset = 0) {
  try {
    const { data, error } = await supabase.rpc('get_topup_requests', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('Error get_topup_requests:', error);
      return { success: false, error: error.message };
    }

    return { success: true, topups: data || [] };
  } catch (error) {
    console.error('Lỗi lấy danh sách topup:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Hủy yêu cầu nạp tiền
 * @param {string} topupId - ID topup request
 * @param {string} userId - ID người dùng
 * @returns {Promise} { success, error }
 */
export async function cancelTopupRequest(topupId, userId) {
  try {
    const { data, error } = await supabase.rpc('cancel_topup_request', {
      p_topup_id: topupId,
      p_user_id: userId,
    });

    if (error) {
      console.error('Error cancel_topup_request:', error);
      return { success: false, error: error.message };
    }

    const result = data[0];
    return result;
  } catch (error) {
    console.error('Lỗi hủy topup:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Kiểm tra trạng thái thanh toán topup
 * @param {string} orderCode - Mã đơn hàng
 * @returns {Promise} { success, status, data, error }
 */
export async function checkTopupPaymentStatus(orderCode) {
  try {
    const { checkPayOSPaymentStatus } = await import('../payosService');
    return await checkPayOSPaymentStatus(orderCode);
  } catch (error) {
    console.error('Lỗi kiểm tra trạng thái topup:', error);
    return { success: false, error: error.message };
  }
}
