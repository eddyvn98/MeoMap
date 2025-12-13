import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function MyReportsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reports, setReports] = useState([]);

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
      {loading && <div>Đang tải...</div>}
      {error && <div style={{ color: "#b91c1c" }}>{error}</div>}

      {!loading && !error && (
        reports.length === 0 ? (
          <div style={{ color: "#6b7280" }}>Chưa có báo nào.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {reports.map((r) => (
              <div key={r.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Pet #{String(r.pet_id).slice(0, 8)} • {new Date(r.created_at).toLocaleString("vi-VN")}</div>
                {r.description && (
                  <div style={{ marginTop: 6, fontSize: 13 }}>{r.description}</div>
                )}
                {r.metadata?.location && (
                  <div style={{ marginTop: 4, fontSize: 12, color: "#374151" }}>📍 {r.metadata.location}</div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => openQrForReport(r)} style={btnPrimary}>📱 Hiện QR</button>
                  <button onClick={() => cancelReward(r)} style={btnDanger}>Hủy nhận thưởng</button>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                  Nhắc: Sau khi trao mèo, hãy đưa người đăng quét/nhấn xác nhận để nhận thưởng. Nếu bạn từ chối thưởng, tiền sẽ về ví người đăng và quy đổi voucher.
                </div>
              </div>
            ))}
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
};

const btnDanger = {
  padding: "8px 12px",
  background: "#ef4444",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};
