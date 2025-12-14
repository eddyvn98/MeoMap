/**
 * MultiStepCheckoutModal - Multi-step checkout with shipping info, voucher, payment
 */

import { useEffect, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { formatVND, purchaseProduct } from '../services/walletService';
import TopUpInlineModal from './TopUpInlineModal';
import VoucherConversionModal from './VoucherConversionModal';

export default function MultiStepCheckoutModal({
  isOpen,
  onClose,
  userId,
  wallet,
  vouchers,
  onSuccess,
  onRefresh,
}) {
  const { cartItems, getTotalPrice, clearCart } = useCart();
  const [step, setStep] = useState(1); // 1: Review, 2: Shipping, 3: Payment, 4: Confirm
  const storageKey = userId ? `meomap_shipping_${userId}` : null;

  // Shipping info
  const [shippingInfo, setShippingInfo] = useState({
    fullName: '',
    phone: '',
    address: '',
    notes: '',
  });

  // Payment
  const [selectedVoucherId, setSelectedVoucherId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Top-up modal
  const [showTopUp, setShowTopUp] = useState(false);
  // Voucher conversion modal
  const [showVoucherConversion, setShowVoucherConversion] = useState(false);
  const [pendingSelectVoucherCode, setPendingSelectVoucherCode] = useState(null);

  // Prefill shipping info for returning users
  useEffect(() => {
    if (!isOpen || !storageKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setShippingInfo((prev) => ({ ...prev, ...parsed }));
      }
    } catch (err) {
      console.error('Error loading saved shipping info', err);
    }
  }, [isOpen, storageKey]);

  useEffect(() => {
    if (pendingSelectVoucherCode) {
      const newVoucher = vouchers.find((v) => v.code === pendingSelectVoucherCode);
      if (newVoucher) {
        setSelectedVoucherId(newVoucher.id);
        setPendingSelectVoucherCode(null);
      }
    }
  }, [pendingSelectVoucherCode, vouchers]);

  if (!isOpen) return null;

  const totalPrice = getTotalPrice();
  const selectedVoucher = selectedVoucherId
    ? vouchers.find((v) => v.id === selectedVoucherId)
    : null;
  const voucherAmount = Math.min(selectedVoucher?.amount || 0, totalPrice);
  const finalAmount = totalPrice - voucherAmount;
  const totalAvailable = wallet.balance_main + wallet.balance_thuong; // Không dùng balance_coc
  const needMoreMoney = finalAmount > totalAvailable;

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Validate shipping info
      if (!shippingInfo.fullName || !shippingInfo.phone || !shippingInfo.address) {
        setError('Vui lòng điền đầy đủ thông tin giao hàng');
        return;
      }
      setError('');
      setStep(3);
    } else if (step === 3) {
      // Check if need to top up
      if (needMoreMoney) {
        setShowTopUp(true);
        return;
      }
      setStep(4);
    }
  };

  const handleShippingChange = (field, value) => {
    setShippingInfo((prev) => {
      const next = { ...prev, [field]: value };
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch (err) {
          console.error('Error saving shipping info', err);
        }
      }
      return next;
    });
  };

  const handleBack = () => {
    setError('');
    if (step > 1) setStep(step - 1);
  };

  const handlePurchase = async () => {
    try {
      setLoading(true);
      setError('');

      // Purchase each item (in real app, should be single transaction)
      for (const item of cartItems) {
        const result = await purchaseProduct(
          userId,
          item.product.id,
          item.quantity,
          step === 4 ? selectedVoucherId : null, // Only apply voucher on final purchase
          `Mua từ cửa hàng - ${shippingInfo.fullName} - ${shippingInfo.phone}`
        );

        if (!result.success) {
          throw new Error(result.error);
        }
      }

      // Success
      clearCart();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi thanh toán');
    } finally {
      setLoading(false);
    }
  };

  const handleTopUpSuccess = () => {
    setShowTopUp(false);
    // Reload wallet in parent
    if (onRefresh) {
      onRefresh();
    } else if (onSuccess) {
      onSuccess();
    }
  };

  const handleVoucherConvertSuccess = (voucherCode) => {
    setShowVoucherConversion(false);
    if (voucherCode) {
      setPendingSelectVoucherCode(voucherCode);
    }
    if (onRefresh) {
      onRefresh();
    } else if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-indigo-50">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">💳 Thanh Toán</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex-1 flex items-center">
                  <div
                    className={`w-full h-2 rounded-full ${
                      s <= step ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span className={step === 1 ? 'font-bold' : ''}>Giỏ hàng</span>
              <span className={step === 2 ? 'font-bold' : ''}>Giao hàng</span>
              <span className={step === 3 ? 'font-bold' : ''}>Thanh toán</span>
              <span className={step === 4 ? 'font-bold' : ''}>Xác nhận</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Step 1: Review Cart */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Xem lại giỏ hàng</h3>
                {cartItems.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold">{item.product.name}</p>
                      <p className="text-sm text-gray-600">
                        {formatVND(item.product.price)} x {item.quantity}
                      </p>
                    </div>
                    <p className="font-bold text-indigo-600">
                      {formatVND(item.product.price * item.quantity)}
                    </p>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between text-lg font-bold">
                  <span>Tổng:</span>
                  <span className="text-indigo-600">{formatVND(totalPrice)}</span>
                </div>
              </div>
            )}

            {/* Step 2: Shipping Info */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Thông tin giao hàng</h3>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shippingInfo.fullName}
                    onChange={(e) => handleShippingChange('fullName', e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={shippingInfo.phone}
                    onChange={(e) => handleShippingChange('phone', e.target.value)}
                    placeholder="0901234567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Địa chỉ giao hàng <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={shippingInfo.address}
                    onChange={(e) => handleShippingChange('address', e.target.value)}
                    placeholder="123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">
                    Ghi chú (tùy chọn)
                  </label>
                  <textarea
                    value={shippingInfo.notes}
                    onChange={(e) => handleShippingChange('notes', e.target.value)}
                    placeholder="Giao giờ hành chính, gọi trước 15 phút..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Payment & Voucher */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Phương thức thanh toán</h3>

                {/* Wallet Balance */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <p className="text-sm font-semibold">Số dư ví:</p>
                  <div className="flex justify-between text-sm">
                    <span>💳 Ví Chính:</span>
                    <span className="font-semibold">{formatVND(wallet.balance_main)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>🎁 Ví Thưởng:</span>
                    <span className="font-semibold">{formatVND(wallet.balance_thuong)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>🔒 Ví Cọc:</span>
                    <span className="font-semibold">{formatVND(wallet.balance_coc)} (không dùng)</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Có thể dùng:</span>
                    <span className={needMoreMoney ? 'text-red-600' : 'text-green-600'}>
                      {formatVND(totalAvailable)}
                    </span>
                  </div>
                </div>

                {/* Voucher Selection */}
                {vouchers.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">
                      💳 Chọn voucher (tùy chọn)
                    </label>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      <label className="flex items-center gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="voucher"
                          checked={!selectedVoucherId}
                          onChange={() => setSelectedVoucherId(null)}
                        />
                        <span className="text-sm">Không dùng voucher</span>
                      </label>
                      {vouchers.map((v) => (
                        <label
                          key={v.id}
                          className="flex items-center gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="radio"
                            name="voucher"
                            checked={selectedVoucherId === v.id}
                            onChange={() => setSelectedVoucherId(v.id)}
                          />
                          <span className="text-sm">
                            {v.code} - {formatVND(v.amount)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inline voucher conversion */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-amber-800">Chưa đủ voucher?</p>
                      <p className="text-sm text-amber-700">
                        Quy đổi từ Ví cọc hoặc Ví thưởng sang voucher ngay tại đây.
                      </p>
                      <p className="text-xs text-amber-700 mt-1">
                        Ví cọc: {formatVND(wallet.balance_coc)} · Ví thưởng: {formatVND(wallet.balance_thuong)}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowVoucherConversion(true)}
                      className="px-3 py-2 bg-amber-600 text-white rounded font-semibold hover:bg-amber-700"
                    >
                      🎫 Đổi voucher ngay
                    </button>
                  </div>
                  <p className="text-xs text-amber-700">
                    Voucher mới tạo sẽ xuất hiện trong danh sách và được chọn tự động nếu trùng mã.
                  </p>
                </div>

                {/* Price Summary */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tổng giá:</span>
                    <span className="font-semibold">{formatVND(totalPrice)}</span>
                  </div>
                  {voucherAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Giảm giá:</span>
                      <span className="font-semibold">-{formatVND(voucherAmount)}</span>
                    </div>
                  )}
                  <div className="border-t border-blue-200 pt-2 flex justify-between font-bold">
                    <span>Cần thanh toán:</span>
                    <span className={`text-xl ${needMoreMoney ? 'text-red-600' : 'text-green-600'}`}>
                      {formatVND(finalAmount)}
                    </span>
                  </div>
                </div>

                {/* Warning if not enough money */}
                {needMoreMoney && (
                  <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded text-sm">
                    ⚠️ Số dư không đủ! Thiếu {formatVND(finalAmount - totalAvailable)}
                    <br />
                    <button
                      onClick={() => setShowTopUp(true)}
                      className="mt-2 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
                    >
                      💰 Nạp Tiền Ngay
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg">Xác nhận đơn hàng</h3>
                
                {/* Shipping Info Summary */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-semibold mb-2">Thông tin giao hàng:</p>
                  <p className="text-sm">👤 {shippingInfo.fullName}</p>
                  <p className="text-sm">📞 {shippingInfo.phone}</p>
                  <p className="text-sm">📍 {shippingInfo.address}</p>
                  {shippingInfo.notes && (
                    <p className="text-sm text-gray-600 mt-1">📝 {shippingInfo.notes}</p>
                  )}
                </div>

                {/* Order Summary */}
                <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                  <p className="font-semibold mb-2">Chi tiết đơn hàng:</p>
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span>{item.product.name} x{item.quantity}</span>
                      <span>{formatVND(item.product.price * item.quantity)}</span>
                    </div>
                  ))}
                  {voucherAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>Giảm giá voucher:</span>
                      <span>-{formatVND(voucherAmount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Tổng thanh toán:</span>
                    <span className="text-indigo-600">{formatVND(finalAmount)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded text-sm">
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3">
            {step > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300"
              >
                ← Quay lại
              </button>
            )}
            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={step === 3 && needMoreMoney}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold ${
                  step === 3 && needMoreMoney
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                Tiếp theo →
              </button>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={loading}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300"
              >
                {loading ? '⏳ Đang xử lý...' : '✅ Xác Nhận Đặt Hàng'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Top-up Modal */}
      {showTopUp && (
        <TopUpInlineModal
          isOpen={showTopUp}
          onClose={() => setShowTopUp(false)}
          userId={userId}
          currentBalance={totalAvailable}
          requiredAmount={finalAmount}
          onSuccess={handleTopUpSuccess}
        />
      )}

      {/* Voucher Conversion Modal */}
      {showVoucherConversion && (
        <VoucherConversionModal
          isOpen={showVoucherConversion}
          onClose={() => setShowVoucherConversion(false)}
          userId={userId}
          balanceCoc={wallet.balance_coc}
          balanceThuong={wallet.balance_thuong}
          onSuccess={handleVoucherConvertSuccess}
        />
      )}
    </>
  );
}
