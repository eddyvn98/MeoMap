/**
 * Component: PurchaseHistory
 * Hiển thị lịch sử mua hàng của user
 */

import { useEffect, useState } from 'react';
import { getPurchaseHistory, formatVND } from '../services/walletService';

export default function PurchaseHistory({ userId }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userId) {
      loadPurchases();
    }
  }, [userId]);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const result = await getPurchaseHistory(userId, 50, 0);
      if (result.success) {
        setPurchases(result.purchases || []);
        setError('');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Lỗi tải lịch sử mua hàng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      'coc': '💰 Ví cọc',
      'main': '💳 Ví chính',
      'thuong': '🎁 Ví thưởng',
      'main_thuong': '💳 Ví chính + thưởng',
      'mixed': '💳 Hỗn hợp',
      'voucher': '🎫 Voucher',
    };
    return labels[method] || method;
  };

  if (loading) {
    return <div className="text-center text-gray-600 py-8">⏳ Đang tải...</div>;
  }

  if (error) {
    return <div className="text-center text-red-600 py-8">⚠️ {error}</div>;
  }

  if (purchases.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8 space-y-4">
        <p className="text-lg">📦 Chưa có lịch sử mua hàng</p>
        <p className="text-sm">Truy cập cửa hàng để mua sản phẩm hoặc dùng dịch vụ</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">
        🛍️ Lịch Sử Mua Hàng ({purchases.length})
      </h3>

      <div className="space-y-3">
        {purchases.map((purchase) => (
          <div
            key={purchase.id}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-300 transition"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-bold text-gray-800">{purchase.product_name}</h4>
                <p className="text-sm text-gray-600">
                  {new Date(purchase.purchased_at).toLocaleString('vi-VN')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-indigo-600">
                  {formatVND(purchase.total_amount)}
                </p>
                <p className="text-xs text-gray-600">
                  x{purchase.quantity}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="text-xs text-gray-600 space-y-1 border-t border-gray-200 pt-2">
              <div className="flex justify-between">
                <span>Giá/cái:</span>
                <span>{formatVND(purchase.price_at_purchase)}</span>
              </div>
              
              {purchase.wallet_used > 0 && (
                <div className="flex justify-between">
                  <span>Dùng ví:</span>
                  <span className="font-semibold text-orange-600">
                    -{formatVND(purchase.wallet_used)}
                  </span>
                </div>
              )}

              {purchase.voucher_amount > 0 && (
                <div className="flex justify-between">
                  <span>Giảm voucher:</span>
                  <span className="font-semibold text-green-600">
                    -{formatVND(purchase.voucher_amount)}
                  </span>
                </div>
              )}

              <div className="flex justify-between font-semibold text-gray-800 pt-1 border-t border-gray-300">
                <span>Phương thức:</span>
                <span>{getPaymentMethodLabel(purchase.payment_method)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reload Button */}
      <button
        onClick={loadPurchases}
        className="w-full py-2 px-4 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200 transition"
      >
        🔄 Làm mới
      </button>
    </div>
  );
}
