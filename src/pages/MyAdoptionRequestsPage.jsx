import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { getAdoptionRequestStatusStyle } from "./adoptionRequestStatus";

export default function MyAdoptionRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [petsById, setPetsById] = useState({});
  const [ownersById, setOwnersById] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg("");

      try {
        // 1. Lấy user hiện tại (người nhận)
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setErrorMsg("Bạn cần đăng nhập để xem danh sách yêu cầu nhận.");
          setLoading(false);
          return;
        }

        const requesterId = user.id;

        // 2. Lấy danh sách adoption request của người nhận
        const { data: adoptionRequests, error: requestsErr } = await supabase
          .from("adoption_requests")
          .select(`
            *,
            pet:pets(id, name, category, district, status, created_at, owner_id),
            owner:profiles!owner_id(id, display_name, avatar_url, email, phone, zalo)
          `)
          .eq("requester_id", requesterId)
          .order("created_at", { ascending: false });

        if (requestsErr) {
          console.error(requestsErr);
          setErrorMsg("Không tải được danh sách yêu cầu nhận.");
          setLoading(false);
          return;
        }

        setRequests(adoptionRequests || []);
      } catch (err) {
        console.error("Error:", err);
        setErrorMsg("Có lỗi xảy ra: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          🐾 Mèo đang đặt cọc nhận
        </h1>
        <p style={{ fontSize: 16, color: "#6b7280" }}>
          Danh sách các con mèo mà bạn đang có yêu cầu nhận
        </p>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: 12,
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            color: "#991b1b",
            marginBottom: 16,
          }}
        >
          {errorMsg}
        </div>
      )}

      {requests.length === 0 ? (
        <div
          style={{
            padding: 40,
            background: "#f9fafb",
            borderRadius: 8,
            textAlign: "center",
            color: "#6b7280",
          }}
        >
          <p style={{ fontSize: 16, marginBottom: 8 }}>
            Bạn chưa có yêu cầu nhận mèo nào
          </p>
          <button
            onClick={() => navigate("/map")}
            style={{
              padding: "8px 16px",
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Tìm mèo để nhận
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
            gap: 20,
          }}
        >
          {requests.map((request) => {
            const statusInfo = getAdoptionRequestStatusStyle(request.status);
            const pet = request.pet;
            const owner = request.owner;

            return (
              <div
                key={request.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  background: "#fff",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  transition: "all 0.2s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Status Badge */}
                <div style={{ marginBottom: 12 }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "6px 12px",
                      background: statusInfo.bg,
                      color: statusInfo.text,
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {/* Pet Info */}
                <div style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px 0" }}>
                    {pet?.name || "Mèo"}
                  </h3>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
                    📍 {pet?.district || "Chưa rõ khu vực"}
                  </p>
                </div>

                {/* Owner Info */}
                {owner && (
                  <div
                    style={{
                      padding: 12,
                      background: "#f9fafb",
                      borderRadius: 8,
                      marginBottom: 12,
                      fontSize: 13,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 6, color: "#374151" }}>
                      👤 Chủ bài
                    </div>
                    <div style={{ color: "#6b7280", marginBottom: 4 }}>
                      {owner.display_name}
                    </div>
                    {owner.email && (
                      <div style={{ color: "#6b7280", marginBottom: 2 }}>
                        📧 {owner.email}
                      </div>
                    )}
                    {owner.phone && (
                      <div style={{ color: "#6b7280", marginBottom: 2 }}>
                        📞 {owner.phone}
                      </div>
                    )}
                    {owner.zalo && (
                      <div style={{ color: "#6b7280" }}>
                        💬 Zalo: {owner.zalo}
                      </div>
                    )}
                  </div>
                )}

                {/* Timeline Info */}
                <div
                  style={{
                    padding: 12,
                    background: "#f0f9ff",
                    borderRadius: 8,
                    marginBottom: 12,
                    fontSize: 12,
                    color: "#1e40af",
                  }}
                >
                  <div style={{ marginBottom: 4 }}>
                    📅 Gửi yêu cầu:{" "}
                    {new Date(request.created_at).toLocaleString("vi-VN")}
                  </div>
                  {request.accepted_at && (
                    <div style={{ marginBottom: 4 }}>
                      ✅ Chấp nhận:{" "}
                      {new Date(request.accepted_at).toLocaleString("vi-VN")}
                    </div>
                  )}
                  {request.delivered_at && (
                    <div>
                      🎉 Giao:{" "}
                      {new Date(request.delivered_at).toLocaleString("vi-VN")}
                    </div>
                  )}
                  {request.rejected_at && (
                    <div style={{ color: "#991b1b" }}>
                      ❌ Từ chối:{" "}
                      {new Date(request.rejected_at).toLocaleString("vi-VN")}
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={() => navigate(`/map?pet=${pet?.id}`)}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    background: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Xem chi tiết
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
