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

export default function MyWalletTransactionsTab({ scope }) {
  const { navigate, loading, setLoading, error, setError, balanceMain, setBalanceMain, balanceCoc, setBalanceCoc, balanceThuong, setBalanceThuong, transactions, setTransactions, withdrawalRequests, setWithdrawalRequests, selectedTab, setSelectedTab, withdrawalAmount, setWithdrawalAmount, bankAccount, setBankAccount, bankName, setBankName, withdrawalNote, setWithdrawalNote, withdrawalLoading, setWithdrawalLoading, withdrawalError, setWithdrawalError, showVoucherModal, setShowVoucherModal, showTopUpModal, setShowTopUpModal, userId, setUserId, getTransactionTypeLabel, getTransactionColor, getTransactionSign, loadData, handleWithdrawalRequest } = scope;
  return (
    <>
      {/* Transactions Tab */}
      {selectedTab === "transactions" && (
      <div>
      <h2 className="text-xl font-semibold mb-4">Lịch sử giao dịch</h2>
      {transactions.length === 0 ? (
      <div className="text-center py-8 text-gray-500">
      Chưa có giao dịch nào
      </div>
      ) : (
      <div className="overflow-x-auto">
      <table className="w-full text-sm border">
      <thead className="bg-gray-100">
      <tr>
      <th className="px-3 py-2 text-left">Thời gian</th>
      <th className="px-3 py-2 text-left">Loại</th>
      <th className="px-3 py-2 text-left">Nguồn</th>
      <th className="px-3 py-2 text-right">Số tiền</th>
      <th className="px-3 py-2 text-left">Ghi chú</th>
      </tr>
      </thead>
      <tbody>
      {transactions.map((tx) => (
      <tr key={tx.id} className="border-t hover:bg-gray-50">
      <td className="px-3 py-2 text-xs">
      {new Date(tx.created_at).toLocaleString("vi-VN")}
      </td>
      <td className="px-3 py-2 text-xs font-medium">
      {getTransactionTypeLabel(tx.type)}
      </td>
      <td className="px-3 py-2">
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
      tx.source_type === "coc"
      ? "bg-orange-100 text-orange-800"
      : "bg-green-100 text-green-800"
      }`}>
      {tx.source_type === "coc" ? "COC" : "THUONG"}
      </span>
      </td>
      <td className={`px-3 py-2 text-right font-semibold ${getTransactionColor(tx.type)}`}>
      {getTransactionSign(tx.type)}{formatVND(Math.abs(tx.amount))}
      </td>
      <td className="px-3 py-2 text-xs text-gray-600">
      {tx.note || "-"}
      </td>
      </tr>
      ))}
      </tbody>
      </table>
      </div>
      )}
      </div>
      )}
      
    </>
  );
}
