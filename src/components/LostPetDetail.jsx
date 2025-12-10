import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import LostPetOwnerView from "./LostPetOwnerView";

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

  const isFound = pet.status === "delivered";
  const createdDate = new Date(pet.created_at);
  const now = new Date();
  const daysAgo = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

  const getCategoryName = (category) => {
    switch (category) {
      case "lost":
        return "Mèo đi lạc";
      case "found":
        return "Mèo nhặt được";
      case "adoption":
        return "Mèo cần nhận nuôi";
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
      }
    };
    console.log("🔍 LostPetDetail - isOwner:", isOwner, "pet.owner_id:", pet.owner_id, "user.id:", user?.id);
    loadOwner();
  }, [pet.owner_id]);

  // Load sightings
  useEffect(() => {
    const loadSightings = async () => {
      const { data, error } = await supabase
        .from("adoption_activities")
        .select("*")
        .eq("adoption_request_id", pet.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        if (error.code === 'PGRST205') {
          console.warn('[LostPetDetail] adoption_activities table not found; skipping sightings');
          setSightings([]);
        } else {
          console.error('Load sightings error:', error);
        }
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

      await supabase.from("adoption_activities").insert({
        adoption_request_id: pet.id,
        activity_type: "sighting",
        actor_id: user.id,
        actor_type: "viewer",
        description: sightingDescription,
        metadata: {
          location: sightingLocation,
          image_url: imageUrl,
        },
        created_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error && error.code === 'PGRST205') {
          console.warn('[LostPetDetail] adoption_activities table not found; skipping insert');
        } else if (error) {
          throw error;
        }
      });

      alert("Cảm ơn bạn đã báo nhìn thấy! 🙏");
      setSightingDescription("");
      setSightingLocation("");
      setSightingImage(null);
      setShowSightingForm(false);

      // Reload sightings
      const { data: updatedSightings, error: reloadError } = await supabase
        .from("adoption_activities")
        .select("*")
        .eq("adoption_request_id", pet.id)
        .order("created_at", { ascending: false });

      if (reloadError && reloadError.code !== 'PGRST205') {
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

      if (error && error.code !== 'PGRST205') {
        throw error;
      }

      setSightingVerifications({
        ...sightingVerifications,
        [sightingId]: isValid
      });

      // Reload
      const { data: updatedSightings } = await supabase
        .from("adoption_activities")
        .select("*")
        .eq("adoption_request_id", pet.id)
        .order("created_at", { ascending: false });

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
              ✉️ Email
            </a>
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
            {sightings.map((s, idx) => (
              <div key={idx} className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded text-sm">
                <p className="font-semibold text-gray-900">
                  {new Date(s.created_at).toLocaleString("vi-VN")}
                </p>
                {s.metadata?.location && (
                  <p className="text-xs text-gray-700">📍 {s.metadata.location}</p>
                )}
                {s.description && (
                  <p className="text-sm text-gray-700 mt-1">{s.description}</p>
                )}
                {s.metadata?.image_url && (
                  <img
                    src={s.metadata.image_url}
                    alt="Sighting"
                    className="w-20 h-20 object-cover rounded mt-2"
                  />
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
