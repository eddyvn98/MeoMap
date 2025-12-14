import React from "react";

/*
  ConfirmHandoverPanel
  - Shared panel for confirming handover using QR or manual confirm
  - Props:
    mode: "adopt" | "lost" | "rescue" (adjust labels)
    onShowQR: () => void
    onConfirm: () => void
    onCancelReward?: () => void // only for lost/rescue reporter decline
    contactA: { name, phone, message }
    contactB: { name, phone, message }
    statusLabel?: string
*/
export default function ConfirmHandoverPanel({
  mode = "lost",
  onShowQR,
  onConfirm,
  onCancelReward,
  contactA,
  contactB,
  statusLabel,
  isOwner = false,
  isCompleted = false,
}) {
  const roleA = mode === "adopt" ? "Người đăng" : "Người đăng (chủ mèo)";
  const roleB = mode === "adopt" ? "Người nhận" : "Người tìm thấy";

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Xác nhận giao/nhận</h3>
      {statusLabel && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>Trạng thái: {statusLabel}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div style={{ border: "1px solid #f3f4f6", borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{roleA}</div>
          <div style={{ fontWeight: 600 }}>{contactA?.name || "—"}</div>
          <div style={{ fontSize: 13 }}>{contactA?.phone || "—"}</div>
          {contactA?.message && <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>{contactA.message}</div>}
        </div>
        <div style={{ border: "1px solid #f3f4f6", borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{roleB}</div>
          <div style={{ fontWeight: 600 }}>{contactB?.name || "—"}</div>
          <div style={{ fontSize: 13 }}>{contactB?.phone || "—"}</div>
          {contactB?.message && <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>{contactB.message}</div>}
        </div>
      </div>

      {isCompleted ? (
        <div style={{ marginTop: 16, padding: 12, background: "#dcfce7", borderRadius: 8, textAlign: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#166534" }}>
            ✅ Đã hoàn thành giao nhận
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexDirection: "column" }}>
            {isOwner ? (
              <>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                  Chờ người tìm thấy xác nhận đã giao mèo, sau đó bạn xác nhận để chuyển tiền thưởng.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={onShowQR} style={btnPrimary}>Quét/Hiện mã QR</button>
                  <button 
                    onClick={onConfirm} 
                    style={{
                      ...btnSecondary, 
                      background: onConfirm ? "#10b981" : "#d1d5db",
                      color: "#fff",
                      cursor: onConfirm ? "pointer" : "not-allowed",
                      opacity: onConfirm ? 1 : 0.6
                    }}
                    disabled={!onConfirm}
                  >
                    ✓ Xác nhận nhận mèo & chuyển tiền
                  </button>
                </div>
                {!onConfirm && (
                  <div style={{ fontSize: 12, color: "#ef4444", marginTop: 4 }}>
                    ⚠️ Chờ người tìm thấy xác nhận đã giao mèo trước
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>
                  Sau khi giao mèo cho chủ, click "Xác nhận đã giao" để thông báo chủ xác nhận.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={onShowQR} style={btnPrimary}>Hiện QR cho chủ quét</button>
                  <button onClick={onConfirm} style={{...btnSecondary, background: "#10b981", color: "#fff"}}>
                    ✓ Xác nhận đã giao mèo
                  </button>
                  {onCancelReward && (
                    <button onClick={onCancelReward} style={btnDanger}>Hủy nhận thưởng</button>
                  )}
                </div>
                {onCancelReward && (
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Khi hủy nhận thưởng: tiền sẽ về ví người đăng và không rút được, chỉ quy đổi thành voucher mua hàng.
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const btnPrimary = {
  padding: "10px 14px",
  background: "#6366f1",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const btnSecondary = {
  padding: "10px 14px",
  background: "#e5e7eb",
  color: "#111827",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

const btnDanger = {
  padding: "10px 14px",
  background: "#ef4444",
  color: "white",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};
