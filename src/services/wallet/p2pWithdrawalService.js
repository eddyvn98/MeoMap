import { supabase } from '../../supabaseClient';

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
