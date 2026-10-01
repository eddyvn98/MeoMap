import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { getUserWallet, formatVND } from "../services/walletService";
import UserDashboardPostsTab from "./UserDashboardPostsTab";
import UserDashboardDepositsTab from "./UserDashboardDepositsTab";
import UserDashboardRescuesTab from "./UserDashboardRescuesTab";
import UserDashboardWalletTab from "./UserDashboardWalletTab";
import UserDashboardReputationTab from "./UserDashboardReputationTab";
import UserDashboardReportsTab from "./UserDashboardReportsTab";

export default function UserDashboardView({ scope }) {
  const { navigate, user, loadingUser, searchParams, urlTab, initialTab, activeTab, setActiveTab, posts, setPosts, loadingPosts, setLoadingPosts, deposits, setDeposits, loadingDeposits, setLoadingDeposits, rescues, setRescues, loadingRescues, setLoadingRescues, walletCredit, setWalletCredit, walletTransactions, setWalletTransactions, loadingWallet, setLoadingWallet, reputation, setReputation, loadingReputation, setLoadingReputation, reports, setReports, reportPets, setReportPets, loadingReports, setLoadingReports, error, setError, mapPetStatus, groupedDeposits } = scope;
  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* HEADER */}
      <header className="flex items-center justify-between border-b pb-2 mb-2">
        <div>
          <div className="font-bold text-lg">Trung tâm tài khoản</div>
          <div className="text-xs text-gray-600">
            Tài khoản: {user?.email}
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            className="px-3 py-1 border rounded hover:bg-gray-100"
            onClick={() => navigate("/")}
          >
            Về trang chủ
          </button>
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => navigate("/report")}
          >
            Đăng bài mới
          </button>
        </div>
      </header>

      {/* TABS NAVIGATION */}
      <div className="flex gap-2 flex-wrap text-xs border-b">
        {[
          { id: "posts", label: "📝 Bài đăng của tôi (Người đăng)" },
          { id: "deposits", label: "💰 Cọc & giao dịch của tôi (Người nhận)" },
          { id: "rescues", label: "🚑 Ca cứu hộ của tôi (Người cứu)" },
          { id: "reports", label: "👀 Báo của tôi (Người tìm thấy)" },
          { id: "wallet", label: "💳 Ví của tôi" },
          { id: "reputation", label: "⭐ Uy tín của tôi" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-orange-500 text-orange-600 bg-orange-50"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          {error}
        </div>
      )}

      {/* TAB CONTENT */}

        <UserDashboardPostsTab scope={scope} />
        <UserDashboardDepositsTab scope={scope} />
        <UserDashboardRescuesTab scope={scope} />
        <UserDashboardWalletTab scope={scope} />
        <UserDashboardReputationTab scope={scope} />
        <UserDashboardReportsTab scope={scope} />
      {/* FOOTER */}
      <footer className="pt-4 border-t mt-4 text-center text-[11px] text-gray-500">
        Pet Rescue • Trung tâm tài khoản
      </footer>
    </div>
  );
}
