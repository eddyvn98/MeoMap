import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  getUserWallet,
  getWalletTransactions,
  createWithdrawalRequest,
  getWithdrawalRequests,
  formatVND,
  getWithdrawalStatusDisplay
} from "../services/walletService";
import VoucherConversionModal from "../components/VoucherConversionModal";
import MyVouchersTab from "../components/MyVouchersTab";
import TopUpModal from "../components/TopUpModal";

export default function MyWalletOverviewTab({ scope }) {
  const { navigate, loading, setLoading, error, setError, balanceMain, setBalanceMain, balanceCoc, setBalanceCoc, balanceThuong, setBalanceThuong, transactions, setTransactions, withdrawalRequests, setWithdrawalRequests, selectedTab, setSelectedTab, withdrawalAmount, setWithdrawalAmount, bankAccount, setBankAccount, bankName, setBankName, withdrawalNote, setWithdrawalNote, withdrawalLoading, setWithdrawalLoading, withdrawalError, setWithdrawalError, showVoucherModal, setShowVoucherModal, showTopUpModal, setShowTopUpModal, userId, setUserId, getTransactionTypeLabel, getTransactionColor, getTransactionSign, loadData, handleWithdrawalRequest } = scope;
  return (
    <>
      {/* Overview Tab */}
      {selectedTab === "overview" && (
      <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Balance MAIN Card */}
      <div className="p-6 border-2 border-blue-300 rounded-lg bg-blue-50">
      <div className="flex items-center gap-2 mb-2">
      <span className="text-2xl">💳</span>
      <h2 className="text-lg font-bold text-blue-800">Ví Chính</h2>
      </div>
      <div className="text-3xl font-bold text-blue-900 mb-2">
      {formatVND(balanceMain)}
      </div>
      <div className="text-sm text-blue-700 space-y-1">
      <p>• Ví cá nhân nạp/rút tự do</p>
      <p>• Dùng mua hàng và cọc</p>
      </div>
      <div className="grid grid-cols-1 gap-2 mt-4">
      <button
      onClick={() => setShowTopUpModal(true)}
      className="py-2 px-3 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm"
      >
      ➕ Nạp Tiền
      </button>
      </div>
      </div>
      
      {/* Balance COC Card */}
      <div className="p-6 border-2 border-orange-300 rounded-lg bg-orange-50">
      <div className="flex items-center gap-2 mb-2">
      <span className="text-2xl">🔒</span>
      <h2 className="text-lg font-bold text-orange-800">Ví Cọc</h2>
      </div>
      <div className="text-3xl font-bold text-orange-900 mb-2">
      {formatVND(balanceCoc)}
      </div>
      <div className="text-sm text-orange-700 space-y-1">
      <p>• Tiền cọc (Deposit Escrow)</p>
      <p>• <strong>KHÔNG RÚT ĐƯỢC</strong> về ngân hàng</p>
      <p>• Chỉ dùng cho cọc mới hoặc đổi voucher</p>
      </div>
      <div className="grid grid-cols-1 gap-2 mt-4">
      <button
      onClick={() => setShowVoucherModal(true)}
      className="py-2 px-3 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600 transition flex items-center justify-center gap-2 text-sm"
      >
      💳 Đổi Voucher
      </button>
      </div>
      </div>
      
      {/* Balance THUONG Card */}
      <div className="p-6 border-2 border-green-300 rounded-lg bg-green-50">
      <div className="flex items-center gap-2 mb-2">
      <span className="text-2xl">🎁</span>
      <h2 className="text-lg font-bold text-green-800">Ví Thưởng</h2>
      </div>
      <div className="text-3xl font-bold text-green-900 mb-2">
      {formatVND(balanceThuong)}
      </div>
      <div className="text-sm text-green-700 space-y-1">
      <p>• Tiền thưởng (Rewards)</p>
      <p>• <strong>RÚT ĐƯỢC</strong> qua chuyển khoản ngân hàng</p>
      <p>• Nhận từ báo cáo, bounty, sự kiện</p>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-4">
      <button
      onClick={() => setShowVoucherModal(true)}
      className="py-2 px-3 bg-green-500 text-white rounded font-semibold hover:bg-green-600 transition flex items-center justify-center gap-2 text-sm"
      >
      💳 Quy đổi Voucher
      </button>
      <button
      onClick={() => setSelectedTab("withdrawal")}
      className="py-2 px-3 bg-green-600 text-white rounded font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm"
      >
      🏦 Rút Tiền
      </button>
      </div>
      </div>
      </div>
      
      {/* Policy Summary */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="font-semibold text-blue-900 mb-2">📋 Chính sách ví</h3>
      <ul className="text-sm text-blue-800 space-y-1">
      <li>• Tiền cọc hoàn lại sẽ vào <strong>Ví cọc</strong> (chỉ quy đổi voucher)</li>
      <li>• Tiền thưởng từ hệ thống vào <strong>Ví thưởng</strong> (rút được)</li>
      <li>• Rút tiền: tối thiểu 50.000đ, admin duyệt trong 24-48h</li>
      <li>• Phí rút tiền: 0đ (miễn phí hoàn toàn)</li>
      </ul>
      </div>
      
      {/* Recent Withdrawal Requests */}
      {withdrawalRequests.length > 0 && (
      <div>
      <h3 className="text-lg font-semibold mb-3">Yêu cầu rút tiền gần đây</h3>
      <div className="space-y-2">
      {withdrawalRequests.slice(0, 3).map((req) => {
      const statusDisplay = getWithdrawalStatusDisplay(req.status);
      return (
      <div key={req.id} className="p-3 border rounded-lg bg-white">
      <div className="flex justify-between items-start">
      <div>
      <div className="font-semibold">{formatVND(req.amount)}</div>
      <div className="text-xs text-gray-600">
      {new Date(req.created_at).toLocaleString("vi-VN")}
      </div>
      <div className="text-xs text-gray-600">
      {req.bank_name} - {req.bank_account}
      </div>
      </div>
      <span className={`px-2 py-1 rounded text-xs font-medium ${statusDisplay.color}`}>
      {statusDisplay.icon} {statusDisplay.text}
      </span>
      </div>
      </div>
      );
      })}
      </div>
      </div>
      )}
      </div>
      )}
      
    </>
  );
}
