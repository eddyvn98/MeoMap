import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { formatVND } from "../services/walletService";

export default function AdminTopupsPageView({ scope }) {
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
    topups,
    setTopups,
    filterStatus,
    setFilterStatus,
    submitting,
    setSubmitting,
    loadData,
    handleAccept,
    handleReject,
    getStatusDisplay,
  } = scope;

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Quản lý nạp tiền</h1>
        <p className="text-gray-600">Xác nhận các yêu cầu nạp tiền từ người dùng</p>
      </div>

      {error && <div className="p-4 bg-red-100 text-red-800 rounded mb-4">{error}</div>}

      {/* Filter */}
      <div className="mb-6 flex gap-4 items-center">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-white"
        >
          <option value="pending">⏳ Chờ xác nhận</option>
          <option value="processing">🔄 Đang xử lý</option>
          <option value="success">✅ Thành công</option>
          <option value="failed">❌ Thất bại</option>
          <option value="all">📋 Tất cả</option>
        </select>

        <div className="text-sm text-gray-600">
          Tổng: <strong>{topups.length}</strong> yêu cầu
        </div>

        <button
          onClick={loadData}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          🔄 Tải lại
        </button>
      </div>

      {/* Topup List */}
      <div className="space-y-4">
        {topups.length === 0 ? (
          <div className="p-8 text-center text-gray-600 bg-white rounded-lg border">
            Không có yêu cầu nạp tiền nào
          </div>
        ) : (
          topups.map((topup) => {
            const status = getStatusDisplay(topup.status);
            const isPending = topup.topup_status === "pending";
            
            return (
              <div
                key={topup.id}
                className="p-6 border rounded-lg bg-white shadow-sm hover:shadow-md transition"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-bold text-2xl text-blue-600">
                        {formatVND(topup.amount)}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                        {status.icon} {status.text}
                      </span>
                    </div>
                    
                    <div className="text-sm space-y-1 text-gray-700">
                      <div>
                        <strong>Mã giao dịch:</strong>{" "}
                        <span className="font-mono font-bold text-lg text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {topup.order_code}
                        </span>
                      </div>
                      <div>
                        <strong>Người dùng:</strong>{" "}
                        {topup.user?.display_name || topup.user?.email || `User #${topup.user_id}`}
                      </div>
                      <div>
                        <strong>Email:</strong> {topup.user?.email || "N/A"}
                      </div>
                      <div>
                        <strong>Phương thức:</strong> {topup.payment_method || "manual"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bank Transfer Info */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                  <div className="text-sm font-semibold text-blue-900 mb-2">
                    💳 Thông tin chuyển khoản
                  </div>
                  <div className="text-sm space-y-1 text-blue-900">
                    <div>
                      <strong>Ngân hàng:</strong> {import.meta.env.VITE_BANK_NAME || "Techcombank"}
                    </div>
                    <div>
                      <strong>Số tài khoản:</strong> {import.meta.env.VITE_BANK_ACCOUNT_NUMBER || "19073263957014"}
                    </div>
                    <div>
                      <strong>Chủ TK:</strong> {import.meta.env.VITE_BANK_ACCOUNT_HOLDER || "HA THANH TU"}
                    </div>
                    <div>
                      <strong>Nội dung CK:</strong>{" "}
                      <code className="bg-white px-2 py-1 rounded font-mono font-bold text-blue-600">
                        {topup.order_code}
                      </code>
                    </div>
                  </div>
                </div>

                {/* QR Code (if available) */}
                {topup.qr_code_url && (
                  <div className="mb-4">
                    <img
                      src={topup.qr_code_url}
                      alt="QR Code"
                      className="w-48 h-48 mx-auto border rounded"
                    />
                  </div>
                )}

                {/* Timeline */}
                <div className="p-3 bg-gray-50 rounded text-xs text-gray-600 space-y-1 mb-4">
                  <div>📅 Tạo lúc: {new Date(topup.created_at).toLocaleString("vi-VN")}</div>
                  {topup.paid_at && (
                    <div className="text-blue-700">
                      💰 Đã thanh toán: {new Date(topup.paid_at).toLocaleString("vi-VN")}
                    </div>
                  )}
                  {topup.confirmed_at && (
                    <div className="text-green-700">
                      ✅ Đã xác nhận: {new Date(topup.confirmed_at).toLocaleString("vi-VN")}
                    </div>
                  )}
                </div>

                {/* Transaction Info */}
                {topup.transaction_id && (
                  <div className="p-3 bg-green-50 rounded border border-green-200 mb-4">
                    <div className="text-sm space-y-1 text-green-800">
                      <div>
                        <strong>Mã giao dịch:</strong> {topup.transaction_id}
                      </div>
                      {topup.payment_description && (
                        <div>
                          <strong>Mô tả:</strong> {topup.payment_description}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {topup.notes && (
                  <div className="p-3 bg-yellow-50 rounded border border-yellow-200 mb-4">
                    <div className="text-sm text-yellow-800">
                      <strong>Ghi chú:</strong> {topup.notes}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {isPending && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => handleAccept(topup)}
                      disabled={submitting === topup.id}
                      className="flex-1 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {submitting === topup.id ? "Đang xử lý..." : "✅ Xác nhận nạp tiền"}
                    </button>
                    
                    <button
                      onClick={() => handleReject(topup)}
                      disabled={submitting === topup.id}
                      className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      ❌ Từ chối
                    </button>
                  </div>
                )}

                {topup.status === "success" && (
                  <div className="p-3 bg-green-100 rounded text-center text-green-800 font-semibold">
                    ✅ Đã xác nhận và cộng tiền vào ví user
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-yellow-800 text-sm font-semibold">Chờ xác nhận</div>
          <div className="text-2xl font-bold text-yellow-900">
            {topups.filter((t) => t.status === "pending").length}
          </div>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-blue-800 text-sm font-semibold">Đang xử lý</div>
          <div className="text-2xl font-bold text-blue-900">
            {topups.filter((t) => t.status === "processing").length}
          </div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="text-green-800 text-sm font-semibold">Thành công</div>
          <div className="text-2xl font-bold text-green-900">
            {topups.filter((t) => t.status === "success").length}
          </div>
        </div>
        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="text-red-800 text-sm font-semibold">Thất bại</div>
          <div className="text-2xl font-bold text-red-900">
            {topups.filter((t) => t.status === "failed").length}
          </div>
        </div>
      </div>
    </div>
  );
}
