import { supabase } from '../../supabaseClient';

// 4. QUẢN LÝ VÍ (User Wallet Info)
// ================================================================

/**
 * Lấy thông tin ví của user (balance_main + balance_coc + balance_thuong)
 * @param {string} userId - ID người dùng
 * @returns {Promise} { success, wallet, error }
 */
export async function getUserWallet(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('balance_main, balance_coc, balance_thuong')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching wallet:', error);
      return {
        success: false,
        error: error.message,
        wallet: { balance_main: 0, balance_coc: 0, balance_thuong: 0 },
      };
    }

    return {
      success: true,
      wallet: {
        balance_main: data?.balance_main || 0,
        balance_coc: data?.balance_coc || 0,
        balance_thuong: data?.balance_thuong || 0,
      },
    };
  } catch (error) {
    console.error('Lỗi lấy thông tin ví:', error);
    return {
      success: false,
      error: error.message,
      wallet: { balance_main: 0, balance_coc: 0, balance_thuong: 0 },
    };
  }
}

// ================================================================
// 5. LỊCH SỬ GIAO DỊCH (Transaction History)
// ================================================================

/**
 * Lấy lịch sử giao dịch của user
 * @param {string} userId - ID người dùng
 * @param {string} sourceType - 'coc' | 'thuong' | null (tất cả)
 * @param {number} limit - Số lượng (default 50)
 * @returns {Promise} { success, transactions, error }
 */
export async function getWalletTransactions(userId, sourceType = null, limit = 50) {
  try {
    let query = supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
      return { success: false, error: error.message, transactions: [] };
    }

    return { success: true, transactions: data || [] };
  } catch (error) {
    console.error('Lỗi lấy lịch sử giao dịch:', error);
    return { success: false, error: error.message, transactions: [] };
  }
}

// ================================================================
// 6. HELPER FUNCTIONS
// ================================================================

/**
 * Format tiền VND
 * @param {number} amount - Số tiền
 * @returns {string} "1.000.000 đ"
 */
export function formatVND(amount) {
  if (!amount) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

/**
 * Kiểm tra đủ tiền cọc để nộp
 * @param {number} balanceCoc - Số dư cọc hiện tại
 * @param {number} amountNeeded - Số tiền cần nộp
 * @returns {boolean}
 */
export function hasEnoughBalanceCoc(balanceCoc, amountNeeded) {
  return balanceCoc >= amountNeeded;
}

/**
 * Kiểm tra đủ tiền thưởng để rút
 * @param {number} balanceThuong - Số dư thưởng hiện tại
 * @param {number} amountToWithdraw - Số tiền muốn rút
 * @returns {boolean}
 */
export function hasEnoughBalanceThuong(balanceThuong, amountToWithdraw) {
  return balanceThuong >= amountToWithdraw;
}

/**
 * Lấy status display text cho withdrawal request
 * @param {string} status - pending | approved | completed | rejected
 * @returns {object} { text, color, icon }
 */
export function getWithdrawalStatusDisplay(status) {
  const statusMap = {
    pending: {
      text: 'Đang chờ duyệt',
      color: 'bg-yellow-100 text-yellow-800',
      icon: '⏳',
    },
    approved: {
      text: 'Đã duyệt',
      color: 'bg-blue-100 text-blue-800',
      icon: '✅',
    },
    completed: {
      text: 'Hoàn tất',
      color: 'bg-green-100 text-green-800',
      icon: '🎉',
    },
    rejected: {
      text: 'Từ chối',
      color: 'bg-red-100 text-red-800',
      icon: '❌',
    },
  };

  return statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800', icon: 'ℹ️' };
}

// ================================================================
