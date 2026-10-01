import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { getUserWallet, formatVND } from "../services/walletService";

export default function UserDashboardReputationTab({ scope }) {
  const { navigate, user, loadingUser, searchParams, urlTab, initialTab, activeTab, setActiveTab, posts, setPosts, loadingPosts, setLoadingPosts, deposits, setDeposits, loadingDeposits, setLoadingDeposits, rescues, setRescues, loadingRescues, setLoadingRescues, walletCredit, setWalletCredit, walletTransactions, setWalletTransactions, loadingWallet, setLoadingWallet, reputation, setReputation, loadingReputation, setLoadingReputation, reports, setReports, reportPets, setReportPets, loadingReports, setLoadingReports, error, setError, mapPetStatus, groupedDeposits } = scope;
  return (
    <>
      {/* TAB 5: UY TÍN CỦA TÔI */}
      {activeTab === "reputation" && (
      <section>
      {loadingReputation && (
      <div className="text-xs text-gray-600">Đang tải thông tin…</div>
      )}
      
      {!loadingReputation && reputation ? (
      <div className="grid gap-3 sm:grid-cols-2">
      <div className="p-3 border rounded-lg bg-blue-50">
      <div className="text-xs text-gray-600">Tổng giao dịch</div>
      <div className="text-2xl font-bold text-blue-600">
      {reputation.total_trades || 0}
      </div>
      </div>
      <div className="p-3 border rounded-lg bg-green-50">
      <div className="text-xs text-gray-600">Giao dịch tốt</div>
      <div className="text-2xl font-bold text-green-600">
      {reputation.ok_trades || 0}
      </div>
      </div>
      <div className="p-3 border rounded-lg bg-red-50">
      <div className="text-xs text-gray-600">Giao dịch xấu</div>
      <div className="text-2xl font-bold text-red-600">
      {reputation.bad_trades || 0}
      </div>
      </div>
      <div className="p-3 border rounded-lg bg-yellow-50">
      <div className="text-xs text-gray-600">Điểm uy tín</div>
      <div className="text-2xl font-bold text-yellow-600">
      {reputation.reputation_score || 0}
      </div>
      </div>
      </div>
      ) : (
      <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded">
      Chưa có đánh giá uy tín. Hoàn thành một số giao dịch để nhận đánh
      giá.
      </div>
      )}
      </section>
      )}
      
    </>
  );
}
