import { supabase } from '../../supabaseClient';

// 3. RÚT TIỀN (Withdrawal)
// ================================================================

/**
 * Tạo yêu cầu rút tiền thủ công
 * @param {string} userId - ID người dùng
 * @param {number} amount - Số tiền muốn rút
 * @param {string} bankAccount - Số tài khoản ngân hàng
 * @param {string} bankName - Tên ngân hàng (optional)
 * @param {string} accountHolder - Tên chủ tài khoản (optional)
 * @returns {Promise} { success, request_id, error }
 */
export async function createWithdrawalRequest(userId, amount, bankAccount, bankName = null, accountHolder = null) {
  try {
    // Kiểm tra input
    if (!amount || amount < 10000) {
      return {
        success: false,
        error: 'Số tiền tối thiểu là 10.000 VND',
      };
    }

    const { data, error } = await supabase.rpc('create_withdrawal_request', {
      p_user_id: userId,
      p_amount: amount,
      p_bank_account: bankAccount,
      p_bank_name: bankName,
      p_account_holder: accountHolder,
    });

    if (error) {
      console.error('Error create_withdrawal_request:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ...data };
  } catch (error) {
    console.error('Lỗi tạo yêu cầu rút tiền:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy danh sách withdrawal requests của user
 * @param {string} userId - ID người dùng
 * @returns {Promise} { success, requests, error }
 */
export async function getWithdrawalRequests(userId) {
  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching withdrawal requests:', error);
      return { success: false, error: error.message };
    }

    return { success: true, requests: data || [] };
  } catch (error) {
    console.error('Lỗi lấy danh sách withdrawal:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy chi tiết 1 withdrawal request
 * @param {string} requestId - ID withdrawal request
 * @returns {Promise} { success, request, error }
 */
export async function getWithdrawalRequestDetail(requestId) {
  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error) {
      console.error('Error fetching withdrawal request detail:', error);
      return { success: false, error: error.message };
    }

    return { success: true, request: data };
  } catch (error) {
    console.error('Lỗi lấy chi tiết withdrawal:', error);
    return { success: false, error: error.message };
  }
}

// ================================================================

// 7. ADMIN FUNCTIONS (Approve/Reject Withdrawals)
// ================================================================

/**
 * Admin: lấy tất cả yêu cầu rút tiền (có thể lọc theo trạng thái)
 */
export async function adminListWithdrawals(status = null, limit = 100) {
  try {
    let query = supabase
      .from('withdrawal_requests')
      .select('*')
      .order('requested_at', { ascending: false })
      .limit(limit);

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message, requests: [] };
    return { success: true, requests: data || [] };
  } catch (error) {
    return { success: false, error: error.message, requests: [] };
  }
}

/**
 * Admin: duyệt yêu cầu rút tiền (gọi RPC approve_withdrawal_request)
 */
export async function adminApproveWithdrawal(requestId, adminNote = null) {
  try {
    const { data, error } = await supabase.rpc('approve_withdrawal_request', {
      p_request_id: requestId,
      p_admin_note: adminNote,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, ...data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Admin: từ chối yêu cầu rút tiền
 */
export async function adminRejectWithdrawal(requestId, adminNote = null) {
  try {
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'rejected', admin_note: adminNote, processed_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('status', 'pending');
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Admin: đánh dấu hoàn tất sau khi đã chuyển khoản
 */
export async function adminCompleteWithdrawal(requestId, adminNote = null) {
  try {
    const { error } = await supabase
      .from('withdrawal_requests')
      .update({ status: 'completed', admin_note: adminNote, processed_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('status', 'approved');
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ================================================================
