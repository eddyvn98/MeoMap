/**
 * Wallet Service - API functions cho hệ thống ví
 * Gọi các RPC functions từ Supabase
 */

import { supabase } from '../../supabaseClient';

// ================================================================
// 1. QUẢN LÝ BALANCE_COC (Cọc)
// ================================================================

/**
 * Giảm balance_coc khi nộp cọc
 * @param {string} userId - ID người dùng
 * @param {number} amount - Số tiền cọc
 * @param {string} depositId - ID giao dịch cọc
 * @param {string} note - Ghi chú
 * @returns {Promise} { success, new_balance_coc, error }
 */
export async function decreaseBalanceCoc(userId, amount, depositId = null, note = null) {
  try {
    const { data, error } = await supabase.rpc('decrease_balance_coc', {
      p_user_id: userId,
      p_amount: amount,
      p_deposit_id: depositId,
      p_note: note || `Nộp cọc để nhận nuôi mèo`,
    });

    if (error) {
      console.error('Error decrease_balance_coc:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ...data };
  } catch (error) {
    console.error('Lỗi giảm balance_coc:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Tăng balance_coc khi hoàn cọc
 * @param {string} userId - ID người dùng
 * @param {number} amount - Số tiền hoàn lại
 * @param {string} depositId - ID giao dịch cọc
 * @param {string} note - Ghi chú
 * @returns {Promise} { success, new_balance_coc, error }
 */
export async function increaseBalanceCoc(userId, amount, depositId = null, note = null) {
  try {
    const { data, error } = await supabase.rpc('increase_balance_coc', {
      p_user_id: userId,
      p_amount: amount,
      p_deposit_id: depositId,
      p_note: note || `Hoàn cọc nhận nuôi mèo`,
    });

    if (error) {
      console.error('Error increase_balance_coc:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ...data };
  } catch (error) {
    console.error('Lỗi tăng balance_coc:', error);
    return { success: false, error: error.message };
  }
}

// ================================================================
// 2. QUẢN LÝ BALANCE_THUONG (Thưởng)
// ================================================================

/**
 * Tăng balance_thuong khi nhận thưởng (Lost/Rescue)
 * @param {string} userId - ID người dùng
 * @param {number} amount - Số tiền thưởng
 * @param {string} source - Nguồn: 'bounty', 'rescue', 'event'
 * @param {string} relatedId - ID liên quan (pet_id, case_id, etc)
 * @param {string} note - Ghi chú
 * @returns {Promise} { success, new_balance_thuong, error }
 */
export async function increaseBalanceThuong(userId, amount, source = 'bounty', relatedId = null, note = null) {
  try {
    const { data, error } = await supabase.rpc('increase_balance_thuong', {
      p_user_id: userId,
      p_amount: amount,
      p_source: source,
      p_related_id: relatedId,
      p_note: note || `Nhận thưởng từ ${source}`,
    });

    if (error) {
      console.error('Error increase_balance_thuong:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ...data };
  } catch (error) {
    console.error('Lỗi tăng balance_thuong:', error);
    return { success: false, error: error.message };
  }
}

// ================================================================
