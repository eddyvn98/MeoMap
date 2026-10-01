import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { getUserWallet, formatVND } from "../services/walletService";

export default function UserDashboardWalletTab({ scope }) {
  const { navigate, user, loadingUser, searchParams, urlTab, initialTab, activeTab, setActiveTab, posts, setPosts, loadingPosts, setLoadingPosts, deposits, setDeposits, loadingDeposits, setLoadingDeposits, rescues, setRescues, loadingRescues, setLoadingRescues, walletCredit, setWalletCredit, walletTransactions, setWalletTransactions, loadingWallet, setLoadingWallet, reputation, setReputation, loadingReputation, setLoadingReputation, reports, setReports, reportPets, setReportPets, loadingReports, setLoadingReports, error, setError, mapPetStatus, groupedDeposits } = scope;
  return (
    <>
      {/* TAB 4: VÍ CỦA TÔI */}
      {activeTab === "wallet" && (
      <section>
      {loadingWallet && (
      <div className="text-xs text-gray-600">Đang tải thông tin…</div>
      )}
      
      {!loadingWallet && (
      <>
      <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white mb-4">
      <div className="text-xs opacity-90">Số dư ví</div>
      <div className="text-2xl font-bold">
      {walletCredit.toLocaleString()} đ
      </div>
      </div>
      
      <div>
      <h3 className="font-semibold text-sm mb-2">
      Lịch sử giao dịch
      </h3>
      {walletTransactions.length === 0 ? (
      <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
      Chưa có giao dịch nào.
      </div>
      ) : (
      <div className="space-y-2">
      {walletTransactions.map((tx) => (
      <div
      key={tx.id}
      className="flex justify-between items-center p-2 border rounded text-xs"
      >
      <div>
      <div className="font-medium">{tx.type}</div>
      <div className="text-gray-500">
      {tx.created_at
      ? new Date(tx.created_at).toLocaleString("vi-VN")
      : ""}
      </div>
      </div>
      <div
      className={`font-semibold ${
      tx.amount > 0 ? "text-green-600" : "text-red-600"
      }`}
      >
      {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} đ
      </div>
      </div>
      ))}
      </div>
      )}
      </div>
      </>
      )}
      </section>
      )}
      
    </>
  );
}
