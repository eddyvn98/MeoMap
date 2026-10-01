import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { getUserWallet, formatVND } from "../services/walletService";

export default function UserDashboardDepositsTab({ scope }) {
  const { navigate, user, loadingUser, searchParams, urlTab, initialTab, activeTab, setActiveTab, posts, setPosts, loadingPosts, setLoadingPosts, deposits, setDeposits, loadingDeposits, setLoadingDeposits, rescues, setRescues, loadingRescues, setLoadingRescues, walletCredit, setWalletCredit, walletTransactions, setWalletTransactions, loadingWallet, setLoadingWallet, reputation, setReputation, loadingReputation, setLoadingReputation, reports, setReports, reportPets, setReportPets, loadingReports, setLoadingReports, error, setError, mapPetStatus, groupedDeposits } = scope;
  return (
    <>
      {/* TAB 2: CỌC & GIAO DỊCH CỦA TÔI */}
      {activeTab === "deposits" && (
      <section>
      {loadingDeposits && (
      <div className="text-xs text-gray-600">Đang tải danh sách…</div>
      )}
      
      {!loadingDeposits && deposits.length === 0 && (
      <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded">
      Bạn chưa đặt cọc bất kỳ mèo nào.
      </div>
      )}
      
      <div className="space-y-4">
      {[
      { title: "Cọc đang chờ xác nhận tiền", list: groupedDeposits.waitingPayment },
      { title: "Đang chờ giao mèo", list: groupedDeposits.waitingDelivery },
      { title: "Lịch sử cọc", list: groupedDeposits.history },
      ].map((section) => (
      <div key={section.title} className="space-y-2">
      <div className="text-[11px] font-semibold text-gray-700">{section.title}</div>
      {section.list.length === 0 ? (
      <div className="text-[11px] text-gray-500 bg-gray-50 border rounded p-2">Chưa có mục nào.</div>
      ) : (
      <div className="space-y-2">
      {section.list.map((deposit) => (
      <div
      key={deposit.id}
      className="border rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition text-xs"
      >
      <div className="flex justify-between items-start mb-2">
      <div className="font-semibold">
      {deposit.pets?.name || "Mèo"} (#{deposit.id.slice(0, 6)})
      </div>
      <span className="px-2 py-1 rounded text-[11px] font-medium bg-blue-100 text-blue-800">
      {deposit.status} / {deposit.payment_status || "payment?"}
      </span>
      </div>
      <div className="space-y-1 text-gray-600">
      <div>Số tiền: {(deposit.amount || 0).toLocaleString()} đ</div>
      <div>Trạng thái giao: {deposit.delivery_status || "Chưa giao"}</div>
      </div>
      {section.title === "Đang chờ giao mèo" && (
      <button
      className="mt-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
      onClick={() => navigate(`/deposit/${deposit.id}/ticket`)}
      >
      Xem QR giao mèo →
      </button>
      )}
      </div>
      ))}
      </div>
      )}
      </div>
      ))}
      </div>
      </section>
      )}
      
    </>
  );
}
