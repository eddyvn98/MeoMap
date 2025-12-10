import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import PostsSection from "./PostsSection";

const DrawerContainer = ({ isOpen, onClose, children, widthMode = "normal" }) => {
  if (!isOpen) return null;
  const width = widthMode === "wide" ? "520px" : widthMode === "compact" ? "360px" : "440px";

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <>
      <div
        onClick={handleOverlayClick}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.3)",
          zIndex: 9999,
          pointerEvents: "auto",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: width,
          background: "#fff",
          boxShadow: "-12px 0 40px rgba(0,0,0,0.1)",
          zIndex: 10000,
          display: "flex",
          flexDirection: "column",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 700 }}>Hồ sơ</div>
          <button
            onClick={onClose}
            style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 16 }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>{children}</div>
      </div>
    </>
  );
};

const ProfileHeader = ({ profile }) => {
  if (!profile) return null;
  return (
    <div style={{ padding: 16, display: "flex", gap: 12, alignItems: "center" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#f3f4f6",
          overflow: "hidden",
        }}
      >
        {profile.avatar_url ? (
          <img src={profile.avatar_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9ca3af",
            }}
          >
            :)
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{profile.display_name || "(Chưa có tên)"}</div>
        {profile.email && <div style={{ fontSize: 13, color: "#6b7280" }}>{profile.email}</div>}
        {profile.phone && <div style={{ fontSize: 13, color: "#6b7280" }}>Tel: {profile.phone}</div>}
        {profile.zalo && <div style={{ fontSize: 13, color: "#6b7280" }}>Zalo: {profile.zalo}</div>}
        <div style={{ fontSize: 13, color: "#6b7280" }}>Số dư ví: {profile.wallet_credit ?? 0} đ</div>
      </div>
    </div>
  );
};

export default function ProfileDrawer({
  isOpen,
  onClose,
  selectedPost = null,
  widthMode = "normal",
  onChangeWidth,
  triggerRef,
  mapBbox,
  inlineWithinMap,
}) {
  const [profile, setProfile] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [lockCountdown, setLockCountdown] = useState({});

  // FLOW 8 BƯỚC:
  // 1. Người nhận đặt cọc (chưa khóa) → status: "pending"
  // 2. Chủ bài thấy danh sách người cọc
  // 3. Hai bên tự liên hệ ngoài hệ thống (show contact info)
  // 4. Khi gặp: chủ bài quét QR hoặc chọn người nhận → "confirmed_at"
  // 5. Xác nhận giao mèo → khóa cọc 3 ngày (locked_until = now + 3 days)
  // 6. Trong 3 ngày chủ bài có thể đánh giá → rating_type
  // 7. Nếu đánh giá tốt → người nhận nhận voucher
  // 8. Sau 3 ngày không đánh giá → auto đánh giá tốt

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData?.user) throw new Error("Không lấy được user");

        // Lấy profile
        const { data: profileData, error: profileErr } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, email, phone, zalo, wallet_credit")
          .eq("id", authData.user.id)
          .single();
        if (profileErr) throw profileErr;
        setProfile(profileData);

        // Lấy deposits của user
        const { data: depData, error: depErr } = await supabase
          .from("deposits")
          .select("*")
          .or(`receiver_id.eq.${authData.user.id},owner_id.eq.${authData.user.id}`)
          .order("created_at", { ascending: false });
        if (depErr) throw depErr;
        setDeposits(depData || []);
      } catch (err) {
        console.error("ProfileDrawer load error:", err);
        setError(err.message || "Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen]);

  // Countdown timer cho cọc bị khóa
  useEffect(() => {
    const timer = setInterval(() => {
      const newCountdown = {};
      deposits.forEach((d) => {
        if (d.locked_until) {
          const now = new Date();
          const lockEnd = new Date(d.locked_until);
          const secondsLeft = Math.max(0, Math.floor((lockEnd - now) / 1000));
          if (secondsLeft > 0) {
            const hours = Math.floor(secondsLeft / 3600);
            const mins = Math.floor((secondsLeft % 3600) / 60);
            const secs = secondsLeft % 60;
            newCountdown[d.id] = `${hours}h ${mins}m ${secs}s`;
          } else {
            newCountdown[d.id] = "Hết hạn";
          }
        }
      });
      setLockCountdown(newCountdown);
    }, 1000);
    return () => clearInterval(timer);
  }, [deposits]);

  const tabs = useMemo(
    () => [
      { key: "overview", label: "Tổng quan" },
      { key: "deposits", label: "Đặt cọc" },
      { key: "posts", label: "Bài viết" },
    ],
    []
  );

  const renderTab = () => {
    if (activeTab === "overview") {
      return (
        <div>
          <ProfileHeader profile={profile} />
          {error && (
            <div
              style={{
                margin: 16,
                padding: 12,
                background: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                color: "#991b1b",
              }}
            >
              {error}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "deposits") {
      return (
        <div style={{ padding: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16 }}>💰 Tất cả đặt cọc</div>
          {deposits.length === 0 ? (
            <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8, color: "#6b7280" }}>
              Chưa có đặt cọc nào
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {deposits.map((d) => {
                const isOwner = profile?.id === d.owner_id;
                const isReceiver = profile?.id === d.receiver_id;
                const isLocked = d.locked_until && new Date(d.locked_until) > new Date();
                const isPending = d.status === "pending";
                const isConfirmed = d.status === "confirmed";
                const isRated = d.rating_type;

                return (
                  <div
                    key={d.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 12,
                      background: isLocked ? "#f0fdf4" : isPending ? "#fffbeb" : "#f9fafb",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          🐱 {d.pet?.name || "Mèo"}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          💵 {d.amount?.toLocaleString("vi-VN") || 0} đ
                        </div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1e40af" }}>
                        {isPending && "⏳ Chờ xác nhận"}
                        {isConfirmed && isLocked && `🔒 ${lockCountdown[d.id] || "..."}`}
                        {isConfirmed && !isLocked && "✅ Hết hạn đánh giá"}
                        {isRated && "⭐ Đã đánh giá"}
                      </div>
                    </div>

                    {/* Flow Status */}
                    {isOwner && isPending && (
                      <div style={{ fontSize: 12, color: "#f97316", marginBottom: 8 }}>
                        📍 Bước 2: Chủ bài thấy danh sách người cọc
                      </div>
                    )}
                    {isReceiver && isPending && (
                      <div style={{ fontSize: 12, color: "#10b981", marginBottom: 8 }}>
                        ✓ Bước 1: Bạn đã đặt cọc (chưa khóa)
                      </div>
                    )}
                    {isConfirmed && (
                      <div style={{ fontSize: 12, color: "#3b82f6", marginBottom: 8 }}>
                        🔐 Bước 5: Cọc đã khóa {isLocked ? "3 ngày" : "hết hạn"}
                      </div>
                    )}

                    {/* Bước 3: Contact Info */}
                    {!isPending && d.receiver && (
                      <div style={{ fontSize: 12, background: "#f0f9ff", padding: 8, borderRadius: 6, marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, marginBottom: 4 }}>📞 Bước 3: Liên hệ ngoài hệ thống</div>
                        {d.receiver.email && <div>Email: {d.receiver.email}</div>}
                        {d.receiver.phone && <div>SĐT: {d.receiver.phone}</div>}
                        {d.receiver.zalo && <div>Zalo: {d.receiver.zalo}</div>}
                      </div>
                    )}

                    {/* Bước 6-7: Đánh giá */}
                    {isOwner && isConfirmed && isLocked && !isRated && (
                      <div style={{ padding: 8, background: "#fef3c7", borderRadius: 6, marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}>
                          ⭐ Bước 6-7: Đánh giá người nhận
                        </div>
                        <div style={{ display: "grid", gap: 6 }}>
                          {[
                            { type: "good", label: "😊 Tốt (+voucher)", color: "#10b981" },
                            { type: "neutral", label: "😐 Trung bình", color: "#f59e0b" },
                            { type: "bad", label: "😞 Xấu", color: "#ef4444" },
                          ].map((r) => (
                            <button
                              key={r.type}
                              onClick={async () => {
                                try {
                                  const { error } = await supabase
                                    .from("deposits")
                                    .update({ rating_type: r.type })
                                    .eq("id", d.id);
                                  if (error) throw error;
                                  alert("Đánh giá thành công!");
                                  window.location.reload();
                                } catch (err) {
                                  alert("Lỗi: " + err.message);
                                }
                              }}
                              style={{
                                padding: "8px 12px",
                                background: r.color,
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                cursor: "pointer",
                                fontSize: 12,
                                fontWeight: 500,
                              }}
                            >
                              {r.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {isRated && (
                      <div style={{ padding: 8, background: "#dcfce7", borderRadius: 6, fontSize: 12, color: "#166534", fontWeight: 500 }}>
                        ✅ Đánh giá: {d.rating_type === "good" ? "😊 Tốt" : d.rating_type === "neutral" ? "😐 Trung bình" : "😞 Xấu"}
                      </div>
                    )}

                    {/* Bước 4-5: Xác nhận giao */}
                    {isOwner && isPending && (
                      <button
                        onClick={async () => {
                          try {
                            const lockedUntil = new Date();
                            lockedUntil.setDate(lockedUntil.getDate() + 3);
                            const { error } = await supabase
                              .from("deposits")
                              .update({
                                status: "confirmed",
                                confirmed_at: new Date().toISOString(),
                                locked_until: lockedUntil.toISOString(),
                              })
                              .eq("id", d.id);
                            if (error) throw error;
                            alert("✅ Xác nhận giao mèo! Cọc khóa 3 ngày");
                            window.location.reload();
                          } catch (err) {
                            alert("Lỗi: " + err.message);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          background: "#3b82f6",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        🔐 Bước 4-5: Quét QR & Khóa cọc 3 ngày
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    if (activeTab === "posts") {
      return (
        <div style={{ padding: 8 }}>
          <PostsSection
            onViewDetail={() => alert("Chi tiết bài viết")}
            onEdit={() => alert("Chỉnh sửa bài viết")}
            onDelete={() => alert("Xóa bài viết")}
            onShowQR={() => alert("Hiển thị QR")}
            onEnterToken={() => alert("Nhập token")}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <DrawerContainer isOpen={isOpen} onClose={onClose} widthMode={widthMode}>
      <div style={{ display: "flex", gap: 4, padding: 12, borderBottom: "1px solid #e5e7eb" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              border: "1px solid #e5e7eb",
              background: activeTab === t.key ? "#111827" : "#fff",
              color: activeTab === t.key ? "#fff" : "#111827",
              padding: "8px 12px",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ padding: 16 }}>Đang tải...</div> : renderTab()}
    </DrawerContainer>
  );
}
