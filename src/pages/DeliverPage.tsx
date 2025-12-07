import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

type Deposit = {
  id: string;
  pet_id: string;
  owner_id: string;
  receiver_id: string;
  status: string;
  delivery_status: string | null;
};

export default function DeliverPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string>("Đang kiểm tra mã...");
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [canRate, setCanRate] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);
  const [score, setScore] = useState<1 | 0 | null>(1);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!token) {
        setMsg("Mã không hợp lệ.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // 1. Lấy deposit theo delivery_token
      const { data: dep, error: depErr } = await supabase
        .from("deposits")
        .select(
          "id, pet_id, owner_id, receiver_id, status, delivery_status"
        )
        .eq("delivery_token", token)
        .single();

      if (depErr || !dep) {
        setMsg("Mã giao mèo không hợp lệ hoặc đã bị xoá.");
        setLoading(false);
        return;
      }

      // 2. Kiểm tra đăng nhập
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) {
        setMsg("Bạn cần đăng nhập bằng tài khoản đã đăng bài mèo.");
        setLoading(false);
        return;
      }

      const currentUserId = authData.user.id;

      // 3. Chỉ cho CHỦ BÀI ĐĂNG xác nhận giao mèo
      if (currentUserId !== dep.owner_id) {
        setMsg("Bạn không phải người đăng bài mèo này, không thể xác nhận giao mèo.");
        setLoading(false);
        return;
      }

      // 4. Nếu tiền cọc chưa được confirm thì chặn
      if (dep.status !== "confirmed") {
        setMsg(
          "Tiền cọc chưa được admin xác nhận. Không thể xác nhận giao mèo."
        );
        setLoading(false);
        return;
      }

      // 5. Nếu chưa đánh dấu delivered thì update
      if (dep.delivery_status !== "delivered") {
        const { error: updErr } = await supabase
          .from("deposits")
          .update({
            delivery_status: "delivered",
            delivered_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", dep.id);

        if (updErr) {
          setMsg("Lỗi khi cập nhật trạng thái giao mèo.");
          setLoading(false);
          return;
        }

        // cập nhật trạng thái pet nếu muốn
        const { error: petUpdErr } = await supabase
          .from("pets")
          .update({ status: "delivered" })
          .eq("id", dep.pet_id);
        // Optionally handle petUpdErr if needed
      }

      setDeposit(dep);
      setMsg("Đã xác nhận giao mèo thành công.");

      // 6. Kiểm tra xem đã đánh giá chưa
      const { data: existingRating, error: ratingErr } = await supabase
        .from("adoption_ratings")
        .select("id, score, comment")
        .eq("deposit_id", dep.id)
        .eq("rater_id", currentUserId)
        .maybeSingle();

      if (ratingErr) {
        // lỗi nhẹ, vẫn cho đánh giá
        setCanRate(true);
      } else if (existingRating) {
        setRatingDone(true);
        setCanRate(false);
        setScore(existingRating.score as 1 | 0);
        setComment(existingRating.comment || "");
      } else {
        setCanRate(true);
      }

      setLoading(false);
    };

    run();
  }, [token]);

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deposit || score === null) return;

    setError(null);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setError("Bạn đã bị đăng xuất. Vui lòng đăng nhập lại.");
      return;
    }

    const raterId = authData.user.id;

    const { error: insErr } = await supabase
      .from("adoption_ratings")
      .insert({
        deposit_id: deposit.id,
        pet_id: deposit.pet_id,
        rater_id: raterId,
        target_id: deposit.receiver_id,
        score,
        comment: comment.trim() || null,
      });

    if (insErr) {
      setError("Không lưu được đánh giá. " + insErr.message);
      return;
    }

    setRatingDone(true);
    setCanRate(false);
  };

  // =============== RENDER ==================

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
        Xác nhận giao mèo
      </h1>

      <p style={{ marginBottom: 12 }}>{msg}</p>

      {loading && <div>Đang xử lý...</div>}

      {!loading && deposit && (
        <>
          <hr style={{ margin: "16px 0" }} />

          {ratingDone && (
            <div
              style={{
                padding: 12,
                border: "1px solid #cbd5e1",
                borderRadius: 8,
                marginBottom: 12,
                background: "#f1f5f9",
              }}
            >
              <div style={{ marginBottom: 4, fontWeight: 500 }}>
                Bạn đã gửi đánh giá cho lần nhận mèo này.
              </div>
              <div>
                Kết quả:{" "}
                <strong>{score === 1 ? "OK / Tốt" : "Không OK"}</strong>
              </div>
              {comment && (
                <div style={{ marginTop: 4, fontSize: 13 }}>
                  Ghi chú: {comment}
                </div>
              )}
            </div>
          )}

          {canRate && !ratingDone && (
            <form onSubmit={handleSubmitRating}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 8,
                  marginTop: 8,
                }}
              >
                Đánh giá người nhận mèo
              </h2>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  Kết quả giao mèo:
                </label>
                <label style={{ marginRight: 16 }}>
                  <input
                    type="radio"
                    name="score"
                    value="1"
                    checked={score === 1}
                    onChange={() => setScore(1)}
                  />{" "}
                  Mọi thứ ổn (OK)
                </label>
                <label>
                  <input
                    type="radio"
                    name="score"
                    value="0"
                    checked={score === 0}
                    onChange={() => setScore(0)}
                  />{" "}
                  Có vấn đề (Không OK)
                </label>
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", marginBottom: 4 }}>
                  Ghi chú (tuỳ chọn):
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  style={{ width: "100%", padding: 8 }}
                  placeholder="Ví dụ: đến đúng giờ, lịch sự, chăm mèo tốt..."
                />
              </div>

              {error && (
                <div
                  style={{
                    marginBottom: 8,
                    color: "#b91c1c",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "1px solid #16a34a",
                  background: "#16a34a",
                  color: "white",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Gửi đánh giá
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
