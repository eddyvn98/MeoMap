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
    // Nếu góp qua hệ thống, YÊU CẦU đăng nhập và kiểm tra balance
    if (method === "system") {
      // 1. Kiểm tra authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { 
          success: false, 
          error: "Bạn phải đăng nhập để góp qua hệ thống" 
        };
      }

      // 2. Kiểm tra số dư ví balance_thuong
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

      // 3. Trừ tiền từ ví balance_thuong
      const { error: updateError } = await supabase.rpc('decrease_balance_thuong', {
        p_user_id: user.id,
        p_amount: amount,
        p_case_id: caseId,
        p_note: `Góp tiền cho ca ${caseId}`
      });

      if (updateError) {
        console.error("Error decreasing balance_thuong:", updateError);
        return { 
          success: false, 
          error: "Không thể trừ tiền từ ví. Vui lòng thử lại." 
        };
      }
    }

    // 4. Thêm donation record
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

    if (donationError) {
      // Nếu tạo donation thất bại và đã trừ tiền, hoàn lại
      if (method === "system") {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc('increase_balance_thuong', {
            p_user_id: user.id,
            p_amount: amount,
            p_source: 'refund',
            p_related_id: caseId,
            p_note: `Hoàn tiền do lỗi tạo donation cho ca ${caseId}`
          });
        }
      }
      throw donationError;
    }

    // 5. Nếu góp qua hệ thống → cộng vào case_wallet
    if (method === "system") {
      const { error: walletError } = await supabase
        .from("case_wallet")
        .update({
          balance: supabase.raw("balance + " + amount),
          updated_at: new Date().toISOString(),
        })
        .eq("case_id", caseId);

      if (walletError) {
        console.warn("Warning: Could not update case_wallet", walletError);
        // Donation đã được lưu, wallet update là non-critical
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
