import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function DeliveryConfirmPageView({ scope }) {
  const {
    token,
    navigate,
    loading,
    setLoading,
    deposit,
    setDeposit,
    currentUser,
    setCurrentUser,
    error,
    setError,
    manualToken,
    setManualToken,
    confirming,
    setConfirming,
    handleConfirmDelivery,
    handleManualTokenSubmit,
  } = scope;

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "0 auto", paddingBottom: 80 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Quay lại</button>

      <div style={{ 
        padding: 16, 
        background: "#f0fdf4", 
        border: "1px solid #86efac", 
        borderRadius: 8,
        marginBottom: 20
      }}>
        <h2 style={{ margin: "0 0 16px 0", color: "#166534" }}>✅ Xác nhận giao mèo</h2>

        {/* Thông tin mèo */}
        <div style={{ marginBottom: 16, padding: 12, background: "#fff", borderRadius: 6 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: "#1e293b" }}>
            🐱 {deposit.pets?.name || "Mèo"}
          </div>
          {deposit.pets?.image_url && (
            <img 
              src={deposit.pets.image_url} 
              alt={deposit.pets.name}
              style={{ width: "100%", maxWidth: 300, borderRadius: 6, marginBottom: 12 }}
            />
          )}
        </div>

        {/* Thông tin người nhận */}
        <div style={{ marginBottom: 16, padding: 12, background: "#eff6ff", border: "1px solid #bae6fd", borderRadius: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0369a1", marginBottom: 8 }}>👤 Người nhận:</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
            {deposit.receiver?.full_name || deposit.receiver?.email || "N/A"}
          </div>
          {deposit.receiver?.phone && (
            <div style={{ fontSize: 13, color: "#334155", marginTop: 4 }}>
              📱 {deposit.receiver.phone}
            </div>
          )}
          {deposit.receiver?.email && (
            <div style={{ fontSize: 13, color: "#334155", marginTop: 2 }}>
              ✉️ {deposit.receiver.email}
            </div>
          )}
        </div>

        {/* Thông tin cọc */}
        <div style={{ marginBottom: 16, padding: 12, background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#b45309", marginBottom: 8 }}>💰 Số tiền cọc:</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
            {(deposit.amount || 0).toLocaleString()} đ
          </div>
        </div>

        {/* Nhập mã thủ công */}
        <div style={{ marginBottom: 16, padding: 12, background: "#f5f3ff", border: "1px solid #ddd6fe", borderRadius: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#5b21b6", marginBottom: 8 }}>🔐 Nhập mã xác nhận:</div>
          <input
            type="text"
            placeholder="Nhập mã từ máy người nhận..."
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value.toUpperCase())}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "monospace",
              border: "2px solid #ddd6fe",
              borderRadius: 6,
              marginBottom: 8,
              boxSizing: "border-box"
            }}
          />
          <div style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
            Mã dự phòng: <strong>{token}</strong>
          </div>
          <button
            onClick={handleManualTokenSubmit}
            disabled={confirming}
            style={{
              width: "100%",
              padding: 12,
              background: "#5b21b6",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: confirming ? "not-allowed" : "pointer",
              opacity: confirming ? 0.7 : 1
            }}
          >
            {confirming ? "Đang xác nhận..." : "✅ Xác nhận giao mèo"}
          </button>
        </div>

        {/* Hướng dẫn */}
        <div style={{ 
          padding: 12, 
          background: "#f0f9ff", 
          border: "1px solid #7dd3fc", 
          borderRadius: 6,
          fontSize: 12,
          color: "#0369a1"
        }}>
          <strong>📋 Hướng dẫn:</strong>
          <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
            <li>Yêu cầu người nhận mở mã QR trên điện thoại của họ</li>
            <li>Nhập mã từ màn hình của người nhận vào ô trên</li>
            <li>Hoặc có thể nhập tay mã dự phòng nếu quét QR lỗi</li>
            <li>Bấm "✅ Xác nhận giao mèo" để hoàn tất</li>
          </ul>
        </div>
      </div>

      {/* Nút cancel */}
      <button 
        onClick={() => navigate(`/pet/${deposit.pet_id}`)}
        style={{
          width: "100%",
          padding: 12,
          background: "#f3f4f6",
          color: "#374151",
          border: "1px solid #d1d5db",
          borderRadius: 6,
          fontWeight: 600,
          cursor: "pointer"
        }}
      >
        ← Hủy
      </button>
    </div>
  );
}
