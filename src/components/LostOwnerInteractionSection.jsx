import ContactExchangeCard from "./ContactExchangeCard";
import ConfirmHandoverPanel from "./ConfirmHandoverPanel";

export default function LostOwnerInteractionSection({
  pet, owner, isFound, sightings, verifiedSightings, unverifiedSightings,
  onVerifySighting, onMarkAsFound,
}) {
  return (
    <>
      {/* ========== QUẢN LÝ SIGHTINGS (CHỈ OWNER) ========== */}
      {!isFound && (
      <section className="p-4 bg-green-50 border-2 border-green-300 rounded-lg">
      <h3 className="font-bold text-green-900 mb-3">
      👀 Quản lý báo nhìn thấy ({sightings.length})
      </h3>
      
      {sightings.length === 0 ? (
      <p className="text-sm text-gray-600">Chưa có báo nhìn thấy nào.</p>
      ) : (
      <div className="space-y-2">
      {/* Stats */}
      <div className="flex gap-2 mb-3 text-xs">
      <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
      ✔ {verifiedSightings} xác minh
      </div>
      <div className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-semibold">
      ⏳ {unverifiedSightings} chờ
      </div>
      </div>
      
      {/* Sightings list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
      {sightings.map((s) => (
      <div
      key={s.id}
      className={`p-3 rounded border-l-4 ${
      s.metadata?.verified === true
      ? "bg-green-100 border-green-500"
      : "bg-yellow-100 border-yellow-500"
      }`}
      >
      {/* Reporter info */}
      <div className="flex items-center gap-2 mb-2">
      {s.reporter?.avatar_url ? (
      <img
      src={s.reporter.avatar_url}
      alt={s.reporter.display_name}
      className="w-8 h-8 rounded-full object-cover"
      />
      ) : (
      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
      {s.reporter?.display_name?.[0]?.toUpperCase() || '?'}
      </div>
      )}
      <div className="flex-1">
      <p className="font-semibold text-xs text-gray-900">
      {s.reporter?.display_name || 'Người dùng ẩn danh'}
      </p>
      {s.reporter?.phone && (
      <a
      href={`tel:${s.reporter.phone}`}
      className="text-xs text-blue-600 hover:underline"
      >
      📞 {s.reporter.phone}
      </a>
      )}
      </div>
      
      {/* Verify buttons */}
      {s.metadata?.verified !== true && (
      <div className="flex gap-1 flex-shrink-0">
      <button
      onClick={() => onVerifySighting(s.id, true)}
      className="px-2 py-1 bg-green-500 text-white text-xs rounded font-semibold hover:bg-green-600"
      title="Xác nhận"
      >
      ✔
      </button>
      <button
      onClick={() => onVerifySighting(s.id, false)}
      className="px-2 py-1 bg-red-500 text-white text-xs rounded font-semibold hover:bg-red-600"
      title="Sai/Spam"
      >
      ✖
      </button>
      </div>
      )}
      </div>
      
      {/* Sighting details */}
      <div className="text-xs ml-10">
      <p className="text-gray-500 mb-1">
      {new Date(s.created_at).toLocaleString("vi-VN")}
      </p>
      {s.metadata?.location && (
      <p className="text-gray-700">📍 {s.metadata.location}</p>
      )}
      {s.description && (
      <p className="text-gray-700 mt-1">"{s.description}"</p>
      )}
      </div>
      
      {s.metadata?.image_url && (
      <img
      src={s.metadata.image_url}
      alt="Sighting"
      className="w-full max-w-xs rounded mt-2 ml-10"
      />
      )}
      
      {s.metadata?.verified === true && (
      <div className="mt-2 text-xs font-semibold text-green-700 ml-10">
      ✅ Đã xác nhận đúng
      </div>
      )}
      </div>
      ))}
      </div>
      </div>
      )}
      </section>
      )}
      
      {/* ========== LIÊN HỆ HAI CHIỀU SAU BÁO TIN ========== */}
      {sightings.length > 0 && (
      <section className="p-4 bg-blue-50 border rounded-lg">
      <ContactExchangeCard
      owner={{
      name: owner?.display_name || "Chủ mèo",
      phone: owner?.phone || owner?.phone_number || "",
      note: "Liên hệ để hẹn thời gian/địa điểm gặp",
      }}
      reporter={{
      name: sightings[0]?.reporter?.display_name || "Người tìm thấy",
      phone: sightings[0]?.reporter?.phone || "",
      note: sightings[0]?.description || "",
      }}
      infoNote="Sau khi gửi báo: hai bên thấy thông tin liên hệ để trao đổi, hẹn gặp và xác nhận."
      />
      </section>
      )}
      
      {/* ========== XÁC NHẬN GIAO/NHẬN (DÙNG CHUNG) ========== */}
      <section className="p-4 bg-white border rounded-lg">
      {verifiedSightings > 0 && sightings.some(s => s.metadata?.verified === true && s.metadata?.finder_confirmed === true) && (
      <div style={{ 
      padding: 12, 
      background: "#fef3c7", 
      border: "2px solid #fbbf24",
      borderRadius: 8, 
      marginBottom: 12,
      fontSize: 13,
      fontWeight: 600,
      color: "#92400e"
      }}>
      🔔 Người tìm thấy đã xác nhận giao mèo! Hãy xác nhận để chuyển tiền thưởng.
      </div>
      )}
      <ConfirmHandoverPanel
      mode="lost"
      isOwner={true}
      isCompleted={isFound}
      contactA={{
      name: owner?.display_name || "Chủ mèo",
      phone: owner?.phone || owner?.phone_number || "",
      }}
      contactB={{
      name: sightings[0]?.reporter?.display_name || "Người tìm thấy",
      phone: sightings[0]?.reporter?.phone || "",
      }}
      onShowQR={() => {
      window.dispatchEvent(new CustomEvent("open-qr-modal", { detail: { petId: pet.id, mode: "lost" } }));
      }}
      onConfirm={
      sightings.some(s => s.metadata?.verified === true && s.metadata?.finder_confirmed === true)
      ? () => {
      if (typeof onMarkAsFound === "function") {
      onMarkAsFound();
      } else {
      console.warn("onMarkAsFound is not a function:", onMarkAsFound);
      alert("Chức năng xác nhận chưa được kết nối");
      }
      }
      : null
      }
      statusLabel={isFound ? "Đã xác nhận giao/nhận" : sightings.length > 0 ? "Đang trao đổi" : "Chờ báo tin"}
      />
      </section>
      
    </>
  );
}
