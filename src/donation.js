/**
 * Donation functions - Quyên góp cho ca cứu hộ
 * Đơn giản không có approval/voting
 */

import { supabase } from "./supabaseClient";

/**
 * Thêm donation mới
 * @param {string} caseId - ID của bài đăng rescue
 * @param {number} amount - Số tiền (VND)
 * @param {string} method - 'direct' hoặc 'system'
 * @param {string} note - Ghi chú (tùy chọn)
 * @param {string} receiptUrl - URL ảnh biên lai (nếu chuyển thẳng)
 * @param {string} userId - ID người góp (có thể null = ẩn danh)
 */
export async function addDonation({
  caseId,
  amount,
  method = "direct",
  note = "",
  receiptUrl = null,
  userId = null, // null = ẩn danh
}) {
  try {
    // 1. Thêm donation record
    const { data: donation, error: donationError } = await supabase
      .from("donations")
      .insert({
        case_id: caseId,
        user_id: userId,
        amount,
        method,
        note,
        receipt_url: receiptUrl,
      })
      .select()
      .single();

    if (donationError) throw donationError;

    // 2. Nếu góp qua hệ thống → cộng vào wallet
    if (method === "system") {
      const { error: walletError } = await supabase
        .from("case_wallet")
        .update({
          balance: supabase.raw("balance + " + amount),
          updated_at: new Date().toISOString(),
        })
        .eq("case_id", caseId);

      if (walletError) {
        console.warn("Warning: Could not update wallet", walletError);
        // Donation vẫn được lưu, wallet update là non-critical
      }
    }

    return { success: true, donation };
  } catch (error) {
    console.error("Error adding donation:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Lấy tất cả donations cho một ca
 * @param {string} caseId - ID của bài đăng rescue
 */
export async function getDonationsForCase(caseId) {
  try {
    const { data: donations, error } = await supabase
      .from("donations")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, donations };
  } catch (error) {
    console.error("Error fetching donations:", error);
    return { success: false, error: error.message, donations: [] };
  }
}

/**
 * Tính tổng tiền đã góp + số người góp
 * @param {string} caseId - ID của bài đăng rescue
 */
export async function getDonationStats(caseId) {
  try {
    const { data: donations, error } = await supabase
      .from("donations")
      .select("amount, user_id, method")
      .eq("case_id", caseId);

    if (error) throw error;

    const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
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
      .single();

    if (error) throw error;

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
