import { useEffect, useState } from 'react';
import { formatVND } from '../services/walletService';

export default function OrderSuccessBanner({
  isOpen,
  userId,
  lastOrder,
  onClose,
  onViewHistory,
  onContinueShopping,
}) {
  const [shippingInfo, setShippingInfo] = useState({ fullName: '', phone: '', address: '', notes: '' });

  useEffect(() => {
    if (!userId) return;
    try {
      const saved = localStorage.getItem(`meomap_shipping_${userId}`);
      if (saved) {
        setShippingInfo(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Error reading saved shipping info', err);
    }
  }, [userId]);

  if (!isOpen) return null;

  return (
    <div className="p-4 mb-6 bg-green-50 border-2 border-green-300 rounded-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-green-800">✅ Đặt hàng thành công!</h3>
          <p className="text-sm text-green-700">
            Đơn hàng của bạn đang được xử lý. Chúng tôi sẽ liên hệ và giao hàng theo thông tin bên dưới.
          </p>

          {/* Shipping summary */}
          <div className="mt-3 p-3 bg-white border border-green-200 rounded">
            <p className="text-sm font-semibold text-gray-800">Thông tin giao hàng</p>
            <div className="mt-1 text-xs text-gray-700 space-y-1">
              {shippingInfo.fullName && <p>👤 {shippingInfo.fullName}</p>}
              {shippingInfo.phone && <p>📞 {shippingInfo.phone}</p>}
              {shippingInfo.address && <p>📍 {shippingInfo.address}</p>}
              {shippingInfo.notes && <p>📝 {shippingInfo.notes}</p>}
            </div>
          </div>

          {/* Last order summary */}
          {lastOrder && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm font-semibold text-gray-800">Tóm tắt đơn hàng</p>
              <div className="mt-1 text-xs text-gray-700 space-y-1">
                <p>📦 {lastOrder.product_name} x{lastOrder.quantity}</p>
                <p>💳 Tổng thanh toán: <strong className="text-indigo-700">{formatVND(lastOrder.total_amount)}</strong></p>
                {lastOrder.voucher_amount > 0 && (
                  <p>🎫 Giảm giá: -{formatVND(lastOrder.voucher_amount)}</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-3 text-xs text-gray-600">
            - Thời gian xử lý dự kiến: 1-3 ngày làm việc.
            <br />
            - Bạn sẽ nhận thông báo khi đơn chuyển trạng thái.
            <br />
            - Cần hỗ trợ? Liên hệ CSKH qua mục Liên hệ.
          </div>
        </div>
        <button onClick={onClose} className="text-green-800 hover:text-green-900 text-xl">✕</button>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={onViewHistory}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
        >
          📦 Xem lịch sử đơn hàng
        </button>
        <button
          onClick={onContinueShopping}
          className="px-4 py-2 bg-white border-2 border-indigo-600 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50"
        >
          🛍️ Tiếp tục mua sắm
        </button>
      </div>
    </div>
  );
}
