import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { getUserWallet, formatVND } from "../services/walletService";

export default function UserDashboardReportsTab({ scope }) {
  const { navigate, user, loadingUser, searchParams, urlTab, initialTab, activeTab, setActiveTab, posts, setPosts, loadingPosts, setLoadingPosts, deposits, setDeposits, loadingDeposits, setLoadingDeposits, rescues, setRescues, loadingRescues, setLoadingRescues, walletCredit, setWalletCredit, walletTransactions, setWalletTransactions, loadingWallet, setLoadingWallet, reputation, setReputation, loadingReputation, setLoadingReputation, reports, setReports, reportPets, setReportPets, loadingReports, setLoadingReports, error, setError, mapPetStatus, groupedDeposits } = scope;
  return (
    <>
      {/* TAB 6: BÁO CỦA TÔI (NGƯỜI TÌM THẤY) */}
      {activeTab === "reports" && (
      <section>
      {/* Info banner */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 mb-3">
      💡 <strong>Mẹo:</strong> Tất cả báo nhìn thấy của bạn hiển thị ở đây. Click "Xem bài đăng" để theo dõi tiến trình và liên hệ với chủ.
      </div>
      
      {loadingReports && (
      <div className="text-xs text-gray-600">Đang tải danh sách…</div>
      )}
      
      {!loadingReports && reports.length === 0 && (
      <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded">
      Chưa có báo nào. Bạn có thể báo nhìn thấy mèo bị lạc trên bản đồ.
      </div>
      )}
      
      <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
      {reports.map((r) => {
      const pet = reportPets[r.pet_id];
      const isVerified = r.metadata?.verified === true;
      const isDelivered = pet?.status === "delivered";
      const bountyAmount = pet?.bounty_amount || 0;
      
      return (
      <article
      key={r.id}
      className={`border rounded-lg overflow-hidden text-xs shadow-sm ${
      isDelivered && isVerified ? "bg-green-50" : "bg-white"
      }`}
      >
      <div className="flex gap-3 p-3">
      {pet?.image_url && (
      <img
      src={pet.image_url}
      alt={pet.name}
      className="w-16 h-16 rounded-lg object-cover"
      />
      )}
      <div className="flex-1">
      <div className="font-semibold text-sm">
      {pet?.name || `Pet #${String(r.pet_id).slice(0, 8)}`}
      </div>
      <div className="text-gray-600 text-xs mt-1">
      {new Date(r.created_at).toLocaleString("vi-VN")}
      </div>
      <div className="flex gap-2 mt-2">
      {isVerified && (
      <span className="inline-block px-2 py-0.5 bg-green-500 text-white rounded-full text-[10px] font-semibold">
      ✓ Đã xác minh
      </span>
      )}
      {isDelivered && isVerified && bountyAmount > 0 && (
      <span className="inline-block px-2 py-0.5 bg-yellow-400 text-white rounded-full text-[10px] font-semibold">
      🎁 {bountyAmount.toLocaleString()}đ
      </span>
      )}
      </div>
      </div>
      </div>
      
      {r.description && (
      <div className="px-3 pb-2 text-xs text-gray-700">
      {r.description}
      </div>
      )}
      
      {r.metadata?.location && (
      <div className="px-3 pb-2 text-xs text-gray-600">
      📍 {r.metadata.location}
      </div>
      )}
      
      <div className="px-3 pb-3">
      {isDelivered && isVerified ? (
      <>
      <div className="p-2 bg-green-100 border border-green-300 rounded-lg text-xs text-green-700 mb-2">
      ✅ Hoàn thành!{" "}
      {bountyAmount > 0
      ? `Bạn đã nhận ${bountyAmount.toLocaleString()}đ thưởng.`
      : "Cảm ơn bạn đã giúp đỡ!"}
      </div>
      <button
      onClick={() => navigate(`/pet/${r.pet_id}`)}
      className="w-full px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold"
      >
      📄 Xem bài đăng
      </button>
      </>
      ) : (
      <>
      <button
      onClick={() => navigate(`/pet/${r.pet_id}`)}
      className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold mb-2"
      >
      📄 Xem bài đăng & theo dõi
      </button>
      
      <div className="flex gap-2">
      <button
      onClick={() => {
      window.dispatchEvent(
      new CustomEvent("open-qr-modal", {
      detail: { petId: r.pet_id, mode: "lost" },
      })
      );
      }}
      className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold"
      >
      📱 Hiện QR
      </button>
      <button
      onClick={() => {
      if (
      !confirm(
      "Bạn chắc chắn muốn Hủy nhận thưởng? Tiền sẽ về ví người đăng (không rút, chỉ đổi voucher)."
      )
      )
      return;
      window.dispatchEvent(
      new CustomEvent("lost-cancel-reward", {
      detail: { petId: r.pet_id },
      })
      );
      }}
      className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
      >
      Hủy thưởng
      </button>
      </div>
      
      <div className="text-xs text-gray-600 mt-2">
      💡 Xem bài đăng để liên hệ chủ, theo dõi trạng thái xác minh và xác nhận giao mèo.
      </div>
      </>
      )}
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
