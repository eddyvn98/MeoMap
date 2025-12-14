import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function MyReportsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reports, setReports] = useState([]);
  const [pets, setPets] = useState({});

  useEffect(() => {
    const init = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
      if (!userData.user) {
        setLoading(false);
        setError("Bạn cần đăng nhập để xem báo của mình.");
        return;
      }
      // Load sightings (adoption_activities with activity_type='sighting') where actor_id = current user
      const { data, error: loadErr } = await supabase
        .from("adoption_activities")
        .select("id, pet_id, actor_id, activity_type, description, metadata, created_at")
        .eq("activity_type", "sighting")
        .eq("actor_id", userData.user.id)
        .order("created_at", { ascending: false });
      if (loadErr) {
        setError("Lỗi tải danh sách báo: " + loadErr.message);
      } else {
        setReports(data || []);
        
        // Load pet info for each sighting
        const petIds = [...new Set(data.map(r => r.pet_id))];
        if (petIds.length > 0) {
          const { data: petsData } = await supabase
            .from("pets")
            .select("id, name, image_url, status, bounty_amount")
            .in("id", petIds);
          
          if (petsData) {
            const petsMap = {};
            petsData.forEach(p => {
              petsMap[p.id] = p;
            });
            setPets(petsMap);
          }
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const openQrForReport = (r) => {
    window.dispatchEvent(
      new CustomEvent("open-qr-modal", { detail: { petId: r.pet_id, mode: "lost" } })
    );
  };

  const cancelReward = (r) => {
    if (!confirm("Bạn chắc chắn muốn Hủy nhận thưởng? Tiền sẽ về ví người đăng (không rút, chỉ đổi voucher).")) return;
    window.dispatchEvent(new CustomEvent("lost-cancel-reward", { detail: { petId: r.pet_id } }));
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>👀 Báo của tôi</h2>
      <div style={{ 
        padding: 12, 
        background: "#eff6ff", 
        border: "1px solid #93c5fd",
        borderRadius: 8,
        fontSize: 13,
        color: "#1e40af",
        marginBottom: 16
      }}>
        💡 <strong>Mẹo:</strong> Tất cả báo nhìn thấy của bạn hiển thị ở đây. Click "Xem bài đăng" để theo dõi tiến trình và liên hệ với chủ.
      </div>
      {loading && <div>Đang tải...</div>}
      {error && <div style={{ color: "#b91c1c" }}>{error}</div>}

      {!loading && !error && (
        reports.length === 0 ? (
          <div style={{ color: "#6b7280" }}>Chưa có báo nào.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {reports.map((r) => {
              const pet = pets[r.pet_id];
              const isVerified = r.metadata?.verified === true;
              const isDelivered = pet?.status === "delivered";
              const bountyAmount = pet?.bounty_amount || 0;
              
              return (
                <div 
                  key={r.id} 
                  style={{ 
                    border: "1px solid #e5e7eb", 
                    borderRadius: 12, 
                    padding: 12,
                    background: isDelivered && isVerified ? "#f0fdf4" : "#fff"
                  }}
                >
                  <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                    {pet?.image_url && (
                      <img 
                        src={pet.image_url} 
                        alt={pet.name}
                        style={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: 8, 
                          objectFit: "cover" 
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>
                        {pet?.name || `Pet #${String(r.pet_id).slice(0, 8)}`}
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        {new Date(r.created_at).toLocaleString("vi-VN")}
                      </div>
                      {isVerified && (
                        <div style={{ 
                          display: "inline-block",
                          marginTop: 4,
                          padding: "2px 8px",
                          background: "#10b981",
                          color: "#fff",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          ✓ Đã xác minh
                        </div>
                      )}
                      {isDelivered && isVerified && bountyAmount > 0 && (
                        <div style={{ 
                          display: "inline-block",
                          marginTop: 4,
                          marginLeft: 6,
                          padding: "2px 8px",
                          background: "#fbbf24",
                          color: "#fff",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 600
                        }}>
                          🎁 {bountyAmount.toLocaleString()}đ
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {r.description && (
                    <div style={{ marginTop: 6, fontSize: 13 }}>{r.description}</div>
                  )}
                  {r.metadata?.location && (
                    <div style={{ marginTop: 4, fontSize: 12, color: "#374151" }}>📍 {r.metadata.location}</div>
                  )}
                  
                  {isDelivered && isVerified ? (
                    <>
                      <div style={{ 
                        marginTop: 10,
                        padding: 8,
                        background: "#dcfce7",
                        borderRadius: 6,
                        fontSize: 12,
                        color: "#166534"
                      }}>
                        ✅ Hoàn thành! {bountyAmount > 0 ? `Bạn đã nhận ${bountyAmount.toLocaleString()}đ thưởng.` : "Cảm ơn bạn đã giúp đỡ!"}
                      </div>
                      <button 
                        onClick={() => navigate(`/pet/${r.pet_id}`)}
                        style={{
                          ...btnSecondary,
                          marginTop: 8,
                          width: "100%"
                        }}
                      >
                        📄 Xem bài đăng
                      </button>
                    </>
                  ) : (
                    <>
                      {/* Nút xem bài đăng nổi bật */}
                      <button 
                        onClick={() => navigate(`/pet/${r.pet_id}`)} 
                        style={{
                          ...btnPrimary,
                          width: "100%",
                          marginTop: 10,
                          background: "#3b82f6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8
                        }}
                      >
                        📄 Xem bài đăng & theo dõi
                      </button>
                      
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button onClick={() => openQrForReport(r)} style={{...btnSecondary, flex: 1}}>📱 Hiện QR</button>
                        <button onClick={() => cancelReward(r)} style={{...btnDanger, flex: 1}}>Hủy thưởng</button>
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                        💡 Xem bài đăng để liên hệ chủ, theo dõi trạng thái xác minh và xác nhận giao mèo.
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

const btnPrimary = {
  padding: "8px 12px",
  background: "#6366f1",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};

const btnSecondary = {
  padding: "8px 12px",
  background: "#64748b",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};

const btnDanger = {
  padding: "8px 12px",
  background: "#ef4444",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
};
