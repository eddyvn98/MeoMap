import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { closeRescueCase } from "../donation";
import { finalizeBounties } from "../bounty";
import BountyWidget from "./BountyWidget";
import DonorList from "./DonorList";
import ContextualHelpCard from "./ContextualHelpCard";
import RescueActivityPanel from "./RescueActivityPanel";
import RescueUpdatesTimeline from "./RescueUpdatesTimeline";
import RescueAppealsList from "./RescueAppealsList";

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
  const [acceptingRescue, setAcceptingRescue] = useState(false);
  const [editingBankInfo, setEditingBankInfo] = useState(false);
  const [bankInfo, setBankInfo] = useState({
    rescuer_bank_account_number: pet.rescuer_bank_account_number || "",
    rescuer_bank_account_name: pet.rescuer_bank_account_name || "",
    rescuer_bank_name: pet.rescuer_bank_name || "",
    rescuer_bank_qr_code_url: pet.rescuer_bank_qr_code_url || "",
  });
  const [qrFile, setQrFile] = useState(null);
  const [savingBankInfo, setSavingBankInfo] = useState(false);

  const isClosed = pet.status === "delivered";
  const isRescuer = user && pet.rescuer_id && pet.rescuer_id === user.id;

  // Debug logging
  console.log("🚑 RescuePetDetail - isRescuer check:", {
    hasUser: !!user,
    userId: user?.id,
    petRescuerId: pet.rescuer_id,
    isRescuer,
    petId: pet.id,
    isClosed
  });

  const handleAcceptRescue = async () => {
    if (!user) {
      alert("❌ Vui lòng đăng nhập để nhận ca cứu hộ");
      return;
    }

    if (pet.rescuer_id) {
      alert("❌ Ca cứu hộ này đã có người nhận");
      return;
    }

    if (
      !confirm(
        `Bạn có chắc muốn nhận ca cứu hộ thú cưng "${pet.name}" này?\n\nBạn sẽ trở thành người cứu hộ chính và có trách nhiệm hoàn thành ca này.`
      )
    )
      return;

    setAcceptingRescue(true);
    try {
      const { error } = await supabase
        .from("pets")
        .update({ rescuer_id: user.id })
        .eq("id", pet.id);

      if (error) throw error;

      alert("✅ Bạn đã nhận ca cứu hộ! Vui lòng cập nhật thông tin ngân hàng để người đóng góp có thể chuyển tiền.");
      setEditingBankInfo(true);
      window.location.reload();
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setAcceptingRescue(false);
    }
  };

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

  const handleSaveBankInfo = async () => {
    setSavingBankInfo(true);
    try {
      let qrUrl = bankInfo.rescuer_bank_qr_code_url;

      // Upload QR file if selected
      if (qrFile) {
        const ext = qrFile.name.split(".").pop();
        const filePath = `bank-qr/${pet.id}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("pet-images")
          .upload(filePath, qrFile);

        if (uploadError) {
          console.error(uploadError);
          throw new Error("Upload ảnh QR lỗi: " + uploadError.message);
        }

        const { data: publicData } = supabase.storage
          .from("pet-images")
          .getPublicUrl(filePath);

        qrUrl = publicData?.publicUrl || bankInfo.rescuer_bank_qr_code_url;
      }

      const updateData = {
        ...bankInfo,
        rescuer_bank_qr_code_url: qrUrl,
      };

      const { error } = await supabase
        .from("pets")
        .update(updateData)
        .eq("id", pet.id);

      if (error) throw error;

      alert("✅ Đã cập nhật thông tin ngân hàng!");
      setEditingBankInfo(false);
      setQrFile(null);
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("❌ Lỗi khi lưu thông tin: " + error.message);
    } finally {
      setSavingBankInfo(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* HEADER - Compact version for detail panel */}
      <section className="relative bg-gray-100 rounded-lg overflow-hidden">
        <div className="relative w-full h-40 bg-gray-200">
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

          {/* Badge danh mục */}
          <div className="absolute bottom-4 left-4">
            <div className="px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-semibold">
              Cứu hộ
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-b">
          <h3 className="text-2xl font-bold text-gray-900">{pet.name}</h3>
          <p className="text-sm text-gray-700 mt-2">
            Trường hợp khẩn cấp. Người cứu sẽ nhận hỗ trợ tùy theo mức thưởng.
          </p>
          {pet.rescuer_id ? (
            <p className="text-sm text-green-700 mt-1">
              ✅ Người cứu hộ đã nhận ca - ID: {pet.rescuer_id.slice(0, 8)}...
            </p>
          ) : (
            <p className="text-sm text-gray-600 mt-1">
              ⏳ Chờ người cứu hộ nhận ca
            </p>
          )}
          {/* NÚT NHẬN CA (CHO TẤT CẢ NGƯỜI DÙNG) */}
          {!pet.rescuer_id && !isClosed && user && (
            <div>
              <button
                onClick={handleAcceptRescue}
                disabled={acceptingRescue}
                className="mt-3 px-4 py-2 bg-orange-500 text-white rounded font-semibold hover:bg-orange-600 disabled:opacity-50"
              >
                {acceptingRescue ? "⏳ Đang xử lý..." : "✋ Nhận ca cứu hộ"}
              </button>
              {isOwner && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded text-xs">
                  <p className="text-amber-900 font-semibold">⚠️ Lưu ý: Bạn đang tự nhận ca cứu của chính mình</p>
                  <p className="text-amber-800 mt-1">
                    • Bạn có thể quản lý ca cứu và nhận ủng hộ từ cộng đồng<br />
                    • <strong>Không nhận được tiền thưởng</strong> khi tự hoàn thành ca này<br />
                    • Tiền thưởng chỉ dành cho người khác giúp đỡ
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* THƯỞNG HỖ TRỢ CỨU HỘ */}
      {pet.bounty_amount > 0 && (
        <ContextualHelpCard
          cardId="rescue-support"
          icon="🔥"
          title="Tiền Hỗ Trợ Cứu Hộ"
          content="Tiền hỗ trợ cho người cứu hộ bỏ công sức, thời gian và chi phí điều trị. Giúp tăng động lực để mọi người sẵn sàng cứu mèo/chó trong trường hợp nguy cấp."
          position="bottom"
        >
          <div className="p-3 bg-red-100 border-2 border-red-400 rounded-lg">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-2xl">🔥</span>
              <h4 className="font-bold text-red-900">Hỗ trợ cứu hộ</h4>
            </div>
            <p className="text-2xl font-bold text-red-900">
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

      {/* RESCUER - RESCUE ACTIVITY PANEL */}
      {isRescuer && !isClosed && (
        <RescueActivityPanel
          caseId={pet.id}
          rescuerId={user.id}
          isRescuer={isRescuer}
          onCaseUpdated={() => {
            // Reload page để cập nhật dữ liệu từ DB
            window.location.reload();
          }}
        />
      )}

      {/* ===== KHỐI 1: TIỀN TREO THƯỞNG (Ban đầu) ===== */}
      {!isClosed && (
        <BountyWidget
          caseId={pet.id}
          caseOwnerId={pet.owner_id}
          isRescuer={isOwner}
          onBountiesAccepted={() => {
            // Refresh page hoặc reload bounties
          }}
        />
      )}

      {/* ===== HỖ TRỢ CỨU HỘ TRỰC TIẾP ===== */}
      {!isClosed && (
        <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-blue-900 text-base">
              🏦 Thông tin chuyển khoản trực tiếp (Hỗ trợ cứu hộ)
            </h3>
            {isRescuer && !editingBankInfo && (
              <button
                onClick={() => setEditingBankInfo(true)}
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                ✏️ Chỉnh sửa
              </button>
            )}
          </div>

          {editingBankInfo && isRescuer ? (
            // EDIT MODE
            <div className="space-y-3 bg-white p-3 rounded border-2 border-blue-400">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Số tài khoản:
                </label>
                <input
                  type="text"
                  value={bankInfo.rescuer_bank_account_number}
                  onChange={(e) => setBankInfo({ ...bankInfo, rescuer_bank_account_number: e.target.value })}
                  placeholder="Ví dụ: 123456789"
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tên chủ tài khoản:
                </label>
                <input
                  type="text"
                  value={bankInfo.rescuer_bank_account_name}
                  onChange={(e) => setBankInfo({ ...bankInfo, rescuer_bank_account_name: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ngân hàng:
                </label>
                <input
                  type="text"
                  value={bankInfo.rescuer_bank_name}
                  onChange={(e) => setBankInfo({ ...bankInfo, rescuer_bank_name: e.target.value })}
                  placeholder="Ví dụ: Vietcombank, Agribank..."
                  className="w-full border rounded px-2 py-1 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ảnh Mã QR chuyển tiền (tùy chọn):
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setQrFile(e.target.files?.[0] || null)}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
                {bankInfo.rescuer_bank_qr_code_url && !qrFile && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-1">Ảnh hiện tại:</p>
                    <img
                      src={bankInfo.rescuer_bank_qr_code_url}
                      alt="Bank QR"
                      className="w-32 h-32 object-contain border rounded"
                    />
                  </div>
                )}
                {qrFile && (
                  <div className="mt-2">
                    <p className="text-xs text-green-600 mb-1">✓ Ảnh mới được chọn</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveBankInfo}
                  disabled={savingBankInfo}
                  className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm font-semibold hover:bg-green-600 disabled:opacity-50"
                >
                  💾 Lưu
                </button>
                <button
                  onClick={() => {
                    setEditingBankInfo(false);
                    setQrFile(null);
                    setBankInfo({
                      rescuer_bank_account_number: pet.rescuer_bank_account_number || "",
                      rescuer_bank_account_name: pet.rescuer_bank_account_name || "",
                      rescuer_bank_name: pet.rescuer_bank_name || "",
                      rescuer_bank_qr_code_url: pet.rescuer_bank_qr_code_url || "",
                    });
                  }}
                  className="flex-1 px-3 py-2 bg-gray-400 text-white rounded text-sm font-semibold hover:bg-gray-500"
                >
                  ✖️ Hủy
                </button>
              </div>
            </div>
          ) : (
            // VIEW MODE
            <>
              <p className="text-xs text-blue-800 mb-3">
                Đây là tiền hỗ trợ cứu hộ trực tiếp. Chuyển khoản theo thông tin của người nhận ca cứu.
              </p>
              
              <div className="space-y-2">
                {(pet.rescuer_bank_account_number || pet.bank_account_number) ? (
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-600 font-semibold">Số tài khoản:</p>
                    <p className="text-base font-bold text-gray-900">{pet.rescuer_bank_account_number || pet.bank_account_number}</p>
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-600">Số tài khoản:</p>
                    <p className="text-xs text-blue-700">Chưa cập nhật</p>
                  </div>
                )}
                
                {(pet.rescuer_bank_account_name || pet.bank_account_name) ? (
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-600 font-semibold">Tên chủ tài khoản:</p>
                    <p className="text-base font-bold text-gray-900">{pet.rescuer_bank_account_name || pet.bank_account_name}</p>
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-600">Tên chủ tài khoản:</p>
                    <p className="text-xs text-blue-700">Chưa cập nhật</p>
                  </div>
                )}
                
                {(pet.rescuer_bank_name || pet.bank_name) ? (
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-600 font-semibold">Ngân hàng:</p>
                    <p className="text-base font-bold text-gray-900">{pet.rescuer_bank_name || pet.bank_name}</p>
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded border">
                    <p className="text-xs text-gray-600">Ngân hàng:</p>
                    <p className="text-xs text-blue-700">Chưa cập nhật</p>
                  </div>
                )}
                
                {(pet.rescuer_bank_qr_code_url || pet.bank_qr_code_url) && (
                  <div className="bg-white p-3 rounded border text-center">
                    <p className="text-xs text-gray-600 font-semibold mb-2">Quét QR để chuyển tiền:</p>
                    <img 
                      src={pet.rescuer_bank_qr_code_url || pet.bank_qr_code_url} 
                      alt="Bank QR Code" 
                      className="w-48 h-48 mx-auto object-contain border-2 border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>
              
              <p className="text-xs text-blue-700 mt-3 italic">
                💡 Lưu ý: Tiền hỗ trợ trực tiếp không hiển thị trên hệ thống.
                Nếu thiếu thông tin, vui lòng liên hệ người nhận ca cứu để nhận QR/chuyển khoản.
              </p>
            </>
          )}
        </div>
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

      {/* LỜI KÊU GỌI ỦNG HỘ */}
      {!isClosed && (
        <section className="p-4 border rounded-lg">
          <RescueAppealsList caseId={pet.id} />
        </section>
      )}

      {/* TIMELINE CẬP NHẬT TÌNH HÌNH */}
      {!isClosed && (
        <section className="p-4 border rounded-lg">
          <RescueUpdatesTimeline caseId={pet.id} />
        </section>
      )}

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
