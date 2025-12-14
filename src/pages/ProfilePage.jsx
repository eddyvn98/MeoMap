// src/pages/ProfilePage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [reputation, setReputation] = useState(null);
  const [reputationScore, setReputationScore] = useState(null);
  const [ratingList, setRatingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) {
        setError("Thiếu thông tin user ID");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1. Load profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // 2. Load tổng hợp uy tín
        const { data: rep, error: repError } = await supabase
          .from("user_reputation")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        setReputation(rep || null);

        // 3. Load điểm uy tín (reputation score)
        const { data: scoreRow, error: scoreError } = await supabase
          .from("user_reputation_score")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        setReputationScore(scoreRow || null);

        // 4. Load danh sách đánh giá chi tiết
        const { data: ratings, error: ratingsError } = await supabase
          .from("adoption_ratings")
          .select("score, comment, created_at, rater_id")
          .eq("target_id", userId)
          .order("created_at", { ascending: false });

        setRatingList(ratings || []);
      } catch (err) {
        console.error("Load profile error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  // Hàm chuyển điểm thành số sao
  function convertScoreToStars(score) {
    if (score >= 40) return 5;
    if (score >= 20) return 4;
    if (score >= 10) return 3;
    if (score >= 0) return 2;
    return 1;
  }

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <p>Đang tải thông tin...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: "red" }}>Lỗi: {error}</p>
        <button onClick={() => navigate("/")}>Về trang chủ</button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: 20 }}>
        <p>Không tìm thấy thông tin người dùng.</p>
        <button onClick={() => navigate("/")}>Về trang chủ</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← Quay lại
      </button>

      <div
        style={{
          padding: 20,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>
          {profile.display_name || "Người dùng"}
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>
          ID: {profile.id}
        </p>

        {profile.role && (
          <p style={{ fontSize: 14, marginTop: 8 }}>
            <strong>Vai trò:</strong> {profile.role}
          </p>
        )}

        {(profile.balance_main !== undefined || profile.balance_coc !== undefined || profile.balance_thuong !== undefined) && (
          <div style={{ fontSize: 14, marginTop: 8 }}>
            <p style={{ margin: "4px 0" }}>
              <strong>💳 Ví chính:</strong>{" "}
              {(profile.balance_main || 0).toLocaleString()} đ
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>🔒 Ví cọc:</strong>{" "}
              {(profile.balance_coc || 0).toLocaleString()} đ
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>🎁 Ví thưởng:</strong>{" "}
              {(profile.balance_thuong || 0).toLocaleString()} đ
            </p>
          </div>
        )}
      </div>

      {/* PHẦN UY TÍN */}
      <div
        style={{
          marginTop: 24,
          padding: 20,
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#f9fafb",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Uy tín nhận mèo
        </h2>

        {reputation ? (
          <div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              Tổng giao dịch:{" "}
              <strong style={{ fontSize: 18 }}>
                {reputation.total_trades}
              </strong>
            </div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              OK:{" "}
              <strong style={{ color: "#16a34a" }}>
                {reputation.ok_trades}
              </strong>
            </div>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              Không OK:{" "}
              <strong style={{ color: "#dc2626" }}>
                {reputation.bad_trades}
              </strong>
            </div>

            {/* Hiển thị điểm sao */}
            {reputationScore && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: 14, marginBottom: 4 }}>
                  Điểm uy tín:{" "}
                  <strong style={{ fontSize: 16 }}>
                    {reputationScore.reputation_score}
                  </strong>
                </div>
                <div style={{ fontSize: 24 }}>
                  {Array(convertScoreToStars(reputationScore.reputation_score))
                    .fill("⭐")
                    .join("")}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: 14, color: "#6b7280" }}>
            Chưa có giao dịch nào.
          </div>
        )}

        {/* DANH SÁCH ĐÁNH GIÁ CHI TIẾT */}
        {ratingList.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                marginBottom: 12,
              }}
            >
              Chi tiết đánh giá ({ratingList.length})
            </h3>

            {ratingList.map((r, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 12,
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 6,
                  background: "#fff",
                }}
              >
                <div style={{ fontSize: 14, marginBottom: 4 }}>
                  Kết quả:{" "}
                  <strong
                    style={{
                      color: r.score === 1 ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {r.score === 1 ? "✅ OK" : "❌ Không OK"}
                  </strong>
                </div>
                {r.comment && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "#374151",
                      marginTop: 6,
                      fontStyle: "italic",
                    }}
                  >
                    "{r.comment}"
                  </div>
                )}
                <div
                  style={{
                    fontSize: 12,
                    color: "#9ca3af",
                    marginTop: 6,
                  }}
                >
                  {new Date(r.created_at).toLocaleString("vi-VN")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: 24,
          padding: "10px 20px",
          background: "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
        }}
      >
        Về trang chủ
      </button>
    </div>
  );
}
