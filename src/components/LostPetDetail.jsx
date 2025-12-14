import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import LostPetOwnerView from "./LostPetOwnerView";
import ContextualHelpCard from "./ContextualHelpCard";
import ConfirmHandoverPanel from "./ConfirmHandoverPanel";

export default function LostPetDetail({ pet, user, isOwner, onMarkAsFound, onDelete, onEdit }) {
  const [owner, setOwner] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [showSightingForm, setShowSightingForm] = useState(false);
  const [sightingImage, setSightingImage] = useState(null);
  const [sightingLocation, setSightingLocation] = useState("");
  const [sightingDescription, setSightingDescription] = useState("");
  const [submittingSighting, setSubmittingSighting] = useState(false);

  // Owner-only stats
  const [viewCount, setViewCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [activities, setActivities] = useState([]);
  const [sightingVerifications, setSightingVerifications] = useState({});

  const isFound = pet.category === "delivered";
  const createdDate = new Date(pet.created_at);
  const now = new Date();
  const daysAgo = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

  const getCategoryName = (category) => {
    switch (category) {
      case "lost":
        return "Thú cưng của tôi đi lạc";
      case "rescue":
        return "Thú cưng cần cứu hộ";
      case "adopt":
        return "Thú cưng cần nhận nuôi";
      default:
        return "Thú cưng đi lạc";
    }
  };

  const getStatusName = (status) => {
    switch (status) {
      case "available":
        return "Có sẵn";
      case "in_contact":
        return "Đang liên hệ";
      case "delivered":
        return "Đã tìm thấy";
      case "cancelled":
        return "Đã huỷ";
      case "pending":
        return "Đang chờ xử lý";
      case "confirmed":
        return "Đã xác nhận";
      default:
        return "Trạng thái không xác định";
    }
  };

  // Load owner info
  useEffect(() => {
    const loadOwner = async () => {
      if (pet.owner_id) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", pet.owner_id)
          .single();
        setOwner(data || null);
        console.log("📞 Owner contact info:", { phone: data?.phone, email: data?.email, username: data?.username });
      }
    };
    console.log("🔍 LostPetDetail - isOwner:", isOwner, "pet.owner_id:", pet.owner_id, "user.id:", user?.id);
    loadOwner();
  }, [pet.owner_id]);

  // Load sightings with reporter info
  useEffect(() => {
    const loadSightings = async () => {
      const { data, error } = await supabase
        .from("adoption_activities")
        .select(`
          *,
          reporter:actor_id (
            id,
            display_name,
            avatar_url,
            phone
          )
        `)
        .eq("pet_id", pet.id)
        .eq("activity_type", "sighting")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error('Load sightings error:', error);
        setSightings([]);
        return;
      }
      setSightings(data || []);
    };
    loadSightings();
  }, [pet.id]);

  const handleSubmitSighting = async (e) => {
    e.preventDefault();
    setSubmittingSighting(true);

    try {
      let imageUrl = null;

      if (sightingImage) {
        const ext = sightingImage.name.split(".").pop();
        const filePath = `sightings/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("pet-images")
          .upload(filePath, sightingImage);

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from("pet-images")
          .getPublicUrl(filePath);

        imageUrl = publicData?.publicUrl;
      }

      const { error: insertError } = await supabase
        .from("adoption_activities")
        .insert({
          pet_id: pet.id,
          activity_type: "sighting",
          actor_id: user.id,
          actor_type: "viewer",
          description: sightingDescription,
          metadata: {
            location: sightingLocation,
            image_url: imageUrl,
          },
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Show success message with navigation options
      const currentUrl = window.location.href;
      const goToReports = confirm(
        "✅ Cảm ơn bạn đã báo nhìn thấy!\n\n" +
        "📋 Bạn có thể xem lại báo cáo của mình trong:\n" +
        "• Trang cá nhân → Tab 'Báo của tôi'\n" +
        "• Hoặc ở lại trang này để theo dõi\n\n" +
        "Nhấn OK để đến trang 'Báo của tôi', Cancel để ở lại đây."
      );

      if (goToReports) {
        window.location.href = "/account?tab=reports";
      }

      setSightingDescription("");
      setSightingLocation("");
      setSightingImage(null);
      setShowSightingForm(false);

      // Reload sightings with reporter info
      const { data: updatedSightings, error: reloadError } = await supabase
        .from("adoption_activities")
        .select(`
          *,
          reporter:actor_id (
            id,
            display_name,
            avatar_url,
            phone
          )
        `)
        .eq("pet_id", pet.id)
        .eq("activity_type", "sighting")
        .order("created_at", { ascending: false });

      if (reloadError) {
        console.error('Reload sightings error:', reloadError);
      }
      setSightings(updatedSightings || []);
    } catch (err) {
      console.error(err);
      alert("Lỗi: " + err.message);
    } finally {
      setSubmittingSighting(false);
    }
  };

  const openGoogleMaps = () => {
    if (pet.lat && pet.lng) {
      window.open(`https://maps.google.com/?q=${pet.lat},${pet.lng}`, "_blank");
    } else {
      alert("Vị trí không xác định.");
    }
  };

  const handleShare = async () => {
    const shareText = `🐱 Tìm mèo thất lạc: ${pet.name}\n📍 ${pet.district || "Vị trí không xác định"}\nHãy giúp tôi tìm: ${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tìm mèo: ${pet.name}`,
          text: shareText,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Đã copy link chia sẻ!");
    }
  };

  // Verify or reject sighting (owner only)
  const handleVerifySighting = async (sightingId, isValid) => {
    try {
      const { error } = await supabase
        .from("adoption_activities")
        .update({
          metadata: {
            ...sightings.find(s => s.id === sightingId)?.metadata,
            verified: isValid,
            verified_at: new Date().toISOString(),
          }
        })
        .eq("id", sightingId);

      if (error) throw error;

      setSightingVerifications({
        ...sightingVerifications,
        [sightingId]: isValid
      });

      // Reload with reporter info
      const { data: updatedSightings, error: reloadError } = await supabase
        .from("adoption_activities")
        .select(`
          *,
          reporter:actor_id (
            id,
            display_name,
            avatar_url,
            phone
          )
        `)
        .eq("pet_id", pet.id)
        .eq("activity_type", "sighting")
        .order("created_at", { ascending: false });

      if (reloadError) throw reloadError;
      setSightings(updatedSightings || []);
    } catch (err) {
      console.error(err);
      alert("Lỗi: " + err.message);
    }
  };

  // Generate poster PDF (mock)
  const handleGeneratePoster = () => {
    alert("Tính năng tạo poster đang phát triển 🚧");
  };

  // Nếu là owner → render Owner View
  if (isOwner) {
    console.log("✅ Rendering LostPetOwnerView");
    return (
      <LostPetOwnerView
        pet={pet}
        owner={owner}
        isOwner={isOwner}
        sightings={sightings}
        onMarkAsFound={onMarkAsFound}
        onDelete={onDelete}
        onEdit={onEdit}
        onVerifySighting={handleVerifySighting}
        onGeneratePoster={handleGeneratePoster}
        onHandleShare={handleShare}
      />
    );
  }

  // Nếu là người xem thường → render Public View
  console.log("❌ Rendering LostPetDetail Public View - isOwner:", isOwner);
  return (
    <div className="space-y-4">
      {/* 1) HEADER NỖI BẬT - ẢNH VÀ BADGE */}
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
                isFound
                  ? "bg-green-500"
                  : "bg-red-500 animate-pulse"
              }`}
            >
              {getStatusName(pet.status)}
            </div>
          </div>

          {/* Badge category */}
          <div className="absolute top-4 left-4">
            <div className="px-3 py-1 rounded-full bg-blue-500 text-white text-xs font-semibold">
              {getCategoryName(pet.category)}
            </div>
          </div>
        </div>

        <div className="p-4 bg-white border-b">
          <h3 className="text-2xl font-bold text-gray-900">{pet.name}</h3>
          <p className="text-sm text-red-700 mt-1">
            Nếu bạn thấy mèo, hãy báo tin. Chủ mèo sẽ xem xét và gửi thưởng.
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Đăng bởi: {owner?.display_name || "Người dùng ẩn danh"}
          </p>
        </div>
      </section>

      {/* 2) THÔNG TIN MẤT TÍCH */}
      {!isFound && (
        <section className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <h3 className="font-bold text-red-900 mb-3">📍 Thông tin mất tích</h3>

          <div className="space-y-3 text-sm">
            {/* Vị trí mất */}
            <div className="flex items-start gap-3">
              <span className="text-lg">📍</span>
              <div>
                <p className="font-semibold text-gray-900">Vị trí mất tích</p>
                <p className="text-gray-700">{pet.district || "Không xác định"}</p>
                <button
                  onClick={openGoogleMaps}
                  className="text-blue-600 underline text-xs mt-1"
                >
                  Mở Google Maps →
                </button>
              </div>
            </div>

            {/* Thời gian mất */}
            <div className="flex items-start gap-3">
              <span className="text-lg">🕒</span>
              <div>
                <p className="font-semibold text-gray-900">Thời gian mất</p>
                <p className="text-gray-700">
                  {createdDate.toLocaleString("vi-VN")}
                </p>
                <p className="text-orange-600 font-semibold text-xs mt-1">
                  ⏳ Đã {daysAgo} ngày
                </p>
              </div>
            </div>

            {/* Hoàn cảnh */}
            {pet.description && (
              <div className="flex items-start gap-3">
                <span className="text-lg">❗</span>
                <div>
                  <p className="font-semibold text-gray-900">Hoàn cảnh</p>
                  <p className="text-gray-700">{pet.description}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3) THƯỞNG & LIÊN HỆ */}
      <section className="p-4 bg-yellow-50 border rounded-lg">
        {pet.bounty_amount && pet.bounty_amount > 0 && (
          <ContextualHelpCard
            cardId="lost-pet-bounty"
            icon="🎁"
            title="Tiền Thưởng Tìm Kiếm"
            content="Khoản thưởng khuyến khích người tốt bụng báo tin nếu thấy mèo. Không phải mua bán, mà là tri ân công sức người giúp đỡ - cách nói 'Cảm ơn bạn đã mang lại hy vọng cho gia đình'."
            position="bottom"
          >
            <div className="mb-4 p-3 bg-amber-100 border-2 border-amber-400 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎁</span>
                <h4 className="font-bold text-amber-900">Treo thưởng tìm kiếm</h4>
              </div>
              <p className="text-3xl font-bold text-amber-900">
                {pet.bounty_amount.toLocaleString()}đ
              </p>
              <p className="text-xs text-amber-800 mt-2 mb-3">
                Người tìm thấy và xác nhận thành công sẽ nhận được phần thưởng này
              </p>
              <details className="text-xs text-amber-700 cursor-pointer">
                <summary className="font-semibold hover:text-amber-900">Ý nghĩa của tiền thưởng?</summary>
                <div className="mt-2 p-2 bg-white rounded border-l-2 border-amber-400">
                  <p className="leading-relaxed mb-2">
                    <strong className="text-gray-900">Khoản thưởng nhằm khuyến khích mọi người chủ động tìm kiếm và báo tin.</strong>
                  </p>
                  <p className="leading-relaxed">
                    Không phải mua bán, mà là <strong>tri ân công sức người giúp đỡ</strong> - cách chúng tôi nói "Cảm ơn bạn đã là người tốt bụng, đã mang lại hy vọng trở lại cho gia đình!"
                  </p>
                </div>
              </details>
            </div>
          </ContextualHelpCard>
        )}
        {pet.max_deposit && (
          <div className="mb-4 p-3 bg-yellow-100 rounded border-l-4 border-yellow-500">
            <p className="font-bold text-lg text-yellow-900">
              💰 Thưởng {pet.max_deposit.toLocaleString()}đ nếu tìm thấy
            </p>
          </div>
        )}

        <h3 className="font-bold text-gray-900 mb-3">📞 Liên hệ ngay</h3>

        <div className="space-y-2 text-sm">
          {owner?.phone && (
            <a
              href={`tel:${owner.phone}`}
              className="block w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded text-center"
            >
              ☎️ Gọi: {owner.phone}
            </a>
          )}

          {owner?.email && (
            <a
              href={`mailto:${owner.email}`}
              className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded text-center"
            >
              ✉️ Email: {owner.email}
            </a>
          )}

          {owner?.zalo && (
            <div className="block w-full bg-sky-500 text-white font-bold py-2 px-4 rounded text-center">
              💬 Zalo: {owner.zalo}
            </div>
          )}

          {owner?.display_name && (
            <div className="block w-full bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded text-center border border-gray-300">
              👤 Chủ: {owner.display_name}
            </div>
          )}

          {!owner?.phone && !owner?.email && !owner?.zalo && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-gray-700">
              ⚠️ Chủ bài đăng chưa cập nhật thông tin liên hệ
            </div>
          )}
        </div>
      </section>

      {/* 4) BẢN ĐỒ */}
      {pet.lat && pet.lng && (
        <section className="p-4 border rounded-lg">
          <h3 className="font-bold text-gray-900 mb-3">🗺 Vị trí mất tích</h3>
          <button
            onClick={openGoogleMaps}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded font-semibold text-sm"
          >
            📍 Xem trên Google Maps
          </button>
        </section>
      )}

      {/* 5) TÌNH TRẠNG BÀI */}
      <section className="p-4 border rounded-lg">
        <h3 className="font-bold text-gray-900 mb-3">📊 Tình trạng</h3>
        <div className="flex items-center gap-3">
          <div
            className={`w-4 h-4 rounded-full ${
              isFound ? "bg-green-500" : "bg-red-500 animate-pulse"
            }`}
          ></div>
          <span className="text-sm text-gray-700">
            {isFound ? "✅ Đã tìm thấy" : "🔴 Đang tìm"}
          </span>
          <span className="text-xs text-gray-500">
            {sightings.length} báo nhìn thấy
          </span>
        </div>
      </section>

      {/* 6) BÁO NHÌN THẤY */}
      <section className="p-4 border rounded-lg">
        <h3 className="font-bold text-gray-900 mb-3">
          👀 Báo nhìn thấy ({sightings.length})
        </h3>

        {sightings.length === 0 ? (
          <p className="text-sm text-gray-600">Chưa có báo nhìn thấy nào.</p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {sightings.map((s) => (
              <div key={s.id} className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-sm">
                <div className="flex items-start gap-2 mb-2">
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
                    <p className="font-semibold text-gray-900 text-xs">
                      {s.reporter?.display_name || 'Người dùng ẩn danh'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(s.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
                {s.metadata?.location && (
                  <p className="text-xs text-gray-700 mb-1">📍 {s.metadata.location}</p>
                )}
                {s.description && (
                  <p className="text-sm text-gray-700 mt-1">{s.description}</p>
                )}
                {s.metadata?.image_url && (
                  <img
                    src={s.metadata.image_url}
                    alt="Sighting"
                    className="w-full max-w-xs rounded mt-2"
                  />
                )}
                {s.metadata?.verified !== undefined && (
                  <div className={`mt-2 text-xs font-semibold ${s.metadata.verified ? 'text-green-700' : 'text-red-700'}`}>
                    {s.metadata.verified ? '✅ Đã xác nhận bởi chủ' : '❌ Không chính xác'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isFound && user && (
          <button
            onClick={() => setShowSightingForm(!showSightingForm)}
            className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded font-semibold text-sm"
          >
            📷 Gửi báo nhìn thấy
          </button>
        )}
      </section>

      {/* FORM GỬI BÁO NHÌN THẤY */}
      {showSightingForm && !isFound && user && (
        <section className="p-4 border rounded-lg bg-blue-50">
          <h3 className="font-bold text-gray-900 mb-3">Gửi báo nhìn thấy</h3>
          <form onSubmit={handleSubmitSighting} className="space-y-3 text-sm">
            {/* Ảnh */}
            <div>
              <label className="block font-semibold mb-1">Ảnh (tuỳ chọn)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSightingImage(e.target.files?.[0] || null)}
                className="text-xs"
              />
            </div>

            {/* Vị trí */}
            <div>
              <label className="block font-semibold mb-1">Vị trí *</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Gần cây xanh bên đường Nguyễn Huệ"
                value={sightingLocation}
                onChange={(e) => setSightingLocation(e.target.value)}
                className="w-full border rounded px-3 py-2 text-xs"
              />
            </div>

            {/* Mô tả */}
            <div>
              <label className="block font-semibold mb-1">Mô tả ngắn</label>
              <textarea
                placeholder="Ví dụ: Mèo đang ngồi dưới gầm xe"
                value={sightingDescription}
                onChange={(e) => setSightingDescription(e.target.value)}
                rows={3}
                className="w-full border rounded px-3 py-2 text-xs"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submittingSighting}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded font-semibold text-xs disabled:opacity-50"
              >
                {submittingSighting ? "Đang gửi..." : "Gửi báo"}
              </button>
              <button
                type="button"
                onClick={() => setShowSightingForm(false)}
                className="flex-1 border rounded py-2 text-xs"
              >
                Hủy
              </button>
            </div>
          </form>
        </section>
      )}

      {/* 9) XÁC NHẬN GIAO/NHẬN - DÀNH CHO FINDER */}
      {(() => {
        console.log("🚀🚀🚀 IIFE EXECUTED - This should always run if public view renders");
        
        // Debug logging
        console.log("🔍 Finder Panel Check:", {
          isOwner,
          hasUser: !!user,
          userId: user?.id,
          sightingsCount: sightings.length,
          sightings: sightings.map(s => ({
            id: s.id,
            actor_id: s.actor_id,
            verified: s.metadata?.verified,
            finder_confirmed: s.metadata?.finder_confirmed
          }))
        });

        if (isOwner || !user) return null;

        const mySighting = sightings.find(s => s.actor_id === user.id && s.metadata?.verified === true);
        
        console.log("🔍 My Sighting:", mySighting);
        
        if (!mySighting) return null;

        const finderConfirmed = mySighting?.metadata?.finder_confirmed === true;
        
        return (
          <section className="p-4 bg-white border rounded-lg mt-4">
            {finderConfirmed && !isFound && (
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
                ⏳ Bạn đã xác nhận giao mèo. Chờ chủ xác nhận để nhận thưởng...
              </div>
            )}
            <ConfirmHandoverPanel
              mode="lost"
              isOwner={false}
              isCompleted={isFound || finderConfirmed}
            contactA={{
              name: owner?.display_name || "Chủ mèo",
              phone: owner?.phone || "",
            }}
            contactB={{
              name: user?.email || "Bạn",
              phone: "",
            }}
            onShowQR={() => {
              window.dispatchEvent(new CustomEvent("open-qr-modal", { detail: { petId: pet.id, mode: "lost" } }));
            }}
            onConfirm={async () => {
              if (!confirm("Bạn xác nhận đã giao mèo cho chủ?")) return;
              
              try {
                // Find user's verified sighting
                const mySighting = sightings.find(s => s.actor_id === user.id && s.metadata?.verified === true);
                if (!mySighting) {
                  alert("Không tìm thấy sighting của bạn");
                  return;
                }

                // Update metadata to mark finder confirmed
                const { error } = await supabase
                  .from("adoption_activities")
                  .update({
                    metadata: {
                      ...mySighting.metadata,
                      finder_confirmed: true,
                      finder_confirmed_at: new Date().toISOString(),
                    }
                  })
                  .eq("id", mySighting.id);

                if (error) throw error;

                // Reload sightings
                const { data: updatedSightings } = await supabase
                  .from("adoption_activities")
                  .select(`
                    *,
                    reporter:actor_id (
                      id,
                      display_name,
                      avatar_url,
                      phone
                    )
                  `)
                  .eq("pet_id", pet.id)
                  .eq("activity_type", "sighting")
                  .order("created_at", { ascending: false });

                setSightings(updatedSightings || []);
                alert("✅ Đã gửi xác nhận! Chờ chủ xác nhận để nhận thưởng.");
              } catch (err) {
                console.error(err);
                alert("Lỗi: " + err.message);
              }
            }}
            onCancelReward={() => {
              if (confirm("Bạn chắc chắn muốn Hủy nhận thưởng? Tiền sẽ về ví người đăng (không rút, chỉ đổi voucher).")) {
                window.dispatchEvent(
                  new CustomEvent("lost-cancel-reward", { detail: { petId: pet.id } })
                );
                alert("Đã chọn hủy nhận thưởng.");
              }
            }}
            statusLabel={isFound ? "Đã xác nhận giao/nhận" : finderConfirmed ? "Đã gửi xác nhận" : "Chờ giao mèo"}
          />
        </section>
        );
      })()}

      {/* 7) HÀNH ĐỘNG CHỦ BÀI */}
      {isOwner && (
        <section className="p-4 bg-gray-100 rounded-lg border space-y-2">
          <h3 className="font-bold text-gray-900 mb-2">⚙️ Quản lý bài đăng</h3>
          
          <button
            onClick={onEdit}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded font-semibold text-sm"
          >
            ✏️ Chỉnh sửa
          </button>

          <button
            onClick={() => {
              const link = window.location.href;
              const message = `🆘 GIÚP TÌM MÈO MẤT TÍCH!\n\n🐱 ${pet.name}\n${pet.description ? `📝 ${pet.description.substring(0, 100)}${pet.description.length > 100 ? '...' : ''}\n` : ''}${pet.bounty_amount ? `🎁 Treo thưởng: ${pet.bounty_amount.toLocaleString()}đ\n` : ''}📅 Mất từ: ${new Date(pet.created_at).toLocaleDateString('vi-VN')}\n\n📍 Chi tiết & liên hệ: ${link}`;
              
              if (navigator.share) {
                navigator.share({ 
                  title: `🆘 Tìm mèo: ${pet.name}`,
                  text: message,
                  url: link 
                });
              } else {
                navigator.clipboard.writeText(message);
                alert("✅ Đã copy nội dung chia sẻ!");
              }
            }}
            className="w-full px-4 py-2 bg-purple-500 text-white rounded font-semibold text-sm"
          >
            🔗 Copy link bài đăng
          </button>

          {!isFound && (
            <button
              onClick={onMarkAsFound}
              className="w-full px-4 py-2 bg-green-500 text-white rounded font-semibold text-sm"
            >
              🟢 Đánh dấu "Đã tìm thấy"
            </button>
          )}

          <button
            onClick={onDelete}
            className="w-full px-4 py-2 bg-red-500 text-white rounded font-semibold text-sm"
          >
            🗑 Xóa bài
          </button>
        </section>
      )}

      {/* 8) HÀNH ĐỘNG NGƯỜI XEM */}
      {!isOwner && user && !isFound && (
        <section className="p-4 border-t bg-gray-50 rounded-lg flex gap-2 text-sm">
          <button
            onClick={() => setShowSightingForm(!showSightingForm)}
            className="flex-1 px-4 py-3 bg-blue-500 text-white rounded font-semibold"
          >
            💬 Báo nhìn thấy
          </button>

          {owner?.phone && (
            <a
              href={`tel:${owner.phone}`}
              className="flex-1 px-4 py-3 bg-green-500 text-white rounded font-semibold text-center"
            >
              📞 Gọi
            </a>
          )}

          <button
            onClick={handleShare}
            className="flex-1 px-4 py-3 bg-gray-500 text-white rounded font-semibold"
          >
            📤 Chia sẻ
          </button>
        </section>
      )}
    </div>
  );
}
