import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { getUserWallet, formatVND } from "../services/walletService";

export default function UserDashboardPostsTab({ scope }) {
  const { navigate, user, loadingUser, searchParams, urlTab, initialTab, activeTab, setActiveTab, posts, setPosts, loadingPosts, setLoadingPosts, deposits, setDeposits, loadingDeposits, setLoadingDeposits, rescues, setRescues, loadingRescues, setLoadingRescues, walletCredit, setWalletCredit, walletTransactions, setWalletTransactions, loadingWallet, setLoadingWallet, reputation, setReputation, loadingReputation, setLoadingReputation, reports, setReports, reportPets, setReportPets, loadingReports, setLoadingReports, error, setError, mapPetStatus, groupedDeposits } = scope;
  return (
    <>
      {/* TAB 1: BÀI ĐĂNG CỦA TÔI */}
      {activeTab === "posts" && (
      <section>
      {loadingPosts && (
      <div className="text-xs text-gray-600">Đang tải danh sách…</div>
      )}
      
      {!loadingPosts && posts.length === 0 && (
      <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded">
      Bạn chưa có bài đăng nào. Hãy bấm "Đăng bài mới".
      </div>
      )}
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((pet) => {
      const statusInfo = mapPetStatus(pet.status);
      return (
      <article
      key={pet.id}
      className="border rounded-lg overflow-hidden text-xs bg-white shadow-sm hover:shadow-md transition"
      >
      {pet.image_url && (
      <img
      src={pet.image_url}
      alt={pet.name || "pet"}
      className="w-full h-32 object-cover"
      />
      )}
      
      <div className="p-2 space-y-1">
      <div className="font-semibold text-sm truncate">
      {pet.name || "Không đặt tên"}
      </div>
      
      <div className="text-gray-600">
      Loại: {
      pet.category === "rescue" ? "🚑 Cứu hộ" :
      pet.category === "lost" ? "🔍 Đi lạc" :
      "🟢 Nhận nuôi"
      }
      </div>
      
      <div className="text-gray-600 flex items-center gap-2">
      <span>Trạng thái:</span>
      <span className={`px-2 py-1 rounded text-[11px] font-medium ${statusInfo.color}`}>
      {statusInfo.label}
      </span>
      </div>
      
      <div className="text-[11px] text-gray-500">
      {pet.created_at
      ? new Date(pet.created_at).toLocaleString("vi-VN")
      : "N/A"}
      </div>
      
      <div className="flex gap-1 mt-2">
      <button
      className="flex-1 border rounded py-1 hover:bg-blue-50"
      onClick={() => navigate(`/pet/${pet.id}`)}
      >
      Xem
      </button>
      <button
      className="flex-1 border rounded py-1 hover:bg-gray-50"
      onClick={() => navigate(`/edit-pet/${pet.id}`)}
      >
      Sửa
      </button>
      {pet.category === "adopt" && (
      <button
      className="flex-1 border rounded py-1 hover:bg-orange-50"
      onClick={() => navigate(`/account/adopt/${pet.id}/applicants`)}
      >
      Người đăng ký
      </button>
      )}
      {pet.category === "rescue" && (
      <button
      className="flex-1 border rounded py-1 hover:bg-orange-50 text-orange-600 font-medium"
      onClick={() => navigate(`/pet/${pet.id}`)}
      >
      Xem ca cứu
      </button>
      )}
      {pet.category === "lost" && (
      <button
      className="flex-1 border rounded py-1 hover:bg-red-50 text-red-600 font-medium"
      onClick={() => navigate(`/pet/${pet.id}`)}
      >
      Xem báo tin
      </button>
      )}
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
