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
import MyWalletOverviewTab from "./MyWalletOverviewTab";
import MyWalletTransactionsTab from "./MyWalletTransactionsTab";
import MyWalletWithdrawalTab from "./MyWalletWithdrawalTab";

export default function MyWalletPageView({ scope }) {
  const { navigate, loading, setLoading, error, setError, balanceMain, setBalanceMain, balanceCoc, setBalanceCoc, balanceThuong, setBalanceThuong, transactions, setTransactions, withdrawalRequests, setWithdrawalRequests, selectedTab, setSelectedTab, withdrawalAmount, setWithdrawalAmount, bankAccount, setBankAccount, bankName, setBankName, withdrawalNote, setWithdrawalNote, withdrawalLoading, setWithdrawalLoading, withdrawalError, setWithdrawalError, showVoucherModal, setShowVoucherModal, showTopUpModal, setShowTopUpModal, userId, setUserId, getTransactionTypeLabel, getTransactionColor, getTransactionSign, loadData, handleWithdrawalRequest } = scope;
  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header with navigation */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ví của tôi</h1>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
          >
            🔄 Làm mới
          </button>
          <button
            onClick={() => navigate("/account")}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            ← Tài khoản
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b overflow-x-auto">
        <button
          onClick={() => setSelectedTab("overview")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            selectedTab === "overview"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Tổng quan
        </button>
        <button
          onClick={() => setSelectedTab("vouchers")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            selectedTab === "vouchers"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          🎫 Voucher của tôi
        </button>
        <button
          onClick={() => setSelectedTab("transactions")}
          className={`px-4 py-2 font-medium whitespace-nowrap ${
            selectedTab === "transactions"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Lịch sử giao dịch
        </button>
        <button
          onClick={() => setSelectedTab("withdrawal")}
          className={`px-4 py-2 font-medium ${
            selectedTab === "withdrawal"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Rút tiền thưởng
        </button>
      </div>

      <MyWalletOverviewTab scope={scope} />
      <MyWalletTransactionsTab scope={scope} />
      <MyWalletWithdrawalTab scope={scope} />
      {/* Vouchers Tab */}
      {selectedTab === "vouchers" && userId && (
        <div>
          <MyVouchersTab userId={userId} />
        </div>
      )}

      {/* Top-Up Modal */}
      {userId && (
        <TopUpModal
          isOpen={showTopUpModal}
          onClose={() => setShowTopUpModal(false)}
          userId={userId}
          onSuccess={() => {
            // Reload wallet data after successful top-up
            loadData();
            setShowTopUpModal(false);
          }}
        />
      )}

      {/* Voucher Conversion Modal */}
      {userId && (
        <VoucherConversionModal
          isOpen={showVoucherModal}
          onClose={() => setShowVoucherModal(false)}
          userId={userId}
          balanceCoc={balanceCoc}
          balanceThuong={balanceThuong}
          onSuccess={() => {
            // Reload wallet data after successful conversion
            loadData();
          }}
        />
      )}
    </div>
  );
}
