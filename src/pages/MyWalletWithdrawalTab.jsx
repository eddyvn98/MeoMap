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

export default function MyWalletWithdrawalTab({ scope }) {
  const { navigate, loading, setLoading, error, setError, balanceMain, setBalanceMain, balanceCoc, setBalanceCoc, balanceThuong, setBalanceThuong, transactions, setTransactions, withdrawalRequests, setWithdrawalRequests, selectedTab, setSelectedTab, withdrawalAmount, setWithdrawalAmount, bankAccount, setBankAccount, bankName, setBankName, withdrawalNote, setWithdrawalNote, withdrawalLoading, setWithdrawalLoading, withdrawalError, setWithdrawalError, showVoucherModal, setShowVoucherModal, showTopUpModal, setShowTopUpModal, userId, setUserId, getTransactionTypeLabel, getTransactionColor, getTransactionSign, loadData, handleWithdrawalRequest } = scope;
  return (
    <>
      {/* Withdrawal Tab */}
      {selectedTab === "withdrawal" && (
      <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-4">Rút tiền (Ví chính + Ví thưởng)</h2>
      
      {/* Current Balance Display */}
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg space-y-1">
      <div className="text-sm text-green-700">Số dư có thể rút (main + thưởng)</div>
      <div className="text-2xl font-bold text-green-900">
      {formatVND(balanceMain + balanceThuong)}
      </div>
      <div className="text-xs text-green-700">Ví chính: {formatVND(balanceMain)} | Ví thưởng: {formatVND(balanceThuong)}</div>
      </div>
      
      {/* Withdrawal Form */}
      <div className="p-6 border rounded-lg bg-white space-y-4">
      <div>
      <label className="block text-sm font-medium mb-2">
      Số tiền muốn rút (tối thiểu 50.000đ)
      </label>
      <input
      type="number"
      value={withdrawalAmount}
      onChange={(e) => setWithdrawalAmount(e.target.value)}
      placeholder="Ví dụ: 100000"
      className="w-full px-3 py-2 border rounded-lg"
      disabled={withdrawalLoading}
      />
      {/* Quick amount buttons */}
      <div className="flex gap-2 mt-2 flex-wrap">
      {balanceMain + balanceThuong >= 50000 && (
      <button
      type="button"
      onClick={() => setWithdrawalAmount("50000")}
      className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
      disabled={withdrawalLoading}
      >
      50k
      </button>
      )}
      {balanceMain + balanceThuong >= 100000 && (
      <button
      type="button"
      onClick={() => setWithdrawalAmount("100000")}
      className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
      disabled={withdrawalLoading}
      >
      100k
      </button>
      )}
      {balanceMain + balanceThuong >= 200000 && (
      <button
      type="button"
      onClick={() => setWithdrawalAmount("200000")}
      className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
      disabled={withdrawalLoading}
      >
      200k
      </button>
      )}
      {balanceMain + balanceThuong >= 500000 && (
      <button
      type="button"
      onClick={() => setWithdrawalAmount("500000")}
      className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
      disabled={withdrawalLoading}
      >
      500k
      </button>
      )}
      {balanceMain + balanceThuong > 0 && (
      <button
      type="button"
      onClick={() => setWithdrawalAmount((balanceMain + balanceThuong).toString())}
      className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium"
      disabled={withdrawalLoading}
      >
      Rút tối đa
      </button>
      )}
      </div>
      </div>
      
      <div>
      <label className="block text-sm font-medium mb-1">
      Số tài khoản ngân hàng
      </label>
      <input
      type="text"
      value={bankAccount}
      onChange={(e) => setBankAccount(e.target.value)}
      placeholder="Ví dụ: 0123456789"
      className="w-full px-3 py-2 border rounded-lg"
      disabled={withdrawalLoading}
      />
      </div>
      
      <div>
      <label className="block text-sm font-medium mb-1">
      Tên ngân hàng
      </label>
      <input
      type="text"
      value={bankName}
      onChange={(e) => setBankName(e.target.value)}
      placeholder="Ví dụ: Vietcombank, ACB, Techcombank"
      className="w-full px-3 py-2 border rounded-lg"
      disabled={withdrawalLoading}
      />
      </div>
      
      <div>
      <label className="block text-sm font-medium mb-1">
      Ghi chú (tùy chọn)
      </label>
      <textarea
      value={withdrawalNote}
      onChange={(e) => setWithdrawalNote(e.target.value)}
      placeholder="Thông tin bổ sung nếu có"
      className="w-full px-3 py-2 border rounded-lg"
      rows={2}
      disabled={withdrawalLoading}
      />
      </div>
      
      {withdrawalError && (
      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
      {withdrawalError}
      </div>
      )}
      
      <button
      onClick={handleWithdrawalRequest}
      disabled={withdrawalLoading}
      className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400"
      >
      {withdrawalLoading ? "Đang xử lý..." : "Tạo yêu cầu rút tiền"}
      </button>
      
      <div className="text-xs text-gray-600 space-y-1">
      <p>• Admin sẽ xem xét và chuyển khoản trong vòng 24-48 giờ</p>
      <p>• Miễn phí rút tiền (0đ phí xử lý)</p>
      <p>• Vui lòng kiểm tra thông tin tài khoản chính xác trước khi gửi</p>
      </div>
      </div>
      
      {/* Withdrawal History */}
      <div className="mt-8">
      <h3 className="text-lg font-semibold mb-3">Lịch sử yêu cầu rút tiền</h3>
      {withdrawalRequests.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
      Chưa có yêu cầu rút tiền nào
      </div>
      ) : (
      <div className="space-y-3">
      {withdrawalRequests.map((req) => {
      const statusDisplay = getWithdrawalStatusDisplay(req.status);
      return (
      <div key={req.id} className="p-4 border rounded-lg bg-white">
      <div className="flex justify-between items-start mb-2">
      <div className="font-bold text-lg">{formatVND(req.amount)}</div>
      <span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusDisplay.color}`}>
      {statusDisplay.icon} {statusDisplay.text}
      </span>
      </div>
      <div className="text-sm text-gray-600 space-y-1">
      <div>Ngân hàng: <strong>{req.bank_name}</strong></div>
      <div>STK: <strong>{req.bank_account}</strong></div>
      <div>Yêu cầu lúc: {new Date(req.created_at).toLocaleString("vi-VN")}</div>
      {req.processed_at && (
      <div>Xử lý lúc: {new Date(req.processed_at).toLocaleString("vi-VN")}</div>
      )}
      {req.admin_note && (
      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
      Ghi chú admin: {req.admin_note}
      </div>
      )}
      </div>
      </div>
      );
      })}
      </div>
      )}
      </div>
      </div>
      )}
      
    </>
  );
}
