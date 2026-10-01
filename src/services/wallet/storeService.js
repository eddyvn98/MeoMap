import { supabase } from '../../supabaseClient';

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
