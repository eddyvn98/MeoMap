/**
 * Component: VoucherConversionModal
 * Cho phép user quy đổi tiền cọc hoặc tiền thưởng thành voucher
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import {
  convertBalanceCocToVoucher,
  convertBalanceThuongToVoucher,
  getAvailableVouchers,
  formatVND,
  hasEnoughBalanceCoc,
  hasEnoughBalanceThuong,
} from '../services/walletService';

export default function VoucherConversionModal({
  isOpen,
  onClose,
  userId,
  balanceCoc,
  balanceThuong,
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState('coc'); // 'coc' | 'thuong'
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadVouchers();
    }
  }, [isOpen]);

  const loadVouchers = async () => {
    try {
      const result = await getAvailableVouchers();
      if (result.success) {
        setVouchers(result.vouchers || []);
        setSelectedVoucher(null);
      }
    } catch (err) {
      setError('Không thể tải danh sách voucher');
      console.error(err);
    }
  };

  const getMaxAmount = () => {
    return activeTab === 'coc' ? balanceCoc : balanceThuong;
  };

  const handleConvert = async () => {
    if (!selectedVoucher) {
      setError('Vui lòng chọn voucher');
      return;
    }

    const amount = selectedVoucher.amount;
    const maxAmount = getMaxAmount();

    if (amount > maxAmount) {
      setError(
        `Không đủ ${activeTab === 'coc' ? 'tiền cọc' : 'tiền thưởng'}. ` +
        `Số dư: ${formatVND(maxAmount)}, cần: ${formatVND(amount)}`
      );
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      let result;
      if (activeTab === 'coc') {
        result = await convertBalanceCocToVoucher(
          userId,
          amount,
          selectedVoucher.code,
          `Quy đổi thành voucher ${selectedVoucher.code}`
        );
      } else {
        result = await convertBalanceThuongToVoucher(
          userId,
          amount,
          selectedVoucher.code,
          `Quy đổi thành voucher ${selectedVoucher.code}`
        );
      }

      if (result.success) {
        setSuccess(
          `✅ Quy đổi thành công! Bạn nhận được voucher ${selectedVoucher.code} trị giá ${formatVND(amount)}`
        );
        setSelectedVoucher(null);
        
        // Call onSuccess callback để refresh ví
        setTimeout(() => {
          if (onSuccess) onSuccess(selectedVoucher.code);
          // Close modal sau 2 giây
          setTimeout(onClose, 1000);
        }, 1500);
      } else {
        setError(result.error || 'Lỗi quy đổi voucher');
      }
    } catch (err) {
      setError('Lỗi khi quy đổi: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white p-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">💳 Quy Đổi Voucher</h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-indigo-700 w-8 h-8 rounded flex items-center justify-center"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab('coc');
                setSelectedVoucher(null);
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded font-semibold transition ${
                activeTab === 'coc'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tiền Cọc
            </button>
            <button
              onClick={() => {
                setActiveTab('thuong');
                setSelectedVoucher(null);
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded font-semibold transition ${
                activeTab === 'thuong'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Tiền Thưởng
            </button>
          </div>

          {/* Balance Info */}
          <div className={`p-4 rounded-lg ${
            activeTab === 'coc' 
              ? 'bg-orange-50 border-2 border-orange-200' 
              : 'bg-green-50 border-2 border-green-200'
          }`}>
            <p className="text-sm text-gray-600">Số dư khả dụng:</p>
            <p className={`text-2xl font-bold ${
              activeTab === 'coc' ? 'text-orange-700' : 'text-green-700'
            }`}>
              {formatVND(getMaxAmount())}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-300 text-green-700 rounded text-sm">
              {success}
            </div>
          )}

          {/* Voucher Selection */}
          <div className="space-y-3">
            <label className="block font-semibold text-gray-700">
              Chọn Voucher:
            </label>
            
            {vouchers.length === 0 ? (
              <p className="text-center text-gray-500 py-4">
                Hiện không có voucher khả dụng
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {vouchers.map((voucher) => {
                  const isAffordable = getMaxAmount() >= voucher.amount;
                  const isSelected = selectedVoucher?.id === voucher.id;

                  return (
                    <button
                      key={voucher.id}
                      onClick={() => isAffordable && setSelectedVoucher(voucher)}
                      disabled={!isAffordable}
                      className={`w-full p-4 rounded-lg border-2 transition text-left ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 shadow-md'
                          : 'border-gray-200 bg-gray-50 hover:border-indigo-300'
                      } ${!isAffordable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-800">
                            {voucher.code}
                          </p>
                          <p className="text-sm text-gray-600">
                            {voucher.description || 'Voucher'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-indigo-600">
                            {formatVND(voucher.amount)}
                          </p>
                          {isSelected && (
                            <p className="text-xs text-indigo-600 font-semibold">
                              ✓ Đã chọn
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {!isAffordable && (
                        <p className="text-xs text-red-600 mt-2">
                          ⚠️ Không đủ số dư
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Conversion Details */}
          {selectedVoucher && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded space-y-2">
              <p className="text-sm text-gray-700">
                <strong>Quy đổi:</strong>{' '}
                {formatVND(selectedVoucher.amount)} {activeTab === 'coc' ? 'tiền cọc' : 'tiền thưởng'}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Nhận được:</strong> Voucher {selectedVoucher.code}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Số dư sau:</strong> {formatVND(getMaxAmount() - selectedVoucher.amount)}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-300 text-gray-800 rounded font-semibold hover:bg-gray-400 transition"
            >
              Hủy
            </button>
            <button
              onClick={handleConvert}
              disabled={!selectedVoucher || loading}
              className={`flex-1 py-2 px-4 rounded font-semibold transition ${
                selectedVoucher && !loading
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer'
                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
              }`}
            >
              {loading ? '⏳ Đang xử lý...' : 'Xác Nhận Quy Đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
