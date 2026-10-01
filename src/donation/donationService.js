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
