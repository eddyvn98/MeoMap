/**
 * TopUpInlineModal - Inline top-up modal when user doesn't have enough money
 */

import { useState } from 'react';
import { createTopupRequest, formatVND } from '../services/walletService';

export default function TopUpInlineModal({
  isOpen,
  onClose,
  userId,
  currentBalance,
  requiredAmount,
  onSuccess,
}) {
  const [amount, setAmount] = useState(Math.ceil((requiredAmount - currentBalance) / 10000) * 10000);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentData, setPaymentData] = useState(null);

  if (!isOpen) return null;

  const shortage = requiredAmount - currentBalance;
  const suggestedAmounts = [
    Math.ceil(shortage / 10000) * 10000,
    50000,
    100000,
    200000,
    500000,
  ].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);

  const handleTopUp = async () => {
    if (amount < 10000) {
      setError('Số tiền tối thiểu là 10.000 đ');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const result = await createTopupRequest(userId, amount, 'manual', 'Nạp tiền từ checkout');

      if (result.success) {
        setPaymentData(result);
      } else {
        setError(result.error || 'Không thể tạo yêu cầu nạp tiền');
      }
    } catch (err) {
      setError(err.message || 'Lỗi nạp tiền');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">💰 Nạp Tiền</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>

          {!paymentData ? (
            <>
              {/* Shortage Info */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  ⚠️ Bạn thiếu <strong className="text-lg">{formatVND(shortage)}</strong> để hoàn tất đơn hàng
                </p>
              </div>

              {/* Current Balance */}
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex justify-between">
                  <span>Số dư hiện tại:</span>
                  <span className="font-semibold">{formatVND(currentBalance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cần thanh toán:</span>
                  <span className="font-semibold text-red-600">{formatVND(requiredAmount)}</span>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Số tiền nạp (VND)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                  placeholder="50000"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-lg font-semibold"
                />
                <p className="text-sm text-gray-600 mt-1">
                  Số dư sau khi nạp: <strong>{formatVND(currentBalance + amount)}</strong>
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div>
                <p className="text-sm font-semibold mb-2">Chọn nhanh:</p>
                <div className="grid grid-cols-3 gap-2">
                  {suggestedAmounts.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAmount(amt)}
                      className={`py-2 px-3 rounded-lg text-sm font-semibold transition ${
                        amount === amt
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {formatVND(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded text-sm">
                  ⚠️ {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  onClick={handleTopUp}
                  disabled={loading || amount < 10000}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300"
                >
                  {loading ? '⏳ Đang xử lý...' : `Nạp ${formatVND(amount)}`}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Payment Instructions */}
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
                  <p className="font-semibold text-green-800">
                    ✅ Yêu cầu nạp tiền đã được tạo!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Vui lòng chuyển khoản theo thông tin bên dưới
                  </p>
                </div>

                {/* Bank Info */}
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Ngân hàng</p>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{paymentData.bankName}</p>
                      <button
                        onClick={() => handleCopyText(paymentData.bankName)}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Số tài khoản</p>
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-lg">{paymentData.bankAccount}</p>
                      <button
                        onClick={() => handleCopyText(paymentData.bankAccount)}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600">Chủ tài khoản</p>
                    <p className="font-semibold">{paymentData.accountHolder}</p>
                  </div>

                  <div className="p-3 bg-yellow-50 border border-yellow-300 rounded-lg">
                    <p className="text-xs text-yellow-800">Số tiền chuyển</p>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-2xl text-yellow-900">
                        {formatVND(paymentData.amount)}
                      </p>
                      <button
                        onClick={() => handleCopyText(paymentData.amount.toString())}
                        className="text-xs text-yellow-700 hover:text-yellow-900"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-red-50 border border-red-300 rounded-lg">
                    <p className="text-xs text-red-800">Nội dung chuyển khoản (BẮT BUỘC)</p>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-lg text-red-900">{paymentData.orderCode}</p>
                      <button
                        onClick={() => handleCopyText(paymentData.orderCode)}
                        className="text-xs text-red-700 hover:text-red-900"
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>
                </div>

                {/* QR Code */}
                {paymentData.qrCodeUrl && (
                  <div className="text-center">
                    <p className="text-sm font-semibold mb-2">Quét mã QR để chuyển khoản nhanh:</p>
                    <img
                      src={paymentData.qrCodeUrl}
                      alt="QR Code"
                      className="mx-auto max-w-xs border-2 border-gray-200 rounded-lg"
                    />
                  </div>
                )}

                {/* Info */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  <p className="font-semibold">📱 Lưu ý:</p>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>Chuyển khoản CHÍNH XÁC số tiền và nội dung</li>
                    <li>Hệ thống tự động xác nhận sau 1-5 phút</li>
                    <li>Sau khi nạp tiền, quay lại trang thanh toán để tiếp tục</li>
                  </ul>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => {
                    onSuccess();
                    onClose();
                  }}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Đã Chuyển Khoản - Quay Lại
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
