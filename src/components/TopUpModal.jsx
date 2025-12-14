import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { createTopupRequest, formatVND } from "../services/walletService";

export default function TopUpModal({ isOpen, onClose, userId, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  // Preset amounts
  const presetAmounts = [50000, 100000, 200000, 500000, 1000000];

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAmount("");
      setCustomAmount("");
      setError("");
      setShowPayment(false);
      setPaymentData(null);
    }
  }, [isOpen]);

  const handleAmountSelect = (value) => {
    setAmount(value);
    setCustomAmount("");
    setError("");
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // Only numbers
    setCustomAmount(value);
    setAmount(value);
    setError("");
  };

  const handleTopup = async () => {
    const finalAmount = parseInt(amount);

    // Validate
    if (!finalAmount || finalAmount < 10000) {
      setError("Số tiền nạp tối thiểu là 10,000đ");
      return;
    }

    if (finalAmount > 50000000) {
      setError("Số tiền nạp tối đa là 50,000,000đ");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Create topup request in database (MANUAL mode)
      const result = await createTopupRequest(userId, finalAmount, "manual");

      if (!result.success) {
        setError(result.error || "Không thể tạo yêu cầu nạp tiền");
        setLoading(false);
        return;
      }

      // Store payment data for display (bank transfer info)
      setPaymentData({
        topupId: result.topupId,
        orderCode: result.orderCode,
        amount: finalAmount,
        bankAccount: result.bankAccount,
        bankName: result.bankName,
        accountHolder: result.accountHolder,
        transferContent: result.transferContent,
        qrCodeUrl: result.qrCodeUrl, // VietQR with embedded bank transfer details
      });

      setShowPayment(true);
      setLoading(false);
    } catch (err) {
      console.error("Error creating topup:", err);
      setError(err.message || "Có lỗi xảy ra. Vui lòng thử lại.");
      setLoading(false);
    }
  };

  const handlePaymentComplete = () => {
    // Close modal and refresh wallet
    setShowPayment(false);
    setPaymentData(null);
    onClose();
    if (onSuccess) onSuccess();
  };

  const handleCancelPayment = () => {
    // Just close payment view, keep modal open
    setShowPayment(false);
    setPaymentData(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">💳 Nạp Tiền Vào Ví</h2>
            <button
              onClick={onClose}
              className="text-2xl hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {!showPayment ? (
            /* Step 1: Select Amount */
            <>
              <p className="text-sm text-gray-600 mb-4">
                Chọn số tiền muốn nạp hoặc nhập số tiền tùy chỉnh
              </p>

              {/* Preset Amounts */}
              <div className="space-y-2 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn nhanh:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {presetAmounts.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleAmountSelect(preset)}
                      className={`py-3 px-4 rounded-lg border-2 font-semibold transition ${
                        amount == preset
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:border-blue-300 text-gray-700"
                      }`}
                    >
                      {formatVND(preset)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hoặc nhập số tiền:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customAmount}
                    onChange={handleCustomAmountChange}
                    placeholder="Nhập số tiền (tối thiểu 10,000đ)"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    đ
                  </span>
                </div>
              </div>

              {/* Selected Amount Display */}
              {amount && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700 font-medium">
                      Số tiền nạp:
                    </span>
                    <span className="text-2xl font-bold text-blue-900">
                      {formatVND(parseInt(amount))}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    💰 Tiền sẽ được cộng vào <strong>Ví Chính</strong> (dùng tự do)
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-red-700">❌ {error}</p>
                </div>
              )}

              {/* Info */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600 space-y-1">
                <p>ℹ️ <strong>Phương thức thanh toán:</strong> Chuyển khoản ngân hàng (QR Code hoặc thủ công)</p>
                <p>⚡ <strong>Xử lý:</strong> Tự động (tiền về ngay sau khi hệ thống nhận diện)</p>
                <p>💳 <strong>Phí giao dịch:</strong> Miễn phí</p>
                <p>🔒 <strong>Bảo mật:</strong> Không cần lưu thông tin ngân hàng, tự động qua mã đơn hàng</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleTopup}
                  disabled={!amount || loading}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? "Đang xử lý..." : "Nạp Tiền"}
                </button>
              </div>
            </>
          ) : (
            /* Step 2: Bank Transfer Instructions */
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-3xl">✅</div>
                  <div>
                    <h3 className="font-bold text-green-800 text-lg mb-1">
                      Yêu cầu nạp tiền đã được tạo!
                    </h3>
                    <p className="text-sm text-green-700">
                      Mã giao dịch: <code className="bg-white px-2 py-1 rounded font-mono">{paymentData?.orderCode}</code>
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Amount */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-sm text-blue-700 mb-1">Số tiền cần chuyển khoản:</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {formatVND(paymentData?.amount)}
                  </p>
                </div>
              </div>

              {/* Bank Account Info */}
              <div className="bg-white border-2 border-purple-300 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-purple-900 text-center mb-2">
                  🏦 Thông tin chuyển khoản
                </h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-purple-50 p-2 rounded">
                    <span className="text-sm text-gray-600">Ngân hàng:</span>
                    <span className="font-bold text-purple-900">{paymentData?.bankName}</span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-purple-50 p-2 rounded">
                    <span className="text-sm text-gray-600">Số tài khoản:</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-bold text-purple-900">{paymentData?.bankAccount}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(paymentData?.bankAccount || '');
                          alert('Đã copy số tài khoản!');
                        }}
                        className="text-xs bg-purple-200 hover:bg-purple-300 px-2 py-1 rounded"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center bg-purple-50 p-2 rounded">
                    <span className="text-sm text-gray-600">Chủ tài khoản:</span>
                    <span className="font-bold text-purple-900">{paymentData?.accountHolder}</span>
                  </div>
                </div>
              </div>

              {/* Transfer Content - IMPORTANT */}
              <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  <span>Nội dung chuyển khoản (BẮT BUỘC):</span>
                </h3>
                <div className="bg-white border-2 border-red-400 p-3 rounded">
                  <code className="block text-center font-mono font-bold text-xl text-red-900">
                    {paymentData?.transferContent}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(paymentData?.transferContent || '');
                      alert('Đã copy nội dung chuyển khoản!');
                    }}
                    className="mt-2 w-full py-2 bg-red-500 text-white rounded font-semibold hover:bg-red-600 transition"
                  >
                    📋 Copy nội dung
                  </button>
                </div>
                <p className="text-xs text-red-700 mt-2 text-center">
                  ⚠️ Phải ghi ĐÚNG nội dung này để hệ thống tự động xác nhận!
                </p>
              </div>

              {/* QR Code - Static QR (manual entry required) */}
              {paymentData?.staticQrUrl && (
                <div className="bg-indigo-50 border-2 border-indigo-300 rounded-lg p-4">
                  <h3 className="font-bold text-indigo-900 mb-3 text-center">
                    📱 Quét mã QR chuyển khoản
                  </h3>
                  <div className="bg-white p-3 rounded border border-indigo-200 flex justify-center">
                    <img 
                      src={paymentData.staticQrUrl} 
                      alt="Static QR Code"
                      className="w-56 h-56 object-contain"
                      onError={(e) => {
                        console.error('QR code failed to load:', e);
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <p className="text-xs text-red-700 mt-2 text-center bg-red-50 p-2 rounded">
                    ⚠️ Sau khi quét QR, bạn cần nhập thủ công: <strong>Số tiền</strong> và <strong>Nội dung CK: {paymentData?.transferContent}</strong>
                  </p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-gray-700 space-y-2">
                <p className="font-semibold text-yellow-800">📋 Hướng dẫn chuyển khoản:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Mở app ngân hàng của bạn</li>
                  <li>Chuyển khoản đến số TK: <strong>{paymentData?.bankAccount}</strong></li>
                  <li>Số tiền: <strong>{formatVND(paymentData?.amount)}</strong></li>
                  <li><strong className="text-red-600">QUAN TRỌNG:</strong> Nội dung CK phải là: <strong>{paymentData?.transferContent}</strong></li>
                  <li>Xác nhận chuyển khoản</li>
                  <li>Tiền sẽ tự động cộng vào ví sau 1-5 phút</li>
                </ol>
              </div>

              {/* Auto-confirmation notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <p className="font-semibold mb-1">🤖 Xác nhận tự động:</p>
                <p>
                  Hệ thống sẽ tự động nhận dạng giao dịch của bạn qua nội dung chuyển khoản 
                  và cộng tiền vào ví trong vòng <strong>1-5 phút</strong>.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelPayment}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  ← Quay lại
                </button>
                <button
                  onClick={handlePaymentComplete}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition"
                >
                  Đã chuyển khoản ✓
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
