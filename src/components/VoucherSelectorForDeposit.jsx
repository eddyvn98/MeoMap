/**
 * Component: VoucherSelectorForDeposit
 * Cho phép user chọn voucher khi đặt cọc để giảm số tiền cần thanh toán
 */

import { useState, useEffect } from 'react';
import { getUserVouchers, formatVND } from '../services/walletService';

export default function VoucherSelectorForDeposit({
  userId,
  depositAmount,
  onVoucherSelect,
}) {
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadVouchers();
    }
  }, [userId]);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const result = await getUserVouchers(userId);
      if (result.success) {
        setVouchers(result.vouchers || []);
      }
    } catch (err) {
      console.error('Error loading vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVoucher = (voucherId) => {
    const voucher = voucherId 
      ? vouchers.find(v => v.id === voucherId)
      : null;
    
    setSelectedVoucherId(voucherId);
    
    if (onVoucherSelect) {
      onVoucherSelect({
        voucherId,
        voucherAmount: voucher?.amount || 0,
        voucherCode: voucher?.code || null,
      });
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-600">⏳ Đang tải voucher...</div>;
  }

  if (vouchers.length === 0) {
    return null;
  }

  // Calculate savings
  const selectedVoucher = selectedVoucherId 
    ? vouchers.find(v => v.id === selectedVoucherId)
    : null;
  
  const voucherAmount = selectedVoucher?.amount || 0;
  const remainingAmount = Math.max(0, depositAmount - voucherAmount);
  const savings = Math.min(voucherAmount, depositAmount);

  return (
    <div className="p-4 bg-indigo-50 border-2 border-indigo-300 rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">🎫</span>
        <h4 className="font-bold text-indigo-900">Dùng voucher để giảm tiền cọc</h4>
      </div>

      {/* Voucher Selection */}
      <div className="space-y-2">
        {/* Option: Không dùng voucher */}
        <label className="flex items-start gap-3 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 transition">
          <input
            type="radio"
            name="voucher"
            value=""
            checked={!selectedVoucherId}
            onChange={() => handleSelectVoucher(null)}
            className="mt-1"
          />
          <div className="flex-1">
            <p className="font-semibold text-gray-800">Không dùng voucher</p>
            <p className="text-sm text-gray-600">Thanh toán đầy đủ {formatVND(depositAmount)}</p>
          </div>
        </label>

        {/* Options: Available vouchers */}
        {vouchers.map((voucher) => {
          const isSelected = selectedVoucherId === voucher.id;
          const isAffordable = depositAmount >= voucher.amount;
          const savingsAmount = isAffordable ? voucher.amount : depositAmount;

          return (
            <label
              key={voucher.id}
              className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-100'
                  : 'border-gray-200 hover:border-indigo-300'
              } ${!isAffordable ? 'opacity-50' : ''}`}
            >
              <input
                type="radio"
                name="voucher"
                value={voucher.id}
                checked={isSelected}
                onChange={() => isAffordable && handleSelectVoucher(voucher.id)}
                disabled={!isAffordable}
                className="mt-1"
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-800">{voucher.code}</p>
                <p className="text-sm text-gray-600">
                  Giảm {formatVND(savingsAmount)} 
                  {isAffordable ? ` → Cần thanh toán ${formatVND(depositAmount - savingsAmount)}` : ' (không đủ)'}
                </p>
              </div>
              {isSelected && (
                <span className="text-green-600 text-lg font-bold">✓</span>
              )}
            </label>
          );
        })}
      </div>

      {/* Summary */}
      {selectedVoucher && (
        <div className="p-3 bg-green-50 border border-green-300 rounded space-y-1 text-sm">
          <p className="text-gray-700">
            <strong>Voucher:</strong> {selectedVoucher.code} - {formatVND(selectedVoucher.amount)}
          </p>
          <p className="text-gray-700">
            <strong>Số tiền cọc:</strong> {formatVND(depositAmount)}
          </p>
          <p className="text-gray-700">
            <strong>Giảm giá:</strong> -{formatVND(savings)}
          </p>
          <p className="text-green-700 font-bold text-base">
            <strong>Cần thanh toán:</strong> {formatVND(remainingAmount)}
          </p>
        </div>
      )}
    </div>
  );
}
