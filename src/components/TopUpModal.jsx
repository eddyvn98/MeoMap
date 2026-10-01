import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { createTopupRequest, formatVND } from "../services/walletService";
import TopUpModalView from './views/TopUpModalView';

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

  return <TopUpModalView scope={{
    isOpen,
    onClose,
    userId,
    onSuccess,
    amount,
    setAmount,
    customAmount,
    setCustomAmount,
    loading,
    setLoading,
    error,
    setError,
    showPayment,
    setShowPayment,
    paymentData,
    setPaymentData,
    presetAmounts,
    handleAmountSelect,
    handleCustomAmountChange,
    handleTopup,
    handlePaymentComplete,
    handleCancelPayment,
  }} />;
}
