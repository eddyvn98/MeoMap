/**
 * MultiStepCheckoutModal - Multi-step checkout with shipping info, voucher, payment
 */

import { useEffect, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { formatVND, purchaseProduct } from '../services/walletService';
import TopUpInlineModal from './TopUpInlineModal';
import VoucherConversionModal from './VoucherConversionModal';
import CheckoutStepContent from "./CheckoutStepContent";

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
            <CheckoutStepContent
              step={step}
              cartItems={cartItems}
              totalPrice={totalPrice}
              shippingInfo={shippingInfo}
              handleShippingChange={handleShippingChange}
              wallet={wallet}
              needMoreMoney={needMoreMoney}
              totalAvailable={totalAvailable}
              vouchers={vouchers}
              selectedVoucherId={selectedVoucherId}
              setSelectedVoucherId={setSelectedVoucherId}
              setShowVoucherConversion={setShowVoucherConversion}
              voucherAmount={voucherAmount}
              finalAmount={finalAmount}
              setShowTopUp={setShowTopUp}
            />
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
