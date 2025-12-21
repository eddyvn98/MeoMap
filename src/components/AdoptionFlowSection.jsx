import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "../supabaseClient";
import { sendDeliveryNotification } from "../services/emailService";

export default function AdoptionFlowSection({
  user,
  profile,
  selectedPost,
  adoptionRequests,
  setAdoptionRequests,
  myAdoptionRequest,
  setMyAdoptionRequest,
  loadingRequests,
  sortBy,
  setSortBy,
}) {
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanRequestId, setScanRequestId] = useState(null);
  const [scanInput, setScanInput] = useState("");
  const [scanError, setScanError] = useState("");

  // Auto-complete mechanism: Check delivered requests after 3 days
  useEffect(() => {
    if (!adoptionRequests?.length) return;

    const delivered = adoptionRequests.filter((r) => r.status === "delivered" && !r.receiver_confirmed_checkin);
    if (!delivered.length) return;

    const interval = setInterval(() => {
      delivered.forEach((req) => {
        const deliveredAt = new Date(req.delivered_at);
        const now = new Date();
        const daysPassed = (now - deliveredAt) / (1000 * 60 * 60 * 24);

        if (daysPassed >= 3 && req.status === "delivered" && !req.owner_confirmed_checkin) {
          autoComplete(req.id);
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [adoptionRequests]);

  const autoComplete = async (requestId) => {
    try {
      // Gọi function SQL để auto-review và refund voucher
      const { data, error } = await supabase.rpc('auto_review_and_refund_deposit', {
        p_adoption_request_id: requestId
      });

      if (error) {
        console.warn("[AdoptionFlowSection] Auto-review error:", error);
        // Fallback: chỉ update status nếu function không tồn tại
        const { error: updateError } = await supabase
          .from("adoption_requests")
          .update({
            status: "completed",
            receiver_confirmed_checkin: true,
            receiver_confirmed_checkin_at: new Date().toISOString(),
            owner_confirmed_checkin: true,
            owner_confirmed_checkin_at: new Date().toISOString(),
          })
          .eq("id", requestId);
        
        if (updateError) throw updateError;
      } else {
        console.log("[AdoptionFlowSection] Auto-review success:", data);
      }

      await reloadRequestsForPost();
    } catch (err) {
      console.warn("[AdoptionFlowSection] Auto-complete error:", err.message);
    }
  };

  const reloadRequestsForPost = async () => {
    if (!selectedPost) return;
    try {
      const { data, error: loadError } = await supabase
        .from("adoption_requests")
        .select(`
          *,
          requester:profiles!requester_id(
            id, display_name, email, phone, zalo, avatar_url, balance_coc, balance_thuong
          )
        `)
        .eq("pet_id", selectedPost.id)
        .order("created_at", { ascending: false });

      if (loadError && loadError.code === "PGRST205") {
        console.warn("[AdoptionFlowSection] adoption_requests table not found");
        return;
      }

      if (loadError) {
        console.error("[AdoptionFlowSection] Error reloading requests:", loadError);
        return;
      }

      setAdoptionRequests(data || []);
    } catch (err) {
      console.warn("[AdoptionFlowSection] Exception reloading requests:", err.message);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from("adoption_requests")
        .update({
          status: "ready_to_deliver",
          accepted_at: new Date().toISOString(),
          delivery_token: Math.random().toString(36).substr(2, 9).toUpperCase(),
          token_generated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
      alert("Đã chấp nhận! Mã quét đã được tạo.");
      await reloadRequestsForPost();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!confirm("Từ chối yêu cầu này?")) return;

    try {
      const { error } = await supabase
        .from("adoption_requests")
        .update({ status: "rejected", rejected_at: new Date().toISOString() })
        .eq("id", requestId);

      if (error) throw error;
      alert("Đã từ chối yêu cầu");
      await reloadRequestsForPost();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!scanInput.trim()) {
      setScanError("Vui lòng nhập hoặc quét mã");
      return;
    }

    try {
      setScanError("");

      let token = scanInput.trim();
      try {
        const parsed = JSON.parse(scanInput);
        token = parsed.delivery_token || scanInput.trim();
      } catch {
        // ignore json parse failure
      }

      const { data: request, error: reqErr } = await supabase
        .from("adoption_requests")
        .select("*")
        .eq("delivery_token", token)
        .eq("id", scanRequestId)
        .single();

      if (reqErr || !request) {
        setScanError("Mã không khớp với yêu cầu này");
        return;
      }

      const { error: updateErr } = await supabase
        .from("adoption_requests")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", scanRequestId);

      if (updateErr) throw updateErr;

      try {
        const adoptionData = {
          adoptionId: scanRequestId,
          petName: selectedPost?.name || "mèo của bạn",
          ownerName: profile?.display_name || "Chủ bài",
          receiverName: request.requester?.display_name || "Bạn",
          receiverEmail: request.requester?.email || "",
        };
        await sendDeliveryNotification(adoptionData);
      } catch (emailErr) {
        console.error("Error sending delivery notification:", emailErr);
      }

      alert("Đã xác nhận giao mèo!");
      setScanInput("");
      setScanRequestId(null);
      setShowScanModal(false);

      await reloadRequestsForPost();
    } catch (err) {
      setScanError("Lỗi: " + err.message);
    }
  };

  const handleRateRequest = async (requestId, isGood) => {
    try {
      // Lấy thông tin adoption request để có deposit_id và pet_id
      const { data: request, error: fetchError } = await supabase
        .from("adoption_requests")
        .select("*, deposits(id)")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;

      const depositId = request.deposits?.[0]?.id || request.deposit_id;
      
      if (!depositId) {
        throw new Error("Không tìm thấy deposit cho yêu cầu này");
      }

      // Xác định ai đang đánh giá ai
      const isOwnerRating = user?.id === request.owner_id;
      const raterId = isOwnerRating ? request.owner_id : request.requester_id;
      const targetId = isOwnerRating ? request.requester_id : request.owner_id;
      
      const comment = isOwnerRating
        ? (isGood ? "Người nhận chăm sóc mèo tốt, có trách nhiệm" : "Người nhận không chăm sóc mèo tốt")
        : (isGood ? "Mèo khỏe mạnh, chủ bài uy tín" : "Có vấn đề với mèo hoặc chủ bài");

      // Tạo rating record
      const { error: ratingError } = await supabase
        .from("adoption_ratings")
        .insert({
          deposit_id: depositId,
          pet_id: request.pet_id,
          rater_id: raterId,
          target_id: targetId,
          score: isGood ? 1 : 0,           // 1 = good, 0 = bad
          comment: comment,
          auto_reviewed: false
        });

      if (ratingError && ratingError.code !== '23505') { // 23505 = duplicate key (đã rating rồi)
        throw ratingError;
      }

      // Gọi function refund để hoàn tiền về voucher
      const { data: refundResult, error: refundError } = await supabase
        .rpc('refund_deposit_as_voucher', {
          p_adoption_request_id: requestId
        });

      if (refundError) {
        console.warn("Refund error:", refundError);
        // Fallback: vẫn update status
      }

      // Update adoption request status
      const { error: updateError } = await supabase
        .from("adoption_requests")
        .update({
          status: "completed",
          receiver_confirmed_checkin: true,
          receiver_confirmed_checkin_at: new Date().toISOString(),
          owner_confirmed_checkin: true,
          owner_confirmed_checkin_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      const message = isOwnerRating
        ? (isGood 
            ? "✅ Cảm ơn đánh giá tốt! Tiền cọc đã được hoàn về voucher cho người nhận." 
            : "📝 Ghi nhận đánh giá. Tiền cọc sẽ được hoàn về voucher cho bạn.")
        : (isGood 
            ? "✅ Cảm ơn đánh giá tốt! Tiền cọc đã được hoàn về voucher cho bạn." 
            : "📝 Ghi nhận đánh giá. Tiền cọc sẽ được hoàn về voucher cho chủ bài.");
      alert(message);
      await reloadRequestsForPost();
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const renderTimeline = () => {
    let currentStep = 1;
    let stepLabel = "Danh sách";

    if (adoptionRequests && adoptionRequests.length > 0) {
      const accepted = adoptionRequests.find(
        (r) =>
          r.status === "ready_to_deliver" ||
          r.status === "delivered" ||
          r.status === "completed"
      );
      
      if (accepted) {
        if (accepted.status === "ready_to_deliver") {
          currentStep = 3;
          stepLabel = "Quét/Chọn";
        } else if (accepted.status === "delivered") {
          currentStep = 4;
          stepLabel = "Xác nhận giao";
        } else if (accepted.status === "completed") {
          currentStep = 5;
          stepLabel = "Đánh giá";
        }
      }
    }

    const steps = [
      { id: 1, label: "Chọn người nhận", icon: "📋" },
      // { id: 2, label: "Cọc(nếu có)", icon: "💰" },
      { id: 3, label: "Nhắn tin", icon: "💬" },
      { id: 4, label: "Giao nhận", icon: "🤝" },
      { id: 5, label: "Đánh giá", icon: "⭐" },
    ];

    return (
      <div
        style={{
          marginBottom: 16,
          padding: 12,
          background: "#f0f9ff",
          borderRadius: 8,
          border: "1px solid #93c5fd",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: "#1e40af", marginBottom: 8 }}>
          Quy trình nhận mèo • Bước: <span style={{ color: "#ea580c" }}>{stepLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, overflowX: "auto" }}>
          {steps.map((step, idx) => (
            <div key={step.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: step.id < currentStep ? "#10b981" : step.id === currentStep ? "#f97316" : "#d1d5db",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {step.id < currentStep ? "✓" : step.icon}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    color: step.id <= currentStep ? "#374151" : "#9ca3af",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                  }}
                >
                  {step.label}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div
                  style={{
                    flex: "0 0 8px",
                    height: 2,
                    background: step.id < currentStep ? "#10b981" : "#d1d5db",
                    marginTop: -16,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderRequesterPanel = () => {
    if (!myAdoptionRequest || selectedPost.owner_id === user?.id) return null;

    const status = myAdoptionRequest.status;

    return (
      <div
        style={{
          marginBottom: 16,
          padding: 16,
          background: "#f0f9ff",
          border: "2px solid #3b82f6",
          borderRadius: 8,
        }}
      >
        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#1e40af" }}>
          📋 Tiến trình nhận mèo của bạn
        </h4>

        {status === "pending" && (
          <div style={{ padding: 12, background: "#fef3c7", borderRadius: 6 }}>
            <div style={{ fontWeight: 600, color: "#92400e", marginBottom: 4 }}>⏳ Chờ chủ bài xác nhận</div>
            <div style={{ fontSize: 13, color: "#78350f" }}>
              Yêu cầu gửi lúc: {new Date(myAdoptionRequest.created_at).toLocaleString("vi-VN")}
            </div>
          </div>
        )}

        {(status === "ready_to_deliver" || status === "delivered" || status === "completed") && (
          <>
            {status === "ready_to_deliver" && (
              <div style={{ padding: 12, background: "#dcfce7", borderRadius: 6, marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: "#166534", marginBottom: 4 }}>✅ Đã được chấp nhận!</div>
                <div style={{ fontSize: 13, color: "#14532d" }}>
                  Sẵn sàng nhận mèo. Bạn có mã quét QR.
                </div>
              </div>
            )}

            {(status === "ready_to_deliver" || status === "delivered" || status === "completed") && myAdoptionRequest.delivery_token && (
              <div style={{ padding: 16, background: "#dbeafe", borderRadius: 8, textAlign: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: "#1e40af", marginBottom: 12, fontSize: 16 }}>
                  📱 MÃ NHẬN MÈO
                </div>
                <div style={{ marginBottom: 12, display: "flex", justifyContent: "center" }}>
                  <QRCodeSVG value={myAdoptionRequest.delivery_token} size={140} />
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, letterSpacing: 3, color: "#1e40af", marginBottom: 8 }}>
                  {myAdoptionRequest.delivery_token}
                </div>
                <div style={{ fontSize: 13, color: "#1e40af" }}>
                  Đưa mã này cho chủ bài khi nhận mèo
                </div>
              </div>
            )}

            {status === "delivered" && !myAdoptionRequest.receiver_confirmed_checkin && (
              <div style={{ padding: 14, background: "#fef3c7", borderRadius: 8, border: "2px solid #f59e0b", marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>
                  🎯 Bước tiếp theo
                </div>
                <div style={{ fontSize: 14, color: "#374151", marginBottom: 12, lineHeight: 1.5 }}>
                  <strong>Đánh giá chủ bài</strong> sau khi nhận mèo. Mèo có khỏe mạnh không?
                </div>
                <div style={{ fontSize: 13, color: "#d97706", marginBottom: 12, background: "#fef3c7", padding: 8, borderRadius: 4 }}>
                  ⏰ <strong>Lưu ý:</strong> Sau 3 ngày nếu không đánh giá, hệ thống sẽ tự động đánh giá tốt và hoàn tiền cọc về voucher cho bạn.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    onClick={() => handleRateRequest(myAdoptionRequest.id, true)}
                    style={{
                      padding: "12px 16px",
                      background: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    ⭐ Tốt
                  </button>
                  <button
                    onClick={() => handleRateRequest(myAdoptionRequest.id, false)}
                    style={{
                      padding: "12px 16px",
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    ⚠️ Có vấn đề
                  </button>
                </div>
              </div>
            )}

            {status === "completed" && (
              <div style={{ padding: 12, background: "#dcfce7", borderRadius: 6, marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: "#166534", marginBottom: 4 }}>✅ Hoàn tất!</div>
                <div style={{ fontSize: 13, color: "#14532d" }}>
                  Giao dịch đã hoàn tất thành công.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderOwnerRequests = () => {
    if (!selectedPost || selectedPost.owner_id !== user?.id) return null;

    return (
      <div style={{ marginBottom: 16, border: "2px solid #3b82f6", padding: 12, borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            👥 Danh sách nhận ({adoptionRequests.length})
            {loadingRequests && <span style={{ fontSize: 12, color: "#6b7280" }}>Đang tải...</span>}
          </h4>
        </div>

        {!loadingRequests && adoptionRequests.length === 0 && (
          <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8, textAlign: "center", color: "#6b7280", fontSize: 14 }}>
            Chưa có ai liên hệ nhận
          </div>
        )}

        {adoptionRequests
          .filter((req) => req.status !== "rejected")
          .map((request) => {
            const requester = request.requester;
            const isPending = request.status === "pending";
            const isReadyToDeliver = request.status === "ready_to_deliver";
            const isDelivered = request.status === "delivered";
            const isCompleted = request.status === "completed";

            return (
              <div
                key={request.id}
                style={{
                  marginBottom: 12,
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  background: isReadyToDeliver ? "#f0fdf4" : isDelivered ? "#eff6ff" : "#fff",
                }}
              >
                {/* Requester info */}
                <div style={{ display: "flex", alignItems: "start", gap: 8, marginBottom: 12 }}>
                  {requester?.avatar_url && (
                    <img
                      src={requester.avatar_url}
                      alt={requester.display_name}
                      style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                      {requester?.display_name || "Người dùng"}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                      {new Date(request.created_at).toLocaleString("vi-VN")}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
                      {requester?.email && <span style={{ color: "#6b7280" }}>📧 {requester.email}</span>}
                      {requester?.phone && <span style={{ color: "#6b7280" }}>📱 {requester.phone}</span>}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div style={{ marginBottom: 12, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {isPending && (
                    <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 4, background: "#fef3c7", color: "#92400e", fontWeight: 600 }}>
                      ⏳ Chờ bạn xác nhận
                    </span>
                  )}
                  {isReadyToDeliver && (
                    <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 4, background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
                      ✅ Sẵn sàng giao
                    </span>
                  )}
                  {isDelivered && (
                    <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 4, background: "#dbeafe", color: "#1e40af", fontWeight: 600 }}>
                      🎉 Đã giao
                    </span>
                  )}
                  {isCompleted && (
                    <span style={{ fontSize: 12, padding: "4px 10px", borderRadius: 4, background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
                      ✅ Hoàn tất
                    </span>
                  )}
                </div>

                {/* Action buttons for pending requests */}
                {isPending && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        background: "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      ✅ Chấp nhận
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      ❌ Từ chối
                    </button>
                  </div>
                )}

                {/* Scan QR button for ready_to_deliver */}
                {isReadyToDeliver && (
                  <button
                    onClick={() => {
                      setScanRequestId(request.id);
                      setScanInput("");
                      setScanError("");
                      setShowScanModal(true);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "#06b6d4",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      marginBottom: 12,
                    }}
                  >
                    📱 Quét mã giao
                  </button>
                )}

                {/* Rating buttons for delivered requests */}
                {isDelivered && !isCompleted && (
                  <div style={{ padding: 12, background: "#fef3c7", borderRadius: 8, marginBottom: 12, border: "2px solid #f59e0b" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#92400e", marginBottom: 8 }}>
                      ⭐ Đánh giá người nhận
                    </div>
                    <div style={{ fontSize: 12, color: "#d97706", marginBottom: 10, lineHeight: 1.4 }}>
                      💡 <strong>Quan trọng:</strong> Nếu đánh giá tốt, người nhận sẽ được hoàn tiền cọc về voucher. Nếu đánh giá xấu, bạn sẽ nhận voucher bồi thường.
                      <br/>⏰ Sau 3 ngày không đánh giá, hệ thống sẽ tự động đánh giá tốt.
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <button
                        onClick={() => handleRateRequest(request.id, true)}
                        style={{
                          padding: "10px 12px",
                          background: "#10b981",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        👍 Tốt
                      </button>
                      <button
                        onClick={() => handleRateRequest(request.id, false)}
                        style={{
                          padding: "10px 12px",
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        👎 Có vấn đề
                      </button>
                    </div>
                  </div>
                )}

                {/* Completed info */}
                {isCompleted && (
                  <div style={{ padding: 10, background: "#dcfce7", borderRadius: 6, fontSize: 12, color: "#166534", fontWeight: 500 }}>
                    ✅ Giao dịch đã hoàn tất thành công!
                  </div>
                )}
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <>
      {renderTimeline()}
      {renderRequesterPanel()}
      {renderOwnerRequests()}

      {showScanModal && (
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
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 12,
              boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
              maxWidth: 400,
              width: "90%",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>📱 Quét mã xác nhận giao mèo</div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: "#6b7280", marginBottom: 6, display: "block" }}>
                Nhập hoặc quét mã:
              </label>
              <input
                type="text"
                value={scanInput}
                onChange={(e) => {
                  setScanInput(e.target.value);
                  setScanError("");
                }}
                placeholder="Quét mã QR hoặc nhập token"
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontSize: 14,
                  fontFamily: "monospace",
                }}
              />
            </div>

            {scanError && (
              <div
                style={{
                  padding: 12,
                  background: "#fee2e2",
                  border: "1px solid #fecaca",
                  borderRadius: 6,
                  color: "#991b1b",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {scanError}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleConfirmDelivery}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                ✓ Xác nhận
              </button>
              <button
                onClick={() => {
                  setShowScanModal(false);
                  setScanInput("");
                  setScanError("");
                  setScanRequestId(null);
                }}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "#ef4444",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                ✗ Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
