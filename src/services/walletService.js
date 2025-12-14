/**
 * Wallet Service - API functions cho hệ thống ví
 * Gọi các RPC functions từ Supabase
 */

import { supabase } from '../supabaseClient';

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
// P2P WITHDRAWAL SYSTEM (Binance Model)
// ================================================================

/**
 * Create withdrawal request (P2P)
 * Status: PENDING
 */
export async function createWithdrawalRequestP2P(userId, amount, bankName, bankAccount, accountHolder, notes = null) {
  try {
    const { data, error } = await supabase.rpc('create_withdrawal_request_p2p', {
      p_user_id: userId,
      p_amount: amount,
      p_bank_name: bankName,
      p_bank_account: bankAccount,
      p_account_holder: accountHolder,
      p_notes: notes
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data[0];
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true, orderCode: result.order_code, withdrawalId: result.withdrawal_id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get user's withdrawal requests (P2P)
 */
export async function getWithdrawalRequestsP2P(userId) {
  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, requests: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get single withdrawal detail
 */
export async function getWithdrawalDetailP2P(withdrawalId) {
  try {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, request: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Admin: Get all pending withdrawals
 */
export async function adminGetPendingWithdrawalsP2P(status = null, limit = 50) {
  try {
    let query = supabase
      .from('withdrawal_requests')
      .select(`
        *,
        user:user_id(id, display_name, email),
        admin:admin_id(id, display_name)
      `);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return { success: false, error: error.message };
    return { success: true, requests: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Admin: Approve withdrawal (move from PENDING to WAITING_FOR_ADMIN_PAYMENT)
 */
export async function adminApproveWithdrawalP2P(withdrawalId, adminId, adminNotes = null) {
  try {
    const { data, error } = await supabase.rpc('admin_approve_withdrawal_p2p', {
      p_withdrawal_id: withdrawalId,
      p_admin_id: adminId,
      p_admin_notes: adminNotes
    });

    if (error) return { success: false, error: error.message };
    
    const result = data[0];
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Admin: Confirm payment made (update with trace ID + content)
 * Moves from WAITING_FOR_ADMIN_PAYMENT to AWAITING_USER_CONFIRMATION
 */
export async function adminConfirmPaymentP2P(withdrawalId, traceId, transferContent, transferTime, adminNotes = null) {
  try {
    const { data, error } = await supabase.rpc('admin_confirm_payment_p2p', {
      p_withdrawal_id: withdrawalId,
      p_trace_id: traceId,
      p_transfer_content: transferContent,
      p_transfer_time: transferTime,
      p_admin_notes: adminNotes
    });

    if (error) return { success: false, error: error.message };
    
    const result = data[0];
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * User: Confirm receipt
 * Moves from AWAITING_USER_CONFIRMATION to COMPLETED
 */
export async function userConfirmReceiptP2P(withdrawalId, userId) {
  try {
    const { data, error } = await supabase.rpc('user_confirm_receipt_p2p', {
      p_withdrawal_id: withdrawalId,
      p_user_id: userId
    });

    if (error) return { success: false, error: error.message };
    
    const result = data[0];
    if (!result.success) {
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * User: Open dispute
 */
export async function userOpenDisputeP2P(withdrawalId, userId, reason, proofUrl = null) {
  try {
    const { data, error } = await supabase.rpc('user_open_dispute_p2p', {
      p_withdrawal_id: withdrawalId,
      p_user_id: userId,
      p_reason: reason,
      p_proof_url: proofUrl
    });

    if (error) return { success: false, error: error.message };
    
    const result = data[0];
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    return { success: true, disputeId: result.dispute_id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get withdrawal status display (P2P)
 */
export function getWithdrawalStatusDisplayP2P(status) {
  const statusMap = {
    'PENDING': { text: 'Chờ duyệt', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
    'WAITING_FOR_ADMIN_PAYMENT': { text: 'Admin đang chuyển', color: 'bg-blue-100 text-blue-800', icon: '💳' },
    'AWAITING_USER_CONFIRMATION': { text: 'Chờ bạn xác nhận', color: 'bg-purple-100 text-purple-800', icon: '⏰' },
    'COMPLETED': { text: 'Hoàn thành', color: 'bg-green-100 text-green-800', icon: '✅' },
    'REJECTED': { text: 'Bị từ chối', color: 'bg-red-100 text-red-800', icon: '❌' },
    'DISPUTED': { text: 'Tranh chấp', color: 'bg-red-100 text-red-800', icon: '⚠️' }
  };
  return statusMap[status] || { text: status, color: 'bg-gray-100 text-gray-800', icon: '❓' };
}

/**
 * Generate QR code data for bank transfer
 * VietQR format
 */
export function generateVietQRData(bankAccount, bankCode, amount, orderCode) {
  // Simple format: accountNo|bankCode|amount|message
  // For real implementation, use qrcode library with proper Vietnam bank QR standards
  const message = `PAY ${orderCode}`;
  return {
    accountNo: bankAccount,
    bankCode: bankCode || '970416', // VietCombank default
    amount: amount,
    description: message
  };
}

/**
 * Upload withdrawal proof (image/PDF)
 */
export async function uploadWithdrawalProof(withdrawalId, file, fileType) {
  try {
    const fileName = `withdrawal-proof-${withdrawalId}-${Date.now()}.${fileType === 'pdf' ? 'pdf' : 'jpg'}`;
    const filePath = `withdrawal-proofs/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('meo-map-withdrawals')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    const { data: { publicUrl } } = supabase.storage
      .from('meo-map-withdrawals')
      .getPublicUrl(filePath);

    // Record in withdrawal_proofs table
    const { error: dbError } = await supabase
      .from('withdrawal_proofs')
      .insert({
        withdrawal_id: withdrawalId,
        file_url: publicUrl,
        file_type: fileType
      });

    if (dbError) {
      return { success: false, error: dbError.message };
    }

    return { success: true, fileUrl: publicUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get withdrawal proofs
 */
export async function getWithdrawalProofs(withdrawalId) {
  try {
    const { data, error } = await supabase
      .from('withdrawal_proofs')
      .select('*')
      .eq('withdrawal_id', withdrawalId)
      .order('uploaded_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, proofs: data || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ================================================================
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
// 8. STORE/SHOPPING (Mua hàng)
// ================================================================

/**
 * Mua sản phẩm (có thể dùng voucher hoặc ví)
 * @param {string} userId - ID người dùng
 * @param {string} productId - ID sản phẩm
 * @param {number} quantity - Số lượng (default 1)
 * @param {string} userVoucherId - ID user_voucher để dùng (optional)
 * @param {string} notes - Ghi chú
 * @returns {Promise} { success, purchase_id, total_amount, voucher_used, wallet_used, error }
 */
export async function purchaseProduct(userId, productId, quantity = 1, userVoucherId = null, notes = null) {
  try {
    const { data, error } = await supabase.rpc('purchase_product', {
      p_user_id: userId,
      p_product_id: productId,
      p_quantity: quantity,
      p_user_voucher_id: userVoucherId,
      p_notes: notes,
    });

    if (error) {
      console.error('Error purchase_product:', error);
      return { success: false, error: error.message };
    }

    return { success: true, ...data };
  } catch (error) {
    console.error('Lỗi mua hàng:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy danh sách sản phẩm
 * @param {string} category - Loại sản phẩm (optional: 'service', 'item', etc)
 * @returns {Promise} { success, products, error }
 */
export async function getProducts(category = null) {
  try {
    const { data, error } = await supabase.rpc('get_products', {
      p_category: category,
    });

    if (error) {
      console.error('Error get_products:', error);
      return { success: false, error: error.message };
    }

    return { success: true, products: data || [] };
  } catch (error) {
    console.error('Lỗi lấy danh sách sản phẩm:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy lịch sử mua hàng của user
 * @param {string} userId - ID người dùng
 * @param {number} limit - Số lượng (default 50)
 * @param {number} offset - Offset (default 0)
 * @returns {Promise} { success, purchases, error }
 */
export async function getPurchaseHistory(userId, limit = 50, offset = 0) {
  try {
    const { data, error } = await supabase.rpc('get_purchases', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      console.error('Error get_purchases:', error);
      return { success: false, error: error.message };
    }

    return { success: true, purchases: data || [] };
  } catch (error) {
    console.error('Lỗi lấy lịch sử mua hàng:', error);
    return { success: false, error: error.message };
  }
}

// ================================================================
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
      const { generateTopupQRCode } = await import('./vietqrService');
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
    const { createPayOSPaymentLink, createMockPaymentLink } = await import('./payosService');
    
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
    const { checkPayOSPaymentStatus } = await import('./payosService');
    return await checkPayOSPaymentStatus(orderCode);
  } catch (error) {
    console.error('Lỗi kiểm tra trạng thái topup:', error);
    return { success: false, error: error.message };
  }
}

export default {
  // Balance_COC
  decreaseBalanceCoc,
  increaseBalanceCoc,
  
  // Balance_THUONG
  increaseBalanceThuong,
  
  // Withdrawal
  createWithdrawalRequest,
  getWithdrawalRequests,
  getWithdrawalRequestDetail,
  
  // P2P Withdrawal
  createWithdrawalRequestP2P,
  getWithdrawalRequestsP2P,
  getWithdrawalDetailP2P,
  adminGetPendingWithdrawalsP2P,
  adminApproveWithdrawalP2P,
  adminConfirmPaymentP2P,
  userConfirmReceiptP2P,
  userOpenDisputeP2P,
  uploadWithdrawalProof,
  getWithdrawalProofs,
  
  // Voucher Conversion
  convertBalanceCocToVoucher,
  convertBalanceThuongToVoucher,
  getUserVouchers,
  getAvailableVouchers,
  
  // Store/Shopping
  purchaseProduct,
  getProducts,
  getPurchaseHistory,
  
  // Top-up (Nạp tiền)
  createTopupRequest,
  getTopupRequests,
  cancelTopupRequest,
  checkTopupPaymentStatus,
  
  // Wallet Info
  getUserWallet,
  
  // Transactions
  getWalletTransactions,
  
  // Helpers
  formatVND,
  hasEnoughBalanceCoc,
  hasEnoughBalanceThuong,
  getWithdrawalStatusDisplay,
  getWithdrawalStatusDisplayP2P,
  generateVietQRData,
  
  // Admin
  adminListWithdrawals,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
  adminCompleteWithdrawal,
};
