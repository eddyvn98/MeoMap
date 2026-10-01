import { supabase } from '../../supabaseClient';

// 7. VOUCHER CONVERSION (Quy đổi thành voucher)
// ================================================================

/**
 * Quy đổi tiền cọc thành voucher (1:1)
 * @param {string} userId - ID người dùng
 * @param {number} amount - Số tiền cọc cần quy đổi
 * @param {string} voucherCode - Mã voucher cần quy đổi
 * @param {string} note - Ghi chú
 * @returns {Promise} { success, new_balance_coc, voucher_code, user_voucher_id, error }
 */
export async function convertBalanceCocToVoucher(userId, amount, voucherCode, note = null) {
  try {
    const { data, error } = await supabase.rpc('convert_balance_coc_to_voucher', {
      p_user_id: userId,
      p_amount: amount,
      p_voucher_code: voucherCode,
      p_note: note || 'Quy đổi tiền cọc thành voucher',
    });

    if (error) {
      console.error('Error convert_balance_coc_to_voucher:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ...data };
  } catch (error) {
    console.error('Lỗi quy đổi tiền cọc:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Quy đổi tiền thưởng thành voucher (1:1)
 * @param {string} userId - ID người dùng
 * @param {number} amount - Số tiền thưởng cần quy đổi
 * @param {string} voucherCode - Mã voucher cần quy đổi
 * @param {string} note - Ghi chú
 * @returns {Promise} { success, new_balance_thuong, voucher_code, user_voucher_id, error }
 */
export async function convertBalanceThuongToVoucher(userId, amount, voucherCode, note = null) {
  try {
    const { data, error } = await supabase.rpc('convert_balance_thuong_to_voucher', {
      p_user_id: userId,
      p_amount: amount,
      p_voucher_code: voucherCode,
      p_note: note || 'Quy đổi tiền thưởng thành voucher',
    });

    if (error) {
      console.error('Error convert_balance_thuong_to_voucher:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ...data };
  } catch (error) {
    console.error('Lỗi quy đổi tiền thưởng:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy danh sách voucher của user
 * @param {string} userId - ID người dùng
 * @returns {Promise} { success, vouchers, error }
 */
export async function getUserVouchers(userId) {
  try {
    const { data, error } = await supabase.rpc('get_user_vouchers', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error get_user_vouchers:', error);
      return { success: false, error: error.message };
    }

    return { success: true, vouchers: data || [] };
  } catch (error) {
    console.error('Lỗi lấy danh sách voucher:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy danh sách voucher khả dụng (từ bảng vouchers)
 * @returns {Promise} { success, vouchers, error }
 */
export async function getAvailableVouchers() {
  try {
    const { data, error } = await supabase
      .from('vouchers')
      .select('*')
      .order('amount', { ascending: false });

    if (error) {
      console.error('Error getAvailableVouchers:', error);
      return { success: false, error: error.message };
    }

    return { success: true, vouchers: data || [] };
  } catch (error) {
    console.error('Lỗi lấy danh sách voucher:', error);
    return { success: false, error: error.message };
  }
}

// ================================================================
