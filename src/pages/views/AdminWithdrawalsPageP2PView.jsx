import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminWithdrawalsPageP2PView({ scope }) {
  const {
    navigate,
    user,
    setUser,
    isAdmin,
    setIsAdmin,
    loading,
    setLoading,
    error,
    setError,
    withdrawals,
    setWithdrawals,
    filterStatus,
    setFilterStatus,
    paymentModal,
    setPaymentModal,
    traceId,
    setTraceId,
    transferContent,
    setTransferContent,
    transferTime,
    setTransferTime,
    adminNotes,
    setAdminNotes,
    proofFile,
    setProofFile,
    submitting,
    setSubmitting,
    bankCodes,
    loadData,
    handleApprove,
    openPaymentModal,
    handleConfirmPayment,
  } = scope;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Quản lý Rút tiền (P2P)</h1>

      {error && <div className="p-4 bg-red-100 text-red-800 rounded mb-4">{error}</div>}

      {/* Filter */}
      <div className="mb-6 flex gap-2">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="PENDING">Chờ duyệt</option>
          <option value="WAITING_FOR_ADMIN_PAYMENT">Đang chuyển</option>
          <option value="AWAITING_USER_CONFIRMATION">Chờ xác nhận</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="">Tất cả</option>
        </select>
      </div>

      {/* Withdrawals List */}
      <div className="space-y-4">
        {withdrawals.length === 0 ? (
          <div className="p-4 text-center text-gray-600">Không có lệnh rút nào</div>
        ) : (
          withdrawals.map((wd) => {
            const status = getWithdrawalStatusDisplayP2P(wd.status);
            return (
              <div key={wd.id} className="p-4 border rounded-lg bg-white space-y-3">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg">{formatVND(wd.amount)}</div>
                    <div className="text-sm text-gray-600">
                      Mã lệnh: <span className="font-mono font-bold text-gray-900">{wd.order_code}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      User: {wd.user?.display_name || wd.user?.email || `#${wd.user_id}`}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium whitespace-nowrap ${status.color}`}>
                    {status.icon} {status.text}
                  </span>
                </div>

                {/* Bank Account Info */}
                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="text-sm space-y-1">
                    <div><strong>Ngân hàng:</strong> {wd.bank_name}</div>
                    <div><strong>STK:</strong> {wd.bank_account}</div>
                    <div><strong>Tên chủ:</strong> {wd.account_holder}</div>
                  </div>
                </div>

                {/* QR Code (for quick transfer) */}
                {wd.status === "WAITING_FOR_ADMIN_PAYMENT" && (
                  <div className="p-4 bg-purple-50 rounded border border-purple-200">
                    <div className="text-sm font-semibold text-purple-900 mb-2">📲 QR Chuyển khoản</div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        <Suspense fallback={<div className="w-32 h-32 bg-gray-200 rounded">Loading...</div>}>
                          <QRCodeComponent
                            value={`${wd.bank_account}|970416|${wd.amount}|PAY ${wd.order_code}`}
                            size={120}
                            level="H"
                            includeMargin={true}
                          />
                        </Suspense>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs space-y-2 text-purple-900">
                          <div><strong>Nội dung:</strong> <code className="bg-white px-2 py-1 rounded block">{`PAY ${wd.order_code}`}</code></div>
                          <div><strong>Số tiền:</strong> {formatVND(wd.amount)}</div>
                          <div><strong>STK:</strong> {wd.bank_account}</div>
                          <div className="text-purple-700 mt-2">👉 Quét bằng app ngân hàng để tự động điền</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Info (if confirmed) */}
                {wd.bank_trace_id && (
                  <div className="p-3 bg-green-50 rounded border border-green-200">
                    <div className="text-sm space-y-1 text-green-800">
                      <div><strong>✅ Mã giao dịch:</strong> {wd.bank_trace_id}</div>
                      <div><strong>Nội dung:</strong> {wd.transfer_content}</div>
                      <div><strong>Thời gian:</strong> {new Date(wd.transfer_time).toLocaleString("vi-VN")}</div>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="text-xs text-gray-600 space-y-1 p-3 bg-gray-50 rounded">
                  <div>📅 Tạo lệnh: {new Date(wd.created_at).toLocaleString("vi-VN")}</div>
                  {wd.admin_approved_at && (
                    <div className="text-blue-700">✓ Duyệt: {new Date(wd.admin_approved_at).toLocaleString("vi-VN")}</div>
                  )}
                  {wd.user_confirmed_at && (
                    <div className="text-green-700">✓ User xác nhận: {new Date(wd.user_confirmed_at).toLocaleString("vi-VN")}</div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-2">
                  {wd.status === "PENDING" && (
                    <button
                      onClick={() => handleApprove(wd.id)}
                      className="w-full py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
                    >
                      Duyệt lệnh
                    </button>
                  )}

                  {wd.status === "WAITING_FOR_ADMIN_PAYMENT" && (
                    <button
                      onClick={() => openPaymentModal(wd)}
                      className="w-full py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700"
                    >
                      Xác nhận đã chuyển
                    </button>
                  )}

                  {wd.admin_notes && (
                    <div className="p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                      <strong>Ghi chú:</strong> {wd.admin_notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Payment Confirmation Modal */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-screen overflow-y-auto">
            <h2 className="text-2xl font-bold">Xác nhận thanh toán</h2>

            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="text-sm space-y-1 text-blue-900">
                <div><strong>Lệnh:</strong> {paymentModal.order_code}</div>
                <div><strong>User:</strong> {paymentModal.account_holder}</div>
                <div><strong>STK:</strong> {paymentModal.bank_account}</div>
                <div><strong>Số tiền:</strong> {formatVND(paymentModal.amount)}</div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Mã giao dịch ngân hàng (Trace ID) *</label>
                <input
                  type="text"
                  value={traceId}
                  onChange={(e) => setTraceId(e.target.value)}
                  placeholder="Ví dụ: 20250130-ABC123"
                  className="w-full px-3 py-2 border rounded-lg"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Nội dung chuyển khoản *</label>
                <input
                  type="text"
                  value={transferContent}
                  onChange={(e) => setTransferContent(e.target.value)}
                  placeholder="Nội dung chuyển khoản"
                  className="w-full px-3 py-2 border rounded-lg"
                  disabled={submitting}
                />
                <div className="text-xs text-gray-600 mt-1">Mặc định: PAY {paymentModal.order_code}</div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Thời gian chuyển *</label>
                <input
                  type="datetime-local"
                  value={transferTime}
                  onChange={(e) => setTransferTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  disabled={submitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ghi chú thêm (nếu có)"
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                  disabled={submitting}
                />
              </div>

              <div className="p-3 bg-amber-50 rounded border border-amber-200 text-xs text-amber-800">
                <strong>⚠️ Lưu ý:</strong> Hãy kiểm tra kỹ thông tin trước khi xác nhận. Sau khi xác nhận, người dùng sẽ chờ tiếp nhận tiền.
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setPaymentModal(null)}
                disabled={submitting}
                className="flex-1 py-2 bg-gray-400 text-white rounded font-medium hover:bg-gray-500 disabled:bg-gray-300"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={submitting}
                className="flex-1 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:bg-gray-300"
              >
                {submitting ? "Đang gửi..." : "✅ Xác nhận đã chuyển"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
