import React from "react";

// Khối danh sách yêu cầu nhận mèo cho chủ bài
export default function AdoptionOwnerSection({
  selectedPost,
  loadingRequests,
  adoptionRequests,
  sortedRequests,
  sortBy,
  setSortBy,
  computeFollowupBadge,
  onAccept,
  onReject,
  onOwnerCancel,
  onConfirmMeeting,
  onOpenScan,
}) {
  if (!selectedPost || adoptionRequests.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: 16, border: "2px solid #3b82f6", padding: 12, borderRadius: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          👥 Người muốn nhận ({adoptionRequests.length})
          {loadingRequests && <span style={{ fontSize: 12, color: "#6b7280" }}>Đang tải...</span>}
        </h4>
        {adoptionRequests.length > 0 && (
          <div style={{ fontSize: 12, color: "#374151", background: "#e0f2fe", padding: "6px 10px", borderRadius: 999, border: "1px solid #93c5fd" }}>
            📌 Nhiệm vụ còn lại: {adoptionRequests.filter(r => r.status === "delivered" && !r.receiver_confirmed_checkin).length} cần người nhận xác nhận
          </div>
        )}
      </div>

      {/* Sort Buttons */}
      {adoptionRequests.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => setSortBy("newest")}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: sortBy === "newest" ? "2px solid #3b82f6" : "1px solid #d1d5db",
              background: sortBy === "newest" ? "#dbeafe" : "#fff",
              color: sortBy === "newest" ? "#1e40af" : "#6b7280",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            🕐 Mới nhất
          </button>
          <button
            onClick={() => setSortBy("deposit")}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: sortBy === "deposit" ? "2px solid #3b82f6" : "1px solid #d1d5db",
              background: sortBy === "deposit" ? "#dbeafe" : "#fff",
              color: sortBy === "deposit" ? "#1e40af" : "#6b7280",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            💰 Cọc cao
          </button>
          <button
            onClick={() => setSortBy("reputation")}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              borderRadius: 6,
              border: sortBy === "reputation" ? "2px solid #3b82f6" : "1px solid #d1d5db",
              background: sortBy === "reputation" ? "#dbeafe" : "#fff",
              color: sortBy === "reputation" ? "#1e40af" : "#6b7280",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            ⭐ Uy tín
          </button>
        </div>
      )}

      {!loadingRequests && adoptionRequests.length === 0 && (
        <div style={{ padding: 16, background: "#f9fafb", borderRadius: 8, textAlign: "center", color: "#6b7280", fontSize: 14 }}>
          Chưa có ai liên hệ nhận
        </div>
      )}

      {sortedRequests.filter(req => req.status !== "rejected").map((request) => {
        const isPending = request.status === "pending";
        const isAccepted = request.status === "accepted";
        const isReadyToDeliver = request.status === "ready_to_deliver";
        const isDelivered = request.status === "delivered";
        const isRejected = request.status === "rejected";
        const follow = computeFollowupBadge(request);

        const requester = request.requester;
        const deposit = requester?.wallet_credit || 0;
        const okTrades = request.requester_rep?.ok_trades || 0;
        const totalTrades = request.requester_rep?.total_trades || 0;

        return (
          <div
            key={request.id}
            data-request-id={request.id}
            style={{
              marginBottom: 12,
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              background: isAccepted ? "#f0fdf4" : isRejected ? "#fef2f2" : "#fff",
            }}
          >
            {/* Requester Info + Stats */}
            <div style={{ display: "flex", alignItems: "start", gap: 8, marginBottom: 10 }}>
              {requester?.avatar_url && (
                <img
                  src={requester.avatar_url}
                  alt={requester.display_name}
                  style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                  {requester?.display_name || "Người dùng"}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                  {new Date(request.created_at).toLocaleString("vi-VN")}
                </div>

                {/* Follow-up badge */}
                {follow.label && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 999, background: follow.bg, color: follow.color, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    {follow.label}
                  </div>
                )}
                
                {/* Stats Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, fontSize: 12 }}>
                  <div style={{ padding: 6, background: "#f0fdf4", borderRadius: 4, textAlign: "center" }}>
                    <div style={{ color: "#6b7280", fontSize: 11 }}>Cọc</div>
                    <div style={{ fontWeight: 600, color: "#10b981" }}>
                      {deposit.toLocaleString("vi-VN")}đ
                    </div>
                  </div>
                  <div style={{ padding: 6, background: "#fef3c7", borderRadius: 4, textAlign: "center" }}>
                    <div style={{ color: "#6b7280", fontSize: 11 }}>Uy tín</div>
                    <div style={{ fontWeight: 600, color: "#f59e0b" }}>
                      ⭐ {okTrades}/{totalTrades}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div style={{ marginBottom: 8 }}>
              {isPending && (
                <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "#fef3c7", color: "#92400e" }}>
                  ⏳ Chờ bạn phản hồi
                </span>
              )}
              {isAccepted && (
                <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "#dcfce7", color: "#166534" }}>
                  ✅ Đã chấp nhận
                </span>
              )}
              {isReadyToDeliver && (
                <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "#dbeafe", color: "#1e40af" }}>
                  📦 Sẵn sàng giao
                </span>
              )}
              {isDelivered && (
                <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "#e0e7ff", color: "#4338ca" }}>
                  🎉 Đã giao
                </span>
              )}
              {request.status === "completed" && (
                <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "#dcfce7", color: "#166534" }}>
                  ✅ Hoàn tất
                </span>
              )}
              {isRejected && (
                <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: "#fee2e2", color: "#991b1b" }}>
                  ❌ Đã từ chối
                </span>
              )}
            </div>

            {/* Contact Info (only show if accepted or beyond) */}
            {(isAccepted || isReadyToDeliver || isDelivered) && request.requester && (
              <div style={{ padding: 8, background: "#f0fdf4", borderRadius: 6, marginBottom: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>📞 Thông tin liên hệ:</div>
                <div>Email: {request.requester.email || "Chưa cập nhật"}</div>
                <div>SĐT: {request.requester.phone || "Chưa cập nhật"}</div>
                {request.requester.zalo && <div>Zalo: {request.requester.zalo}</div>}
              </div>
            )}

            {/* Meeting Confirmation */}
            {isAccepted && (
              <div style={{ padding: 12, background: "#f0f9ff", borderRadius: 6, marginBottom: 8, fontSize: 13, border: "1px solid #93c5fd" }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: "#1e40af" }}>✋ Xác nhận hẹn gặp:</div>
                <div style={{ display: "grid", gap: 6 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={request.owner_confirmed_meet || false}
                      onChange={() => onConfirmMeeting(request.id, true)}
                    />
                    <span style={{ color: request.owner_confirmed_meet ? "#166534" : "#374151", fontWeight: 500 }}>
                      {request.owner_confirmed_meet ? "✅ Tôi đã xác nhận" : "Tôi đã xác nhận hẹn gặp"}
                    </span>
                  </label>
                  <div style={{ paddingLeft: 28, color: request.receiver_confirmed_meet ? "#166534" : "#6b7280", fontSize: 12 }}>
                    {request.receiver_confirmed_meet ? "✅ Người nhận đã xác nhận" : "⏳ Chờ người nhận xác nhận"}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isPending && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => onAccept(request.id)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  ✓ Chấp nhận
                </button>
                <button
                  onClick={() => onReject(request.id)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  ✗ Từ chối
                </button>
              </div>
            )}

            {(isAccepted || isReadyToDeliver) && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {isReadyToDeliver && (
                  <button
                    onClick={() => onOpenScan(request.id)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      background: "#06b6d4",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    📱 Quét mã ✓
                  </button>
                )}
                <button
                  onClick={() => onOwnerCancel(request.id)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#f97316",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  ⛔ Hủy & chọn lại
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
