import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { getUserWallet, formatVND } from "../services/walletService";

export default function UserDashboardRescuesTab({ scope }) {
  const { navigate, user, loadingUser, searchParams, urlTab, initialTab, activeTab, setActiveTab, posts, setPosts, loadingPosts, setLoadingPosts, deposits, setDeposits, loadingDeposits, setLoadingDeposits, rescues, setRescues, loadingRescues, setLoadingRescues, walletCredit, setWalletCredit, walletTransactions, setWalletTransactions, loadingWallet, setLoadingWallet, reputation, setReputation, loadingReputation, setLoadingReputation, reports, setReports, reportPets, setReportPets, loadingReports, setLoadingReports, error, setError, mapPetStatus, groupedDeposits } = scope;
  return (
    <>
      {/* TAB 3: CA CỨU HỘ CỦA TÔI */}
      {activeTab === "rescues" && (
      <section>
      {loadingRescues && (
      <div className="text-xs text-gray-600">Đang tải danh sách…</div>
      )}
      
      {!loadingRescues && rescues.length === 0 && (
      <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded">
      Bạn chưa nhận ca cứu hộ nào. Hãy vào <strong>"🚑 Cứu hộ"</strong> để tìm và nhận ca.
      </div>
      )}
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rescues.map((rescue) => {
      const isClosed = rescue.status === "delivered";
      return (
      <article
      key={rescue.id}
      className={`border rounded-lg overflow-hidden text-xs bg-white shadow-sm hover:shadow-md transition ${
      isClosed ? "opacity-75" : ""
      }`}
      >
      {rescue.image_url && (
      <img
      src={rescue.image_url}
      alt={rescue.name || "pet"}
      className="w-full h-32 object-cover"
      />
      )}
      
      <div className="p-2 space-y-1">
      <div className="font-semibold text-sm truncate">
      🚑 {rescue.name || "Không đặt tên"}
      </div>
      
      <div className="text-gray-600">Loại: 🚑 Cứu hộ</div>
      
      <div className="text-gray-600 flex items-center gap-2">
      <span>Trạng thái:</span>
      <span
      className={`px-2 py-1 rounded text-[11px] font-medium ${
      isClosed
      ? "bg-green-100 text-green-700"
      : "bg-orange-100 text-orange-700 animate-pulse"
      }`}
      >
      {isClosed ? "✅ Đã hoàn thành" : "⏳ Đang tiến hành"}
      </span>
      </div>
      
      {rescue.bounty_amount > 0 && (
      <div className="text-gray-600">
      💰 Hỗ trợ: {rescue.bounty_amount.toLocaleString()}đ
      </div>
      )}
      
      {rescue.total_donations > 0 && (
      <div className="text-gray-600">
      💜 Quyên góp: {rescue.total_donations.toLocaleString()}đ
      </div>
      )}
      
      <div className="text-[11px] text-gray-500">
      {rescue.created_at
      ? new Date(rescue.created_at).toLocaleString("vi-VN")
      : "N/A"}
      </div>
      
      <div className="flex gap-1 mt-2">
      <button
      className={`flex-1 border rounded py-1 ${
      isClosed
      ? "hover:bg-gray-50 text-gray-600"
      : "hover:bg-blue-50 text-blue-600 font-medium"
      }`}
      onClick={() => navigate(`/pet/${rescue.id}`)}
      >
      {isClosed ? "Xem chi tiết" : "🎯 Quản lý"}
      </button>
      <button
      className="flex-1 border rounded py-1 hover:bg-orange-50"
      onClick={() => navigate(`/edit-pet/${rescue.id}`)}
      >
      Sửa
      </button>
      </div>
      </div>
      </article>
      );
      })}
      </div>
      </section>
      )}
      
    </>
  );
}
