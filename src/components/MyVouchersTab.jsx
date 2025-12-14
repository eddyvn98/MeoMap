/**
 * Component: MyVouchersTab
 * Hiển thị danh sách voucher mà user đã quy đổi
 */

import { useEffect, useState } from 'react';
import { getUserVouchers, formatVND } from '../services/walletService';

export default function MyVouchersTab({ userId }) {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadVouchers();
  }, [userId]);

  const loadVouchers = async () => {
    try {
      setLoading(true);
      const result = await getUserVouchers(userId);
      if (result.success) {
        setVouchers(result.vouchers || []);
        setError('');
      } else {
        setError(result.error);
        setVouchers([]);
      }
    } catch (err) {
      setError('Lỗi khi tải danh sách voucher');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSourceTypeLabel = (sourceType) => {
    const labels = {
      'conversion_deposit': '💳 Quy đổi từ tiền cọc',
      'conversion_bounty': '🎁 Quy đổi từ tiền thưởng',
      'reward': '🎉 Thưởng từ hệ thống',
      'purchase': '🛒 Mua',
    };
    return labels[sourceType] || sourceType;
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Có thể dùng' },
      'used': { bg: 'bg-gray-100', text: 'text-gray-800', label: '✓ Đã dùng' },
      'expired': { bg: 'bg-red-100', text: 'text-red-800', label: '❌ Hết hạn' },
      'revoked': { bg: 'bg-gray-100', text: 'text-gray-800', label: '⊘ Bị thu hồi' },
    };
    return badges[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status };
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-600">⏳ Đang tải voucher...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-600">⚠️ {error}</div>;
  }

  if (vouchers.length === 0) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-5xl">🎫</div>
        <p className="text-lg font-semibold text-gray-700">Chưa có voucher nào</p>
        <p className="text-sm text-gray-600">
          Hãy quy đổi tiền cọc hoặc tiền thưởng thành voucher để sử dụng trong app.
        </p>
        <button
          onClick={() => window.location.href = '#quy-doi'}
          className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700"
        >
          💳 Quy đổi Voucher
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-700">Voucher của tôi ({vouchers.length})</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vouchers.map((voucher) => {
          const statusBadge = getStatusBadge(voucher.status);
          const isActive = voucher.status === 'active';

          return (
            <div
              key={voucher.id}
              className={`p-4 rounded-lg border-2 transition ${
                isActive
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-gray-50 opacity-70'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-bold text-lg text-gray-800">{voucher.code}</h4>
                  <p className="text-sm text-gray-600">{voucher.description}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadge.bg} ${statusBadge.text}`}
                >
                  {statusBadge.label}
                </span>
              </div>

              {/* Amount */}
              <div className="mb-3 p-3 bg-white rounded border border-gray-200">
                <p className="text-xs text-gray-600">Giá trị</p>
                <p className="text-2xl font-bold text-indigo-600">{formatVND(voucher.amount)}</p>
              </div>

              {/* Metadata */}
              <div className="text-xs text-gray-600 space-y-1">
                <p>
                  <strong>Nguồn:</strong> {getSourceTypeLabel(voucher.source_type)}
                </p>
                <p>
                  <strong>Nhận lúc:</strong> {new Date(voucher.acquired_at).toLocaleDateString('vi-VN')}
                </p>
                {voucher.expires_at && (
                  <p>
                    <strong>Hết hạn:</strong> {new Date(voucher.expires_at).toLocaleDateString('vi-VN')}
                  </p>
                )}
              </div>

              {/* Action */}
              {isActive && (
                <button
                  onClick={() => {
                    // Copy mã voucher
                    navigator.clipboard.writeText(voucher.code);
                    alert('✅ Đã copy mã voucher: ' + voucher.code);
                  }}
                  className="w-full mt-3 py-2 px-3 bg-indigo-500 text-white rounded font-semibold hover:bg-indigo-600 transition text-sm"
                >
                  📋 Copy Mã
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 space-y-2">
        <p>
          <strong>📌 Cách sử dụng:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Voucher sẽ được sử dụng khi bạn đặt cọc nhận mèo</li>
          <li>Giá trị voucher sẽ được trừ từ số tiền cọc cần thanh toán</li>
          <li>1 voucher chỉ có thể dùng 1 lần duy nhất</li>
          <li>Copy mã voucher và dùng khi đặt cọc (sắp triển khai)</li>
        </ul>
      </div>
    </div>
  );
}
