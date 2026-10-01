import { useState } from "react";
import ContactExchangeCard from "./ContactExchangeCard";
import ConfirmHandoverPanel from "./ConfirmHandoverPanel";
import LostProgressBar from "./LostProgressBar";
import LostOwnerInteractionSection from "./LostOwnerInteractionSection";

export default function LostPetOwnerView({ pet, owner, isOwner, sightings, onMarkAsFound, onDelete, onEdit, onVerifySighting, onGeneratePoster, onHandleShare }) {
  const [expandedSighting, setExpandedSighting] = useState(null);
  
  const isFound = pet.status === "delivered";
  const createdDate = new Date(pet.created_at);
  const now = new Date();
  const daysAgo = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
  const verifiedSightings = sightings.filter(s => s.metadata?.verified === true).length;
  const unverifiedSightings = sightings.length - verifiedSightings;

  // Gợi ý tìm kiếm
  const renderRecommendations = () => {
    const tips = [];
    
    if (sightings.length > 0) {
      tips.push("✔ Đi kiểm tra các điểm sighting gần nhất");
      tips.push("✔ In poster và dán quanh bán kính 300m");
      tips.push("✔ Kiểm tra camera các nhà dân gần đó");
    } else {
      tips.push("📌 Cập nhật lại mô tả và ảnh mèo");
      tips.push("📌 Đăng lại bài trong nhóm Facebook khu vực");
      tips.push("📌 Chia sẻ bài với bạn bè để mở rộng tìm kiếm");
    }
    
    if (daysAgo >= 3 && unverifiedSightings < 2) {
      tips.push("⚠️ Bài đã lâu mà ít sighting, hãy tăng cường tìm kiếm");
    }
    
    return tips;
  };

  console.log("[LostPetOwnerView] Rendering with:", { pet: pet?.id, sightingsCount: sightings?.length, isOwner });

  return (
    <div className="space-y-4">
      {/* Progress for lost flow */}
      <section className="p-3 bg-indigo-50 border rounded-lg">
        <LostProgressBar currentStep={isFound ? 4 : sightings.length > 0 ? 1 : 0} />
      </section>
      {/* ========== OWNER HEADER BADGES ========== */}
      <section className="relative bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-400">
        <div className="relative w-full h-64 bg-gray-200">
          {pet.image_url ? (
            <img
              src={pet.image_url}
              alt={pet.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
              Không có ảnh
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-4 right-4 space-y-2 flex flex-col">
            {/* Status badge */}
            <div
              className={`px-4 py-2 rounded-full font-semibold text-white text-sm ${
                isFound ? "bg-green-500" : "bg-red-500 animate-pulse"
              }`}
            >
              {isFound ? "✅ Đã tìm thấy" : "🔴 Đang thất lạc"}
            </div>

            {/* Owner badge */}
            <div className="px-3 py-1 rounded-full bg-purple-500 text-white text-xs font-semibold">
              🔍 Bài của bạn
            </div>

            {/* Stats badge */}
            <div className="px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-semibold">
              📊 {sightings.length} báo
            </div>
          </div>

          {/* Category badge */}
          <div className="absolute top-4 left-4">
            <div className="px-3 py-1 rounded-full bg-blue-500 text-white text-xs font-semibold">
              Mèo đi lạc
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-b">
          <h3 className="text-2xl font-bold text-gray-900">{pet.name}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Đăng bởi: {owner?.display_name || "Bạn"}
          </p>
        </div>
      </section>

      {/* ========== OWNER ACTIONS BLOCK ========== */}
      <section className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
        <h3 className="font-bold text-blue-900 mb-3">⚙️ Hành động quản lý</h3>

        {/* Main actions */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <button
            onClick={onEdit}
            className="px-3 py-2 bg-blue-500 text-white rounded font-semibold hover:bg-blue-600"
          >
            ✏️ Chỉnh sửa
          </button>

          {!isFound && (
            <button
              onClick={onMarkAsFound}
              className="px-3 py-2 bg-green-500 text-white rounded font-semibold hover:bg-green-600"
            >
              ✔ Tìm thấy
            </button>
          )}

          <button
            onClick={onDelete}
            className="px-3 py-2 bg-red-500 text-white rounded font-semibold hover:bg-red-600"
          >
            🗑 Xóa
          </button>
        </div>

        {/* Additional tools */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <button
            onClick={onHandleShare}
            className="px-3 py-2 bg-purple-500 text-white rounded font-semibold hover:bg-purple-600"
          >
            📢 Chia sẻ
          </button>

          <button
            onClick={onGeneratePoster}
            className="px-3 py-2 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600"
          >
            🖨 Poster PDF
          </button>

          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert("Đã copy link!");
            }}
            className="px-3 py-2 bg-gray-500 text-white rounded font-semibold hover:bg-gray-600"
          >
            🔗 Copy link
          </button>
        </div>
      </section>

      {/* ========== THÔNG TIN MẤT TÍCH ========== */}
      {!isFound && (
        <section className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <h3 className="font-bold text-red-900 mb-3">📍 Thông tin mất tích</h3>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-lg">📍</span>
              <div>
                <p className="font-semibold">Vị trí mất</p>
                <p className="text-gray-700">{pet.district || "Không xác định"}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="text-lg">🕒</span>
              <div>
                <p className="font-semibold">Thời gian</p>
                <p className="text-gray-700">{createdDate.toLocaleString("vi-VN")}</p>
                <p className="text-orange-600 font-semibold text-xs mt-1">⏳ Đã {daysAgo} ngày</p>
              </div>
            </div>

            {pet.description && (
              <div className="flex items-start gap-3">
                <span className="text-lg">❗</span>
                <div>
                  <p className="font-semibold">Hoàn cảnh</p>
                  <p className="text-gray-700">{pet.description}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========== THƯỞNG & LIÊN HỆ ========== */}
      {pet.max_deposit && (
        <section className="p-4 bg-yellow-50 border rounded-lg">
          <p className="font-bold text-lg text-yellow-900">
            💰 Thưởng {pet.max_deposit.toLocaleString()}đ
          </p>
        </section>
      )}

      <LostOwnerInteractionSection
        pet={pet}
        owner={owner}
        isFound={isFound}
        sightings={sightings}
        verifiedSightings={verifiedSightings}
        unverifiedSightings={unverifiedSightings}
        onVerifySighting={onVerifySighting}
        onMarkAsFound={onMarkAsFound}
      />
      {/* ========== LỊCH SỬ HOẠT ĐỘNG ========== */}
      <section className="p-4 bg-purple-50 border rounded-lg">
        <h3 className="font-bold text-purple-900 mb-3">📜 Lịch sử hoạt động</h3>
        <div className="space-y-2 text-xs max-h-48 overflow-y-auto">
          <div className="p-2 bg-purple-100 text-purple-700 rounded">
            ⏰ Bài được đăng: {createdDate.toLocaleString("vi-VN")}
          </div>
          {sightings.length > 0 && (
            <div className="p-2 bg-purple-100 text-purple-700 rounded">
              👀 {sightings.length} báo nhìn thấy
            </div>
          )}
          {verifiedSightings > 0 && (
            <div className="p-2 bg-green-100 text-green-700 rounded">
              ✔ {verifiedSightings} sighting đã xác minh
            </div>
          )}
        </div>
      </section>

      {/* ========== GỢI Ý TIẾP THEO ========== */}
      <section className="p-4 bg-cyan-50 border rounded-lg">
        <h3 className="font-bold text-cyan-900 mb-3">💡 Gợi ý tìm kiếm</h3>
        <ul className="space-y-2 text-xs">
          {renderRecommendations().map((tip, idx) => (
            <li key={idx} className="text-cyan-800">
              {tip}
            </li>
          ))}
        </ul>
      </section>

      {/* ========== BẢN ĐỒ ========== */}
      {pet.lat && pet.lng && (
        <section className="p-4 border rounded-lg">
          <h3 className="font-bold text-gray-900 mb-3">🗺 Bản đồ tìm kiếm</h3>
          <p className="text-xs text-gray-600 mb-2">
            Hiện thị: Vị trí mất + Sightings + Khu vực được xem nhiều
          </p>
          <a
            href={`https://maps.google.com/?q=${pet.lat},${pet.lng}`}
            target="_blank"
            rel="noreferrer"
            className="block w-full px-4 py-3 bg-blue-500 text-white rounded font-semibold text-sm text-center hover:bg-blue-600"
          >
            📍 Mở Google Maps
          </a>
        </section>
      )}
    </div>
  );
}
