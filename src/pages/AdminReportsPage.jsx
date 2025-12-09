import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdminReportsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      // Kiểm tra quyền admin
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) {
        setError("Bạn cần đăng nhập.");
        setLoading(false);
        return;
      }

      const userId = authData.user.id;

      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (profErr || !profile || profile.role !== "admin") {
        setError("Bạn không có quyền admin.");
        setLoading(false);
        return;
      }

      // Load báo cáo pending
      const { data, error: repErr } = await supabase
        .from("adoption_reports")
        .select(
          "id, deposit_id, pet_id, reporter_id, target_id, reason_category, reason_detail, status, created_at"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (repErr) {
        setError(repErr.message);
        setLoading(false);
        return;
      }

      setReports(data || []);
      setLoading(false);
    };

    load();
  }, []);

  const reload = async () => {
    setLoading(true);
    setError("");

    const { data, error: repErr } = await supabase
      .from("adoption_reports")
      .select(
        "id, deposit_id, pet_id, reporter_id, target_id, reason_category, reason_detail, status, created_at"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (repErr) {
      setError(repErr.message);
      setLoading(false);
      return;
    }

    setReports(data || []);
    setLoading(false);
  };

  const handleUpdate = async (report, newStatus) => {
    setUpdatingId(report.id);
    setError("");

    try {
      // 1. Cập nhật status báo cáo
      const { error: updErr } = await supabase
        .from("adoption_reports")
        .update({
          status: newStatus,
          handled_at: new Date().toISOString(),
        })
        .eq("id", report.id)
        .eq("status", "pending");

      if (updErr) {
        setError("Không cập nhật được báo cáo: " + updErr.message);
        setUpdatingId(null);
        return;
      }

      // 2. Nếu Accept → hạ uy tín (tạo / cập nhật adoption_ratings với score=0)
      if (newStatus === "accepted") {
        const depositId = report.deposit_id;
        const raterId = report.reporter_id; // người báo cáo
        const targetId = report.target_id;

        // Kiểm tra xem đã có rating của người này cho giao dịch này chưa
        const { data: existing, error: existErr } = await supabase
          .from("adoption_ratings")
          .select("id, score, comment")
          .eq("deposit_id", depositId)
          .eq("rater_id", raterId)
          .maybeSingle();

        if (!existErr) {
          if (existing) {
            // Đã có rating → update thành score=0, append comment
            await supabase
              .from("adoption_ratings")
              .update({
                score: 0,
                comment:
                  (existing.comment || "") +
                  (existing.comment ? " | " : "") +
                  "Hạ uy tín do báo cáo được admin chấp nhận.",
              })
              .eq("id", existing.id);
          } else {
            // Chưa có rating → insert mới
            await supabase.from("adoption_ratings").insert({
              deposit_id: depositId,
              pet_id: report.pet_id,
              rater_id: raterId,
              target_id: targetId,
              score: 0,
              comment: "Hạ uy tín do báo cáo được admin chấp nhận.",
            });
          }
        }
      }

      setUpdatingId(null);
      await reload();
    } catch (err) {
      console.error(err);
      setError("Có lỗi: " + err.message);
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  if (error && !loading) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: "#dc2626" }}>{error}</p>
        {error.includes("không có quyền") && (
          <button onClick={() => navigate("/")} style={{ marginTop: 12 }}>
            Về trang chủ
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
        Quản lý báo cáo hành vi xấu
      </h1>

      {reports.length === 0 ? (
        <div style={{ fontSize: 14, color: "#6b7280", padding: 20, background: "#f3f4f6", borderRadius: 6 }}>
          ✅ Không có báo cáo nào đang chờ.
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 6 }}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead style={{ background: "#f3f4f6" }}>
              <tr>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Thời gian</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Deposit / Pet</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Reporter → Target</th>
                <th style={{ padding: 12, textAlign: "left", fontWeight: 600 }}>Lý do</th>
                <th style={{ padding: 12, textAlign: "center", fontWeight: 600 }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr
                  key={r.id}
                  style={{
                    borderTop: "1px solid #e5e7eb",
                    verticalAlign: "top",
                  }}
                >
                  <td style={{ padding: 12 }}>
                    {new Date(r.created_at).toLocaleString("vi-VN")}
                  </td>
                  <td style={{ padding: 12 }}>
                    <div>Dep: <strong>{r.deposit_id.slice(0, 8)}</strong></div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Pet: {r.pet_id.slice(0, 8)}</div>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontFamily: "monospace", fontSize: 12 }}>
                      {r.reporter_id.slice(0, 8)} → {r.target_id.slice(0, 8)}
                    </div>
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {r.reason_category === "no_show"
                        ? "Không đến / bùng hẹn"
                        : r.reason_category === "late"
                        ? "Đi trễ, không báo"
                        : r.reason_category === "rude"
                        ? "Thái độ xấu"
                        : r.reason_category === "fraud"
                        ? "Dấu hiệu lừa đảo"
                        : "Khác"}
                    </div>
                    {r.reason_detail && (
                      <div style={{ fontSize: 12, color: "#4b5563" }}>
                        "{r.reason_detail}"
                      </div>
                    )}
                  </td>
                  <td style={{ padding: 12, textAlign: "center" }}>
                    <button
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        borderRadius: 4,
                        background: "#16a34a",
                        color: "#fff",
                        border: "none",
                        cursor: updatingId === r.id ? "not-allowed" : "pointer",
                        opacity: updatingId === r.id ? 0.6 : 1,
                        marginRight: 8,
                      }}
                      disabled={updatingId === r.id}
                      onClick={() => handleUpdate(r, "accepted")}
                    >
                      Chấp nhận
                    </button>
                    <button
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        borderRadius: 4,
                        background: "#6b7280",
                        color: "#fff",
                        border: "none",
                        cursor: updatingId === r.id ? "not-allowed" : "pointer",
                        opacity: updatingId === r.id ? 0.6 : 1,
                      }}
                      disabled={updatingId === r.id}
                      onClick={() => handleUpdate(r, "rejected")}
                    >
                      Từ chối
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: 20,
          padding: "10px 20px",
          borderRadius: 6,
          background: "#3b82f6",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        Về trang chủ
      </button>
    </div>
  );
}
