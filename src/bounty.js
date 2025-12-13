/**
 * Bounty functions - Tiền treo thưởng / hỗ trợ ban đầu
 * Để thu hút người cứu
 */

import { supabase } from "./supabaseClient";

/**
 * Treo thưởng mới
 * @param {string} caseId - ID ca cứu hộ
 * @param {number} amount - Số tiền (VND)
 * @param {string} userId - ID người treo (nullable = ẩn danh)
 * @param {string} caseOwnerId - ID chủ bài (để kiểm tra)
 */
export async function createBounty({ caseId, amount, userId = null, caseOwnerId = null }) {
  try {
    // 1. Kiểm tra đăng nhập - KHÔNG CHO PHÉP TẠO BOUNTY KHI CHƯA ĐĂNG NHẬP
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { 
        success: false, 
        error: "Bạn phải đăng nhập để treo thưởng" 
      };
    }

    // 2. KIỂM TRA NẾU NGƯỜI TREO LÀ CHỦ BÀI
    if (caseOwnerId && user.id === caseOwnerId) {
      return {
        success: false,
        error: "❌ Chủ bài không thể treo thưởng cho bài của chính mình"
      };
    }

    // 3. Kiểm tra số dư ví balance_thuong
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("balance_thuong")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return { 
        success: false, 
        error: "Không thể kiểm tra số dư ví" 
      };
    }

    const currentBalance = profile?.balance_thuong || 0;

    if (currentBalance < amount) {
      return { 
        success: false, 
        error: `Số dư ví không đủ. Số dư hiện tại: ${currentBalance.toLocaleString()}đ, cần: ${amount.toLocaleString()}đ. Vui lòng nạp tiền vào ví trước.` 
      };
    }

    // 4. Trừ tiền từ ví balance_thuong
    const { error: updateError } = await supabase.rpc('decrease_balance_thuong', {
      p_user_id: user.id,
      p_amount: amount,
      p_case_id: caseId,
      p_note: `Treo thưởng cho ca ${caseId}`
    });

    if (updateError) {
      console.error("Error decreasing balance_thuong:", updateError);
      return { 
        success: false, 
        error: "Không thể trừ tiền từ ví. Vui lòng thử lại." 
      };
    }

    // 5. Tạo bounty record với userId của người đăng nhập
    const { data: bounty, error } = await supabase
      .from("bounties")
      .insert({
        case_id: caseId,
        user_id: userId || user.id, // Nếu không ẩn danh thì dùng user.id
        amount,
        status: "available",
      })
      .select()
      .single();

    if (error) {
      // Nếu tạo bounty thất bại, hoàn lại tiền
      await supabase.rpc('increase_balance_thuong', {
        p_user_id: user.id,
        p_amount: amount,
        p_source: 'refund',
        p_related_id: caseId,
        p_note: `Hoàn tiền do lỗi tạo bounty cho ca ${caseId}`
      });
      throw error;
    }

    return { success: true, bounty };
  } catch (error) {
    console.error("Error creating bounty:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy tất cả bounties của một ca
 * @param {string} caseId - ID ca cứu hộ
 */
export async function getBountiesForCase(caseId) {
  try {
    const { data: bounties, error } = await supabase
      .from("bounties")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, bounties };
  } catch (error) {
    console.error("Error fetching bounties:", error);
    return { success: false, error: error.message, bounties: [] };
  }
}

/**
 * Tính tổng tiền treo + số người
 * @param {string} caseId - ID ca cứu hộ
 */
export async function getBountyStats(caseId) {
  try {
    const { data: bounties, error } = await supabase
      .from("bounties")
      .select("amount, user_id, status")
      .eq("case_id", caseId);

    if (error) throw error;

    const availableBounties = bounties.filter((b) => b.status === "available");
    const totalAvailable = availableBounties.reduce((sum, b) => sum + b.amount, 0);
    const availableCount = new Set(
      availableBounties.map((b) => b.user_id || "anonymous")
    ).size;

    const acceptedBounties = bounties.filter((b) => b.status === "accepted");
    const totalAccepted = acceptedBounties.reduce((sum, b) => sum + b.amount, 0);

    return {
      success: true,
      stats: {
        totalAvailable, // Tiền đang treo chưa nhận
        availableCount, // Số người treo
        totalAccepted, // Tiền đã nhận (người cứu đã nhận)
        allBounties: bounties,
      },
    };
  } catch (error) {
    console.error("Error fetching bounty stats:", error);
    return { success: false, error: error.message, stats: null };
  }
}

/**
 * Người cứu NHẬN thưởng
 * @param {string} bountiesIds - Array of bounty IDs to accept
 */
export async function acceptBounties(bountiesIds) {
  try {
    const { error } = await supabase
      .from("bounties")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .in("id", bountiesIds);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error accepting bounties:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Người cứu TỪ CHỐI thưởng (hoàn lại)
 * @param {string} bountyId - ID thưởng cần từ chối
 * @param {string} reason - Lý do từ chối
 */
export async function rejectBounty(bountyId, reason = "") {
  try {
    const { error } = await supabase
      .from("bounties")
      .update({
        status: "rejected",
        reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bountyId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error rejecting bounty:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Khi bài đóng ca → chuyển tất cả bounties đã nhận cho người cứu
 * & hoàn lại những bounties chưa nhận
 * @param {string} caseId - ID ca cứu hộ
 * @param {string} rescuerId - ID người cứu (để biết ai nhận tiền)
 */
export async function finalizeBounties(caseId, rescuerId) {
  try {
    // 1. Lấy tất cả bounties
    const { data: bounties, error: fetchError } = await supabase
      .from("bounties")
      .select("*")
      .eq("case_id", caseId);

    if (fetchError) throw fetchError;

    // 2. Tính tổng tiền đã nhận + tiền chưa nhận
    const acceptedBounties = bounties.filter((b) => b.status === "accepted");
    const totalAccepted = acceptedBounties.reduce((sum, b) => sum + b.amount, 0);

    // 3. Transfer tiền đã nhận cho rescuer
    if (totalAccepted > 0) {
      const { error: txnError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: rescuerId,
          case_id: caseId,
          amount: totalAccepted,
          type: "bounty_payout",
          description: `Nhận thưởng từ ca cứu hộ ${caseId}`,
          created_at: new Date().toISOString(),
        });

      if (txnError) console.warn("Warning: Could not record bounty transaction", txnError);
    }

    // 4. Mark accepted bounties as transferred
    const { error: updateError } = await supabase
      .from("bounties")
      .update({
        status: "transferred",
        updated_at: new Date().toISOString(),
      })
      .in("id", acceptedBounties.map((b) => b.id));

    if (updateError) throw updateError;

    // 5. Mark unaccepted bounties as refunded (chưa implement refund logic)
    const unacceptedBounties = bounties.filter(
      (b) => b.status === "available" || b.status === "rejected"
    );
    if (unacceptedBounties.length > 0) {
      const { error: refundError } = await supabase
        .from("bounties")
        .update({
          status: "refunded",
          reason: "Ca cứu hộ đã kết thúc. Tiền hoàn lại.",
          updated_at: new Date().toISOString(),
        })
        .in("id", unacceptedBounties.map((b) => b.id));

      if (refundError) console.warn("Warning: Could not mark bounties as refunded", refundError);
    }

    return { success: true, totalTransferred: totalAccepted };
  } catch (error) {
    console.error("Error finalizing bounties:", error);
    return { success: false, error: error.message };
  }
}
