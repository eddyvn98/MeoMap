import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { closeRescueCase } from "../donation";
import { finalizeBounties } from "../bounty";
import BountyWidget from "./BountyWidget";
import DonationWidget from "./DonationWidget";
import DonorList from "./DonorList";
import ContextualHelpCard from "./ContextualHelpCard";

/**
 * Chi tiết bài đăng cứu hộ (rescue category)
 * 
 * Hiển thị 2 dòng tiền rõ ràng:
 * 1. BOUNTY WIDGET - Tiền treo thưởng / hỗ trợ ban đầu (để thu hút người cứu)
 * 2. DONATION WIDGET - Tiền hỗ trợ chi phí cứu hộ (để giúp chi phí điều trị)
 * 3. Timeline hoạt động (check-in, báo cáo, ảnh, hóa đơn)
 */
export default function RescuePetDetail({ pet, user, isOwner }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const isClosed = pet.status === "delivered";

  const handleCloseCase = async () => {
    if (
      !confirm(
        "Bạn có chắc muốn kết thúc ca cứu hộ? Toàn bộ tiền trong ví + tiền thưởng đã nhận sẽ được chuyển cho bạn."
      )
    )
      return;

    setLoading(true);
    try {
      // 1. Finalize bounties (mark accepted as transferred, reject unaccepted)
      const { success: bountySuccess, error: bountyError } = await finalizeBounties(
        pet.id,
        pet.owner_id
      );
      if (!bountySuccess) console.warn("Warning: Could not finalize bounties", bountyError);

      // 2. Close rescue case (transfer wallet balance)
      const { success: caseSuccess, error: caseError } = await closeRescueCase(
        pet.id,
        pet.owner_id
      );
      if (!caseSuccess) throw new Error(caseError);

      alert("✅ Đã kết thúc ca cứu hộ. Toàn bộ tiền đã được chuyển.");
      window.location.reload();
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <section className="relative bg-gray-100 rounded-lg overflow-hidden">
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

          {/* Badge trạng thái */}
          <div className="absolute top-4 right-4">
            <div
              className={`px-4 py-2 rounded-full font-semibold text-white text-sm ${
                isClosed
                  ? "bg-gray-500"
                  : "bg-orange-500 animate-pulse"
              }`}
            >
              {isClosed ? "✅ Đã kết thúc" : "🆘 Đang cứu hộ"}
            </div>
          </div>

          {/* Badge category */}
          <div className="absolute top-4 left-4">
            <div className="px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-semibold">
              Cứu hộ
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-b">
          <h3 className="text-2xl font-bold text-gray-900">{pet.name}</h3>
          <p className="text-sm text-orange-700 mt-1">
            Trường hợp khẩn cấp. Người cứu sẽ nhận hỗ trợ tùy theo mức thưởng.
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Người cứu hộ: Cộng đồng MeoMap
          </p>
        </div>
      </section>

      {/* THƯỞNG HỖ TRỢ CỨU HỘ */}
      {pet.bounty_amount && pet.bounty_amount > 0 && (
        <ContextualHelpCard
          cardId="rescue-support"
          icon="🔥"
          title="Tiền Hỗ Trợ Cứu Hộ"
          content="Tiền hỗ trợ cho người cứu hộ bỏ công sức, thời gian và chi phí điều trị. Giúp tăng động lực để mọi người sẵn sàng cứu mèo/chó trong trường hợp nguy cấp."
          position="bottom"
        >
          <div className="p-3 bg-red-100 border-2 border-red-400 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔥</span>
              <h4 className="font-bold text-red-900">Hỗ trợ cứu hộ</h4>
            </div>
            <p className="text-3xl font-bold text-red-900">
              {pet.bounty_amount.toLocaleString()}đ
            </p>
            <p className="text-xs text-red-800 mt-2 mb-3">
              Người cứu hộ và hoàn thành ca này sẽ nhận được khoản hỗ trợ này
            </p>
            <details className="text-xs text-red-700 cursor-pointer">
              <summary className="font-semibold hover:text-red-900">Tại sao có tiền hỗ trợ?</summary>
              <div className="mt-2 p-2 bg-white rounded border-l-2 border-red-400">
                <p className="leading-relaxed mb-2">
                  <strong className="text-gray-900">Tiền hỗ trợ dành cho người cứu hộ bỏ công sức, thời gian và đôi khi chi phí điều trị.</strong>
                </p>
                <p className="leading-relaxed">
                  Giúp <strong>tăng động lực để mọi người sẵn sàng cứu mèo/chó trong trường hợp nguy cấp</strong> - vì cứu hộ không phải lúc nào cũng dễ dàng, đôi khi nguy hiểm.
                </p>
              </div>
            </details>
          </div>
        </ContextualHelpCard>
      )}

      {/* ===== KHỐI 1: TIỀN TREO THƯỞNG (Ban đầu) ===== */}
      {!isClosed && (
        <BountyWidget
          caseId={pet.id}
          isRescuer={isOwner}
          onBountiesAccepted={() => {
            // Refresh page hoặc reload bounties
          }}
        />
      )}

      {/* ===== KHỐI 2: TIỀN HỖ TRỢ CHI PHÍ (Quá trình) ===== */}
      {!isClosed && (
        <DonationWidget
          caseId={pet.id}
          isOwner={isOwner}
          onCaseClosed={handleCloseCase}
        />
      )}

      {/* CLOSED NOTICE */}
      {isClosed && (
        <div className="p-4 bg-green-50 border-2 border-green-300 rounded-lg text-center">
          <p className="font-bold text-green-900 text-lg mb-2">✅ Ca cứu hộ đã kết thúc</p>
          <p className="text-sm text-green-800">
            Cảm ơn tất cả những ai đã góp chia sẻ yêu thương cho ca này! 🙏
          </p>
        </div>
      )}

      {/* THÔNG TIN CHI TIẾT */}
      {pet.description && (
        <section className="p-4 bg-blue-50 border rounded-lg">
          <h3 className="font-bold text-blue-900 mb-3">📋 Chi tiết ca cứu hộ</h3>
          <p className="text-sm text-gray-700">{pet.description}</p>
        </section>
      )}

      {/* VỊ TRÍ */}
      {pet.district && (
        <section className="p-4 bg-gray-50 border rounded-lg">
          <h3 className="font-bold text-gray-900 mb-3">📍 Vị trí cứu hộ</h3>
          <p className="text-sm text-gray-700 mb-2">{pet.district}</p>
          {pet.lat && pet.lng && (
            <a
              href={`https://maps.google.com/?q=${pet.lat},${pet.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block px-4 py-2 bg-blue-500 text-white rounded font-semibold text-sm hover:bg-blue-600"
            >
              📍 Xem trên Google Maps
            </a>
          )}
        </section>
      )}

      {/* DANH SÁCH NGƯỜI GÓP */}
      {!isClosed && (
        <section className="p-4 border rounded-lg">
          <h3 className="font-bold text-gray-900 mb-3">💪 Những người đã chia sẻ yêu thương</h3>
          <DonorList caseId={pet.id} />
        </section>
      )}

      {/* TIMELINE HOẠT ĐỘNG (PLACEHOLDER) */}
      <section className="p-4 bg-purple-50 border rounded-lg">
        <h3 className="font-bold text-purple-900 mb-3">📜 Timeline hoạt động</h3>
        <p className="text-xs text-gray-600 mb-3">
          Người cứu hộ sẽ đăng tải check-in, báo cáo tình trạng, ảnh, hóa đơn tại đây.
        </p>
        <div className="space-y-2">
          <div className="p-2 bg-purple-100 text-purple-700 text-xs rounded">
            ⏰ Bài được đăng: {new Date(pet.created_at).toLocaleString("vi-VN")}
          </div>
          {/* Timeline entries will be added here in next iteration */}
        </div>
      </section>

      {/* OWNER ACTIONS */}
      {isOwner && !isClosed && (
        <section className="p-4 bg-gray-100 rounded-lg border space-y-2">
          <h3 className="font-bold text-gray-900 mb-2">⚙️ Quản lý ca cứu hộ</h3>

          <button
            onClick={() => navigate(`/edit-pet/${pet.id}`)}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded font-semibold text-sm hover:bg-blue-600"
          >
            ✏️ Chỉnh sửa thông tin
          </button>

          <button
            onClick={() => {
              const link = window.location.href;
              const message = `🔥 CẦN CỨU HỘ KHẨN CẤP!\n\n🐱 ${pet.name}\n${pet.description ? `📝 ${pet.description.substring(0, 100)}${pet.description.length > 100 ? '...' : ''}\n` : ''}${pet.bounty_amount ? `💰 Hỗ trợ: ${pet.bounty_amount.toLocaleString()}đ\n` : ''}\n📍 Xem chi tiết: ${link}`;
              
              if (navigator.share) {
                navigator.share({ 
                  title: `🔥 Cứu hộ: ${pet.name}`,
                  text: message,
                  url: link 
                });
              } else {
                navigator.clipboard.writeText(message);
                alert("✅ Đã copy nội dung chia sẻ!");
              }
            }}
            className="w-full px-4 py-2 bg-purple-500 text-white rounded font-semibold text-sm hover:bg-purple-600"
          >
            🔗 Chia sẻ bài đăng
          </button>

          <button
            onClick={handleCloseCase}
            disabled={loading}
            className="w-full px-4 py-2 bg-red-500 text-white rounded font-semibold text-sm hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "⏹ Kết thúc ca cứu hộ"}
          </button>
        </section>
      )}
    </div>
  );
}
