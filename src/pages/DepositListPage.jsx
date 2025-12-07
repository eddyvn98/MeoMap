// src/pages/DepositListPage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";

export default function DepositListPage() {
  const [deposits, setDeposits] = useState([]);
  const [petsById, setPetsById] = useState({});
  const [reputationByUser, setReputationByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  // Proof upload modal state
  const [proofModal, setProofModal] = useState(null); // { depositId, file, note, uploading }
  const [proofError, setProofError] = useState("");

  // Cancel delivery state
  const [canceling, setCanceling] = useState(null); // depositId being cancelled

  // Rating modal state
  const [ratingModal, setRatingModal] = useState(null); // { depositId, isOk, comment, submitting }
  const [ratingError, setRatingError] = useState("");
  const [ratedDeposits, setRatedDeposits] = useState(new Set()); // Track which deposits have been rated

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg("");

      // 1. Lấy user hiện tại (người đăng)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMsg("Bạn cần đăng nhập bằng tài khoản người đăng.");
        setLoading(false);
        return;
      }

      setCurrentUser(user);
      const ownerId = user.id;

      // 2. Lấy danh sách cọp mà bạn là owner, mọi status
      const { data: depRows, error: depErr } = await supabase
        .from("deposits")
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false });

      if (depErr) {
        console.error(depErr);
        setErrorMsg("Không tải được danh sách cọc.");
        setLoading(false);
        return;
      }

      const list = depRows || [];
      setDeposits(list);

      // 3. Lấy info pet tương ứng
      const petIds = [...new Set(list.map((d) => d.pet_id))].filter(Boolean);

      if (petIds.length > 0) {
        const { data: pets, error: petsErr } = await supabase
          .from("pets")
          .select("id, name, district, status")
          .in("id", petIds);

        if (petsErr) {
          console.error(petsErr);
        } else {
          const map = {};
          for (const p of pets) {
            map[p.id] = p;
          }
          setPetsById(map);
        }
      }

      // 4. Lấy uy tín người nhận (seeker)
      const seekerIds = [...new Set(list.map((d) => d.receiver_id))].filter(
        Boolean
      );

      if (seekerIds.length > 0) {
        const { data: reps, error: repErr } = await supabase
          .from("user_reputation")
          .select("user_id, good_count, bad_count")
          .in("user_id", seekerIds);

        if (repErr) {
          console.error(repErr);
        } else {
          const repMap = {};
          for (const r of reps) {
            repMap[r.user_id] = r;
          }
          setReputationByUser(repMap);
        }
      }

      setLoading(false);
    };

    load();
  }, []);

  // Handle proof upload
  const handleProofSubmit = async () => {
    if (!proofModal || !proofModal.file || !currentUser) return;

    const depositId = proofModal.depositId;
    const file = proofModal.file;
    const note = proofModal.note || "";

    setProofModal({ ...proofModal, uploading: true });
    setProofError("");

    try {
      // Upload file to Supabase Storage
      const timestamp = Date.now();
      const fileName = `deposit-${depositId}-${timestamp}.jpg`;
      const { error: uploadErr, data: uploadData } = await supabase.storage
        .from("deposit-proofs")
        .upload(fileName, file);

      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("deposit-proofs")
        .getPublicUrl(fileName);

      const imageUrl = urlData?.publicUrl;
      if (!imageUrl) throw new Error("Không lấy được URL ảnh.");

      // Update deposit with proof and change status to pending
      const { error: updateErr } = await supabase
        .from("deposits")
        .update({
          proof_image_url: imageUrl,
          proof_note: note,
          status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", depositId)
        .eq("receiver_id", currentUser.id);

      if (updateErr) throw updateErr;

      // Update local state
      setDeposits((prev) =>
        prev.map((d) =>
          d.id === depositId
            ? { ...d, proof_image_url: imageUrl, proof_note: note, status: "pending" }
            : d
        )
      );

      setProofModal(null);
    } catch (err) {
      console.error(err);
      setProofError(err.message || "Không thể gửi bằng chứng.");
    } finally {
      setProofModal({ ...proofModal, uploading: false });
    }
  };

  // Check if owner has already rated this deposit
  const checkRatingStatus = async (depositId) => {
    if (!currentUser) return;

    const { data: existingRating, error } = await supabase
      .from("adoption_ratings")
      .select("id")
      .eq("deposit_id", depositId)
      .eq("rater_id", currentUser.id)
      .single();

    if (!error && existingRating) {
      // Already rated
      setRatedDeposits((prev) => new Set([...prev, depositId]));
      return true;
    }

    return false;
  };

  // Open rating modal
  const handleOpenRating = async (deposit) => {
    const alreadyRated = await checkRatingStatus(deposit.id);
    if (alreadyRated) {
      alert("Bạn đã đánh giá deposit này rồi.");
      return;
    }

    setRatingModal({
      depositId: deposit.id,
      receiverId: deposit.receiver_id,
      petId: deposit.pet_id,
      isOk: true,
      comment: "",
      submitting: false,
    });
    setRatingError("");
  };

  // Submit rating
  const handleSubmitRating = async () => {
    if (!ratingModal || !currentUser) return;

    setRatingModal({ ...ratingModal, submitting: true });
    setRatingError("");

    try {
      const { error } = await supabase.from("adoption_ratings").insert({
        deposit_id: ratingModal.depositId,
        pet_id: ratingModal.petId,
        rater_id: currentUser.id,
        target_id: ratingModal.receiverId,
        score: ratingModal.isOk ? 1 : 0,
        comment: ratingModal.comment,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Mark as rated
      setRatedDeposits((prev) => new Set([...prev, ratingModal.depositId]));

      alert(
        ratingModal.isOk
          ? "Cảm ơn bạn đã đánh giá OK cho giao dịch này!"
          : "Đánh giá KHÔNG OK đã được ghi nhận."
      );

      setRatingModal(null);
    } catch (err) {
      console.error(err);
      setRatingError(err.message || "Không thể gửi đánh giá.");
    } finally {
      setRatingModal({ ...ratingModal, submitting: false });
    }
  };
  const handleCancelDelivery = async (deposit) => {
    if (!currentUser) return;
    
    if (deposit.status !== "confirmed") {
      alert("Cọc chưa được xác nhận tiền, không cần hủy giao mèo.");
      return;
    }

    if (deposit.delivery_status === "delivered") {
      alert("Mèo đã được đánh dấu là giao xong, không thể hủy.");
      return;
    }

    if (deposit.delivery_status === "cancelled_no_trade") {
      alert("Giao dịch đã bị hủy trước đó.");
      return;
    }

    const isOwner = currentUser.id === deposit.owner_id;
    const isReceiver = currentUser.id === deposit.receiver_id;

    if (!isOwner && !isReceiver) {
      alert("Bạn không có quyền hủy giao dịch này.");
      return;
    }

    const confirmMsg = isOwner
      ? "Bạn có chắc muốn HỦY GIAO DỊCH (không trao mèo)? Tiền cọc sẽ được trả về ví người nhận."
      : "Bạn có chắc muốn HỦY GIAO DỊCH (không nhận mèo)? Tiền cọc sẽ được trả về ví của bạn.";

    if (!window.confirm(confirmMsg)) return;

    setCanceling(deposit.id);

    try {
      // 1. Get deposit data
      const receiverId = deposit.receiver_id;
      const amount = deposit.amount;

      // 2. Update deposit: mark as cancelled_no_trade
      const { error: updateError } = await supabase
        .from("deposits")
        .update({
          delivery_status: "cancelled_no_trade",
          delivery_cancel_reason: "Hai bên không giao mèo, tiền giữ lại trong ví người cọc.",
          delivery_cancelled_by: currentUser.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", deposit.id);

      if (updateError) throw updateError;

      // 3. Increase wallet credit for receiver
      const { error: walletError } = await supabase.rpc(
        "increase_wallet_credit",
        {
          p_user_id: receiverId,
          p_amount: amount,
        }
      );

      if (walletError) throw walletError;

      // 4. Update pet status back to available
      await supabase
        .from("pets")
        .update({ status: "available" })
        .eq("id", deposit.pet_id);

      // 5. Update local state
      setDeposits((prev) =>
        prev.map((d) =>
          d.id === deposit.id
            ? {
                ...d,
                delivery_status: "cancelled_no_trade",
                delivery_cancel_reason: "Hai bên không giao mèo, tiền giữ lại trong ví người cọc.",
                delivery_cancelled_by: currentUser.id,
              }
            : d
        )
      );

      alert(
        `Đã hủy giao dịch. Tiền cọc ${amount.toLocaleString()} đ đã được trả về ví người nhận.`
      );
    } catch (err) {
      console.error(err);
      alert(err.message || "Không thể hủy giao dịch.");
    } finally {
      setCanceling(null);
    }
  };

  if (loading) {
    return <div style={{ padding: 16 }}>Đang tải danh sách cọc...</div>;
  }

  if (errorMsg) {
    return <div style={{ padding: 16, color: "red" }}>{errorMsg}</div>;
  }

  if (!deposits.length) {
    return (
      <div style={{ padding: 16 }}>
        Hiện chưa có cọc nào đang chờ.
        <br />
        <button onClick={() => navigate("/")} style={{ marginTop: 8 }}>
          Về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Các cọc đang chờ</h2>
      <p style={{ fontSize: 14, color: "#555" }}>
        Đây là danh sách người nhận đã đặt cọc để xin mèo của bạn.
        Bạn có thể xem uy tín mỗi người trước khi quyết định trao mèo.
      </p>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {deposits.map((d) => {
          const pet = petsById[d.pet_id];
          const rep = reputationByUser[d.receiver_id];

          return (
            <li
              key={d.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <p style={{ margin: "4px 0" }}>
                <strong>Mèo:</strong> {pet ? pet.name : d.pet_id}
              </p>
              {pet && pet.district && (
                <p style={{ margin: "4px 0" }}>
                  <strong>Khu vực:</strong> {pet.district}
                </p>
              )}
              <p style={{ margin: "4px 0" }}>
                <strong>Số tiền cọc:</strong>{" "}
                {d.amount != null ? `${d.amount.toLocaleString()} đ` : "Không rõ"}
              </p>
              <p style={{ margin: "4px 0", fontSize: 12, color: "#555" }}>
                Đặt cọp lúc:{" "}
                {d.created_at
                  ? new Date(d.created_at).toLocaleString()
                  : "Không rõ"}
              </p>

              {/* Trạng thái cọp */}
              {d.status === "cancelled" ? (
                <p style={{ margin: "8px 0", fontSize: 12, color: "#dc2626" }}>
                  <strong>Trạng thái: ĐÃ HUỶ CọP</strong>
                  {d.cancel_reason && (
                    <div style={{ marginTop: 4, fontSize: 11, color: "#991b1b" }}>
                      Lý do: {d.cancel_reason}
                    </div>
                  )}
                </p>
              ) : d.status === "locked" ? (
                <p style={{ margin: "8px 0", fontSize: 12, color: "#9333ea" }}>
                  <strong>Trạng thái: Chưa gửi bằng chứng</strong>
                  <div style={{ marginTop: 4, fontSize: 11, color: "#6b21a8" }}>
                    Hãy chuyển tiền theo hướng dẫn và gửi bằng chứng để admin xác nhận.
                  </div>
                </p>
              ) : d.status === "pending" ? (
                <p style={{ margin: "8px 0", fontSize: 12, color: "#b45309" }}>
                  <strong>Trạng thái: Đang chờ admin xác nhận</strong>
                  <div style={{ marginTop: 4, fontSize: 11, color: "#78350f" }}>
                    Nếu bạn đã chuyển khoán đúng STK, đúng số tiền và ghi mã cọp mà sau X phút vẫn chưa được xác nhận, vui lòng kiểm tra lại giao dịch hoặc liên hệ admin.
                  </div>
                </p>
              ) : d.status === "confirmed" ? (
                <p style={{ margin: "8px 0", fontSize: 12, color: "#16a34a" }}>
                  <strong>Trạng thái: Cọp đã ĐƯợc XÁC NHẬN</strong>
                  <div style={{ marginTop: 4, fontSize: 11, color: "#166534" }}>
                    Bạn hãy liên hệ người nhận để hẹn giao mèo.
                  </div>
                </p>
              ) : null}

              {/* Trạng thái tiền cọc */}
              <div style={{ margin: "12px 0", padding: 12, background: "#f0f9ff", borderRadius: 8, border: "1px solid #bfdbfe" }}>
                <p style={{ margin: "0 0 8px 0", fontSize: 12, fontWeight: 600, color: "#1e40af" }}>
                  📍 Trạng thái tiền cọc:
                </p>
                {d.status === "locked" && (
                  <p style={{ margin: 0, fontSize: 12, color: "#1e3a8a" }}>
                    Bạn đã tạo cọc, đang chờ admin xác nhận. Tiền đang nằm ở tài khoản ngân hàng của admin, chưa chuyển thành credit.
                  </p>
                )}
                {d.status === "pending" && (
                  <p style={{ margin: 0, fontSize: 12, color: "#1e3a8a" }}>
                    Bạn đã gửi bằng chứng chuyển tiền, đang chờ admin xác nhận. Tiền đang nằm ở tài khoản ngân hàng, chưa chuyển thành credit.
                  </p>
                )}
                {d.status === "confirmed" && !d.delivery_status && (
                  <p style={{ margin: 0, fontSize: 12, color: "#1e3a8a" }}>
                    Cọc đã được admin xác nhận. Tiền đang tạm giữ, chờ giao mèo hoặc hủy giao dịch.
                  </p>
                )}
                {d.delivery_status === "delivered" && (
                  <p style={{ margin: 0, fontSize: 12, color: "#166534" }}>
                    ✅ Giao mèo thành công. Tiền cọc đã được sử dụng cho giao dịch này.
                  </p>
                )}
                {d.delivery_status === "cancelled_no_trade" && (
                  <p style={{ margin: 0, fontSize: 12, color: "#7f1d1d" }}>
                    🔄 Giao dịch đã hủy, tiền cọc {d.amount.toLocaleString()} đ đã chuyển thành credit trong ví của bạn.
                  </p>
                )}
              </div>

              {/* Hiển thị QR code khi đã confirm và có delivery_token */}
              {d.status === "confirmed" && d.delivery_token && !d.delivery_status && (
                <div style={{ margin: "12px 0", padding: 12, background: "#f0fdf4", borderRadius: 8, border: "1px solid #86efac" }}>
                  <p style={{ margin: "4px 0 8px 0", fontSize: 13, color: "#166534", fontWeight: "bold" }}>
                    Mã QR giao mèo
                  </p>
                  <div style={{ background: "#fff", padding: 12, borderRadius: 6, display: "inline-block" }}>
                    <QRCodeCanvas
                      value={`https://map-meo.web.app/deliver/${d.delivery_token}`}
                      size={180}
                    />
                  </div>
                  <p style={{ margin: "8px 0 0 0", fontSize: 11, color: "#166534" }}>
                    Mã token: <strong>{d.delivery_token}</strong>
                  </p>
                  <p style={{ margin: "4px 0 0 0", fontSize: 11, color: "#555" }}>
                    Khi gặp người nhận, đưa QR này cho họ quét để xác nhận giao mèo.
                  </p>
                </div>
              )}

              {/* Nút hủy giao dịch khi status = confirmed và chưa delivered */}
              {d.status === "confirmed" && 
               !d.delivery_status && 
               (currentUser.id === d.owner_id || currentUser.id === d.receiver_id) && (
                <button
                  onClick={() => handleCancelDelivery(d)}
                  disabled={canceling === d.id}
                  style={{
                    marginTop: 8,
                    padding: "8px 16px",
                    background: canceling === d.id ? "#9ca3af" : "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: canceling === d.id ? "not-allowed" : "pointer",
                    fontSize: 13,
                    fontWeight: "bold",
                  }}
                >
                  {canceling === d.id
                    ? "Đang hủy..."
                    : currentUser.id === d.owner_id
                    ? "🚫 Hủy giao dịch, không trao mèo"
                    : "🚫 Không nhận mèo nữa, hủy giao dịch"}
                </button>
              )}

              {/* Hiển thị thông báo nếu đã hủy giao dịch */}
              {d.delivery_status === "cancelled_no_trade" && (
                <div style={{ margin: "12px 0", padding: 12, background: "#fef2f2", borderRadius: 8, border: "1px solid #fca5a5" }}>
                  <p style={{ margin: "4px 0", fontSize: 13, color: "#991b1b", fontWeight: "bold" }}>
                    ⚠️ Giao dịch đã bị hủy (không trao mèo)
                  </p>
                  {d.delivery_cancel_reason && (
                    <p style={{ margin: "4px 0", fontSize: 11, color: "#7f1d1d" }}>
                      Lý do: {d.delivery_cancel_reason}
                    </p>
                  )}
                  <p style={{ margin: "4px 0", fontSize: 11, color: "#7f1d1d" }}>
                    Tiền cọc {d.amount.toLocaleString()} đ đã được hoàn về ví người nhận.
                  </p>
                </div>
              )}

              {/* Hiển thị bằng chứng nếu đã gửi */}
              {d.proof_image_url && (
                <div style={{ margin: "12px 0", padding: 8, background: "#f0fdf4", borderRadius: 6 }}>
                  <p style={{ margin: "4px 0", fontSize: 12, color: "#16a34a" }}>
                    <strong>Bằng chứng đã gửi. Admin sẽ kiểm tra và xác nhận nếu tiền vào tài khoản.</strong>
                  </p>
                  <img
                    src={d.proof_image_url}
                    alt="Bằng chứng"
                    style={{ maxWidth: 200, maxHeight: 200, borderRadius: 6, marginTop: 8 }}
                  />
                  {d.proof_note && (
                    <p style={{ margin: "8px 0 0 0", fontSize: 11, color: "#555" }}>
                      Ghi chú: {d.proof_note}
                    </p>
                  )}
                </div>
              )}

              {/* Nút gửi bằng chứng nếu chưa gửi */}
              {d.status === "locked" && !d.proof_image_url && (
                <button
                  onClick={() =>
                    setProofModal({ depositId: d.id, file: null, note: "", uploading: false })
                  }
                  style={{
                    marginTop: 8,
                    padding: "6px 12px",
                    background: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Gửi bằng chứng chuyển tiền
                </button>
              )}

              {/* Nút đánh giá khi mèo đã được giao */}
              {d.delivery_status === "delivered" && 
               currentUser.id === d.owner_id &&
               !ratedDeposits.has(d.id) && (
                <button
                  onClick={() => handleOpenRating(d)}
                  style={{
                    marginTop: 8,
                    padding: "8px 16px",
                    background: "#f59e0b",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: "bold",
                  }}
                >
                  ⭐ Đánh giá giao dịch
                </button>
              )}

              {rep ? (
                <p style={{ margin: "4px 0", fontSize: 12, color: "#333" }}>
                  Uy tín người nhận: {rep.good_count} OK / {rep.bad_count} KHÔNG OK
                </p>
              ) : (
                <p style={{ margin: "4px 0", fontSize: 12, color: "#999" }}>
                  Người nhận chưa có lịch sử đánh giá.
                </p>
              )}

              <p style={{ margin: "4px 0", fontSize: 12, color: "#999" }}>
                ID người nhận: {d.receiver_id}
              </p>
            </li>
          );
        })}
      </ul>

      {/* Proof Upload Modal */}
      {proofModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => !proofModal.uploading && setProofModal(null)}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 8,
              maxWidth: 400,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Gửi Bằng Chứng Chuyển Tiền</h3>

            {proofError && (
              <p style={{ color: "red", marginBottom: 8, fontSize: 12 }}>{proofError}</p>
            )}

            <div style={{ marginBottom: 12 }}>
              <label>
                <strong>Chụp màn hình giao dịch:</strong>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setProofModal({ ...proofModal, file: e.target.files?.[0] || null })
                }
                disabled={proofModal.uploading}
                style={{ display: "block", marginTop: 4, width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>
                <strong>Ghi chú (tùy chọn):</strong>
              </label>
              <textarea
                placeholder="Ví dụ: Ngân hàng: ACB, chuyển lúc 10:15, có thể delay..."
                value={proofModal.note}
                onChange={(e) =>
                  setProofModal({ ...proofModal, note: e.target.value })
                }
                disabled={proofModal.uploading}
                style={{
                  width: "100%",
                  height: 60,
                  padding: 6,
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleProofSubmit}
                disabled={!proofModal.file || proofModal.uploading}
                style={{
                  flex: 1,
                  padding: 8,
                  background: proofModal.file ? "#16a34a" : "#ccc",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: proofModal.file ? "pointer" : "not-allowed",
                }}
              >
                {proofModal.uploading ? "\u0110ang gửi..." : "Gửi"}
              </button>
              <button
                onClick={() => !proofModal.uploading && setProofModal(null)}
                disabled={proofModal.uploading}
                style={{
                  flex: 1,
                  padding: 8,
                  background: "#e5e7eb",
                  border: "none",
                  borderRadius: 6,
                  cursor: proofModal.uploading ? "not-allowed" : "pointer",
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => !ratingModal.submitting && setRatingModal(null)}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 8,
              maxWidth: 400,
              width: "90%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Đánh giá giao dịch</h3>

            {ratingError && (
              <p style={{ color: "red", marginBottom: 8, fontSize: 12 }}>{ratingError}</p>
            )}

            <div style={{ marginBottom: 12 }}>
              <p style={{ marginBottom: 8, fontWeight: "bold" }}>
                Giao dịch thành công?
              </p>
              <div style={{ display: "flex", gap: 16 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    name="rating"
                    checked={ratingModal.isOk === true}
                    onChange={() =>
                      setRatingModal({ ...ratingModal, isOk: true })
                    }
                    disabled={ratingModal.submitting}
                  />
                  ✅ OK - Giao dịch thành công
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="radio"
                    name="rating"
                    checked={ratingModal.isOk === false}
                    onChange={() =>
                      setRatingModal({ ...ratingModal, isOk: false })
                    }
                    disabled={ratingModal.submitting}
                  />
                  ❌ Không OK - Có vấn đề
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
                Ghi chú (tùy chọn):
              </label>
              <textarea
                placeholder="Mô tả chi tiết về giao dịch..."
                value={ratingModal.comment}
                onChange={(e) =>
                  setRatingModal({ ...ratingModal, comment: e.target.value })
                }
                disabled={ratingModal.submitting}
                style={{
                  width: "100%",
                  height: 80,
                  padding: 8,
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleSubmitRating}
                disabled={ratingModal.submitting}
                style={{
                  flex: 1,
                  padding: 10,
                  background: ratingModal.submitting ? "#9ca3af" : "#f59e0b",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: ratingModal.submitting ? "not-allowed" : "pointer",
                  fontWeight: "bold",
                }}
              >
                {ratingModal.submitting ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
              <button
                onClick={() => !ratingModal.submitting && setRatingModal(null)}
                disabled={ratingModal.submitting}
                style={{
                  flex: 1,
                  padding: 10,
                  background: "#e5e7eb",
                  border: "none",
                  borderRadius: 6,
                  cursor: ratingModal.submitting ? "not-allowed" : "pointer",
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate("/")} style={{ marginTop: 12 }}>
        Về trang chủ
      </button>
    </div>
  );
}
