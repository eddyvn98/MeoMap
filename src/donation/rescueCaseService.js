import { supabase } from '../supabaseClient';

export async function getDonationStats(caseId) {
  try {
    const { data: donations, error } = await supabase
      .from("donations")
      .select("amount, user_id, method")
      .eq("case_id", caseId)
      .eq("method", "system");

    if (error) throw error;

    const totalDonated = donations.reduce((sum, d) => sum + (d.amount || 0), 0);
    const donorCount = new Set(
      donations.map((d) => d.user_id || "anonymous")
    ).size;
    const directCount = donations.filter((d) => d.method === "direct").length;
    const systemCount = donations.filter((d) => d.method === "system").length;

    return {
      success: true,
      stats: {
        totalDonated,
        donorCount,
        directCount,
        systemCount,
      },
    };
  } catch (error) {
    console.error("Error fetching donation stats:", error);
    return { success: false, error: error.message, stats: null };
  }
}

/**
 * Lấy wallet balance
 * @param {string} caseId - ID của bài đăng rescue
 */
export async function getCaseWalletBalance(caseId) {
  try {
    const { data: wallet, error } = await supabase
      .from("case_wallet")
      .select("balance")
      .eq("case_id", caseId)
      .maybeSingle();

    if (error) throw error;

    // If wallet row chưa tồn tại, trả về 0 thay vì lỗi
    return { success: true, balance: wallet?.balance || 0 };
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    return { success: false, error: error.message, balance: 0 };
  }
}

/**
 * Kết thúc ca cứu hộ
 * - Freeze tổng tiền
 * - Transfer toàn bộ tiền từ ví cho người cứu
 * @param {string} caseId - ID của bài đăng rescue
 * @param {string} rescuerId - ID người cứu hộ (để biết ai nhận tiền)
 */
export async function closeRescueCase(caseId, rescuerId) {
  try {
    // 1. Cập nhật pet status thành 'delivered'
    const { error: petError } = await supabase
      .from("pets")
      .update({ status: "delivered" })
      .eq("id", caseId);

    if (petError) throw petError;

    // 2. Lấy wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from("case_wallet")
      .select("balance")
      .eq("case_id", caseId)
      .single();

    if (walletError) throw walletError;

    const balanceToTransfer = wallet?.balance || 0;

    // 3. Nếu có tiền → tạo transaction chuyển cho rescuer
    if (balanceToTransfer > 0) {
      const { error: txnError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: rescuerId,
          case_id: caseId,
          amount: balanceToTransfer,
          type: "donation_payout", // donation payout from case wallet
          description: `Nhận tiền quyên góp từ ca cứu hộ ${caseId}`,
          created_at: new Date().toISOString(),
        });

      if (txnError) console.warn("Warning: Could not record transaction", txnError);
    }

    // 4. Set wallet balance = 0
    const { error: resetError } = await supabase
      .from("case_wallet")
      .update({ balance: 0, updated_at: new Date().toISOString() })
      .eq("case_id", caseId);

    if (resetError) throw resetError;

    return { success: true, amountTransferred: balanceToTransfer };
  } catch (error) {
    console.error("Error closing rescue case:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Tạo case_wallet khi tạo pet rescue (gọi từ report form)
 * @param {string} caseId - ID của pet vừa được tạo
 */
export async function createCaseWallet(caseId) {
  try {
    const { error } = await supabase.from("case_wallet").insert({
      case_id: caseId,
      balance: 0,
    });

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error("Error creating case wallet:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Upload ảnh biên lai
 * @param {File} file - File ảnh
 * @param {string} caseId - ID ca cứu hộ
 */
export async function uploadReceiptImage(file, caseId) {
  try {
    const ext = file.name.split(".").pop();
    const filePath = `receipts/${caseId}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("pet-images")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("pet-images").getPublicUrl(filePath);

    return { success: true, url: data?.publicUrl };
  } catch (error) {
    console.error("Error uploading receipt:", error);
    return { success: false, error: error.message };
  }
}
