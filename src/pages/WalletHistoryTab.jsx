import { formatVND, getWithdrawalStatusDisplayP2P } from "../services/walletService";

export default function WalletHistoryTab({
  selectedTab, withdrawals, handleConfirmReceipt, disputeWithdrawalId,
  setDisputeWithdrawalId, disputeReason, setDisputeReason, handleOpenDispute,
}) {
  return (
    <>
      {/* History Tab */}
      {selectedTab === "history" && (
      <div className="space-y-4">
      {withdrawals.length === 0 ? (
      <div className="p-4 text-center text-gray-600">Chưa có lệnh rút nào</div>
      ) : (
      withdrawals.map((wd) => {
      const status = getWithdrawalStatusDisplayP2P(wd.status);
      return (
      <div key={wd.id} className="p-4 border rounded-lg bg-white space-y-3">
      {/* Header */}
      <div className="flex justify-between items-start">
      <div>
      <div className="font-bold text-lg">{formatVND(wd.amount)}</div>
      <div className="text-sm text-gray-600">Mã lệnh: <span className="font-mono font-bold text-gray-900">{wd.order_code}</span></div>
      </div>
      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${status.color}`}>
      {status.icon} {status.text}
      </span>
      </div>
      
      {/* Bank Info */}
      <div className="p-3 bg-gray-50 rounded border border-gray-200">
      <div className="text-sm space-y-1">
      <div><strong>Ngân hàng:</strong> {wd.bank_name}</div>
      <div><strong>STK:</strong> {wd.bank_account}</div>
      <div><strong>Tên chủ:</strong> {wd.account_holder}</div>
      </div>
      </div>
      
      {/* QR Code for Admin (info only) */}
      {wd.status !== 'PENDING' && (
      <div className="p-3 bg-blue-50 rounded border border-blue-200">
      <div className="text-xs text-blue-700 mb-2">
      <strong>Nội dung chuyển khoản để ghi vào:</strong><br />
      <code className="bg-white px-2 py-1 rounded">{`PAY ${wd.order_code}`}</code>
      </div>
      </div>
      )}
      
      {/* Trace ID (Admin provided) */}
      {wd.bank_trace_id && (
      <div className="p-3 bg-green-50 rounded border border-green-200">
      <div className="text-xs space-y-1 text-green-800">
      <div><strong>Mã giao dịch:</strong> {wd.bank_trace_id}</div>
      {wd.transfer_time && (
      <div><strong>Thời gian:</strong> {new Date(wd.transfer_time).toLocaleString("vi-VN")}</div>
      )}
      </div>
      </div>
      )}
      
      {/* Timestamps */}
      <div className="text-xs text-gray-600 space-y-1">
      <div>Tạo lệnh: {new Date(wd.created_at).toLocaleString("vi-VN")}</div>
      {wd.user_confirmed_at && (
      <div className="text-green-700">✅ Xác nhận nhận tiền: {new Date(wd.user_confirmed_at).toLocaleString("vi-VN")}</div>
      )}
      </div>
      
      {/* Actions */}
      <div className="space-y-2 pt-2">
      {wd.status === "AWAITING_USER_CONFIRMATION" && (
      <>
      <button
      onClick={() => handleConfirmReceipt(wd.id)}
      className="w-full py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700"
      >
      ✅ Đã nhận tiền
      </button>
      {!disputeWithdrawalId && (
      <button
      onClick={() => setDisputeWithdrawalId(wd.id)}
      className="w-full py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700"
      >
      ⚠️ Mở tranh chấp
      </button>
      )}
      </>
      )}
      
      {/* Dispute Form */}
      {disputeWithdrawalId === wd.id && (
      <div className="p-3 bg-red-50 border border-red-200 rounded space-y-2">
      <textarea
      value={disputeReason}
      onChange={(e) => setDisputeReason(e.target.value)}
      placeholder="Mô tả lý do tranh chấp..."
      className="w-full px-3 py-2 border rounded text-sm"
      rows="3"
      />
      <div className="flex gap-2">
      <button
      onClick={() => handleOpenDispute(wd.id)}
      className="flex-1 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700"
      >
      Gửi tranh chấp
      </button>
      <button
      onClick={() => {
      setDisputeWithdrawalId(null);
      setDisputeReason("");
      }}
      className="flex-1 py-2 bg-gray-400 text-white rounded font-medium hover:bg-gray-500"
      >
      Hủy
      </button>
      </div>
      </div>
      )}
      </div>
      
      {/* Admin Notes */}
      {wd.admin_notes && (
      <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
      <div className="text-xs text-yellow-800">
      <strong>Ghi chú từ admin:</strong><br />
      {wd.admin_notes}
      </div>
      </div>
      )}
      </div>
      );
      })
      )}
      </div>
      )}
    </>
  );
}
