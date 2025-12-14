/**
 * Component: CheckoutModal
 * Modal checkout để mua sản phẩm
 */

import { useState } from 'react';
import { purchaseProduct, formatVND } from '../services/walletService';

export default function CheckoutModal({
  isOpen,
  onClose,
  product,
  userId,
  wallet,
  vouchers,
  onSuccess,
}) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVoucherId, setSelectedVoucherId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !product) return null;

  const totalPrice = product.price * quantity;
  const selectedVoucher = selectedVoucherId
    ? vouchers.find(v => v.id === selectedVoucherId)
    : null;
  const voucherAmount = Math.min(
    selectedVoucher?.amount || 0,
    totalPrice
  );
  const finalAmount = totalPrice - voucherAmount;
  const totalAvailable = wallet.balance_coc + wallet.balance_thuong;

  const handlePurchase = async () => {
    if (!userId) {
      setError('Bạn cần đăng nhập');
      return;
    }

    if (finalAmount > totalAvailable) {
      setError('Số dư không đủ');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await purchaseProduct(
        userId,
        product.id,
        quantity,
        selectedVoucherId,
        `Mua từ cửa hàng: ${product.name}`
      );

      if (result.success) {
        setSuccess(`✅ Mua hàng thành công! 🎉`);
        
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 2000);
      } else {
        setError(result.error || 'Lỗi mua hàng');
      }
    } catch (err) {
      setError('Lỗi: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const canAfford = finalAmount <= totalAvailable;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">🛒 Thanh Toán</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Product Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Sản phẩm</p>
          <p className="font-bold text-lg text-gray-800">{product.name}</p>
          <p className="text-sm text-gray-600 mt-2">
            Giá: <strong>{formatVND(product.price)}</strong>
          </p>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Số lượng</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              −
            </button>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 text-center border border-gray-300 rounded py-2 px-3"
            />
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              +
            </button>
          </div>
        </div>

        {/* Voucher Selection */}
        {vouchers.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">
              💳 Dùng voucher (tùy chọn)
            </label>
            <div className="max-h-32 overflow-y-auto space-y-2">
              {/* Option: No voucher */}
              <label className="flex items-center gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="voucher"
                  value=""
                  checked={!selectedVoucherId}
                  onChange={() => setSelectedVoucherId(null)}
                />
                <span className="text-sm text-gray-700">Không dùng voucher</span>
              </label>

              {/* Voucher options */}
              {vouchers.map((v) => (
                <label
                  key={v.id}
                  className="flex items-center gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="voucher"
                    value={v.id}
                    checked={selectedVoucherId === v.id}
                    onChange={() => setSelectedVoucherId(v.id)}
                  />
                  <span className="text-sm text-gray-700">
                    {v.code} - {formatVND(v.amount)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Tổng giá:</span>
            <span className="font-semibold">{formatVND(totalPrice)}</span>
          </div>
          {voucherAmount > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>Giảm giá voucher:</span>
              <span className="font-semibold">-{formatVND(voucherAmount)}</span>
            </div>
          )}
          <div className="border-t border-blue-200 pt-2 flex justify-between">
            <span className="font-bold text-gray-800">Cần thanh toán:</span>
            <span className={`text-xl font-bold ${canAfford ? 'text-green-600' : 'text-red-600'}`}>
              {formatVND(finalAmount)}
            </span>
          </div>
        </div>

        {/* Wallet Info */}
        <div className="text-xs text-gray-600 space-y-1">
          <p>Balance_COC: {formatVND(wallet.balance_coc)}</p>
          <p>Balance_THUONG: {formatVND(wallet.balance_thuong)}</p>
          <p className="font-semibold">
            Tổng: {formatVND(totalAvailable)}
            {!canAfford && (
              <span className="text-red-600 ml-2">❌ Không đủ!</span>
            )}
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded text-sm">
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 border border-green-300 text-green-700 rounded text-sm">
            {success}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Hủy
          </button>
          <button
            onClick={handlePurchase}
            disabled={!canAfford || loading}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition ${
              canAfford && !loading
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
            }`}
          >
            {loading ? '⏳ Đang xử lý...' : `💳 Thanh Toán ${formatVND(finalAmount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
