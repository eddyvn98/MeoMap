import React, { useMemo } from "react";
import { QRCodeCanvas } from "qrcode.react";

/*
  QrConfirmModal
  - Generic modal to show QR for handover confirmation
  - Props:
    isOpen: boolean
    onClose: () => void
    payload: { petId: string|number, mode: 'lost'|'adopt'|'rescue', token?: string }
*/
export default function QrConfirmModal({ isOpen, onClose, payload }) {
  const qrValue = useMemo(() => {
    if (!payload) return "";
    const base = {
      type: "handover_confirm",
      mode: payload.mode || "lost",
      petId: payload.petId,
      ts: Date.now(),
    };
    // Prefer provided token if exists
    if (payload.token) base.token = payload.token;
    return JSON.stringify(base);
  }, [payload]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 120000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 460,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 16, background: "#111827", color: "white", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>📱 Mã QR xác nhận giao/nhận</h3>
          <button onClick={onClose} style={{ border: "none", background: "transparent", color: "white", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>

        <div style={{ padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {qrValue ? (
            <QRCodeCanvas value={qrValue} size={220} includeMargin={true} />
          ) : (
            <div style={{ padding: 40, color: "#6b7280" }}>Chưa có dữ liệu QR</div>
          )}
          {qrValue && (
            <div style={{ fontSize: 12, color: "#374151" }}>
              Mã dự phòng: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{qrValue}</span>
            </div>
          )}
          <div style={{ fontSize: 12, color: "#6b7280", textAlign: "center" }}>
            Khi gặp nhau, đưa mã QR này để bên kia quét. Có thể nhập tay mã dự phòng nếu quét lỗi.
          </div>
        </div>

        <div style={{ padding: 12, background: "#f9fafb", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "8px 14px", background: "#6366f1", color: "white", border: "none", borderRadius: 8, fontWeight: 600 }}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
