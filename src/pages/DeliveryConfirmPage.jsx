import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function DeliveryConfirmPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [deposit, setDeposit] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("Bạn cần đăng nhập để xác nhận giao mèo.");
          setLoading(false);
          return;
        }
        setCurrentUser(user);

        // Load deposit theo delivery_token
        const { data: depositData, error: depositErr } = await supabase
          .from("deposits")
          .select(`
            *,
            pets:pet_id(id, name, owner_id, image_url),
            receiver:receiver_id(id, full_name, email, phone),
            owner:owner_id(id, full_name, email)
          `)
          .eq("delivery_token", token)
          .maybeSingle();

        if (depositErr || !depositData) {
          setError("Không tìm thấy mã giao mèo. Vui lòng kiểm tra lại.");
          setLoading(false);
          return;
        }

        // Verify owner của deposit (chỉ owner mới quét được)
        if (depositData.owner_id !== user.id) {
          setError("Bạn không phải là chủ bài này. Không thể xác nhận giao mèo.");
          setLoading(false);
          return;
        }

        // Check if already delivered
        if (depositData.delivery_status === "delivered") {
          setError("Mèo này đã được xác nhận giao rồi.");
          setLoading(false);
          return;
        }

        setDeposit(depositData);
      } catch (err) {
        console.error(err);
        setError("Có lỗi khi tải dữ liệu.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [token]);

  const handleConfirmDelivery = async () => {
    if (!deposit) return;
    if (!confirm("Bạn chắc chắn đã giao mèo cho người nhận?")) return;

    setConfirming(true);
    try {
      // 1. Update delivery_status
      const { error: updateErr } = await supabase
        .from("deposits")
        .update({
          delivery_status: "delivered",
          delivered_at: new Date().toISOString(),
          status: "confirmed" // Giữ confirmed
        })
        .eq("id", deposit.id);

      if (updateErr) throw updateErr;

      // 2. Update pet status
      await supabase
        .from("pets")
        .update({ status: "delivered" })
        .eq("id", deposit.pet_id);

      // 3. Create adoption record (nếu chưa có)
      const { data: existingAdoption } = await supabase
        .from("adoptions")
        .select("id")
        .eq("pet_id", deposit.pet_id)
        .eq("adopter_id", deposit.receiver_id)
        .maybeSingle();

      if (!existingAdoption) {
        await supabase
          .from("adoptions")
          .insert({
            pet_id: deposit.pet_id,
            adopter_id: deposit.receiver_id,
            owner_id: deposit.owner_id,
            status: "completed",
            delivery_status: "delivered"
          });
      }

      alert("✅ Đã xác nhận giao mèo thành công!");
      navigate(`/pet/${deposit.pet_id}`);
    } catch (err) {
      console.error(err);
      setError("Lỗi khi xác nhận giao mèo: " + err.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleManualTokenSubmit = async () => {
    if (!manualToken.trim()) {
      alert("Vui lòng nhập mã.");
      return;
    }

    if (manualToken.toUpperCase() !== token.toUpperCase()) {
      alert("❌ Mã không chính xác. Vui lòng kiểm tra lại.");
      return;
    }

    handleConfirmDelivery();
  };

  if (loading) {
    return <div style={{ padding: 20, textAlign: "center" }}>Đang tải...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 20, maxWidth: 400, margin: "0 auto" }}>
        <div style={{ 
          padding: 16, 
          background: "#fee2e2", 
          border: "1px solid #dc2626", 
          borderRadius: 8,
          color: "#7f1d1d",
          marginBottom: 16
        }}>
          ❌ {error}
        </div>
        <button onClick={() => navigate(-1)}>← Quay lại</button>
      </div>
    );
  }

  if (!deposit) {
    return (
      <div style={{ padding: 20, maxWidth: 400, margin: "0 auto" }}>
        <div style={{ 
          padding: 16, 
          background: "#fee2e2", 
          border: "1px solid #dc2626", 
          borderRadius: 8,
          color: "#7f1d1d"
        }}>
          Không tìm thấy thông tin giao mèo.
        </div>
        <button onClick={() => navigate(-1)} style={{ marginTop: 12 }}>← Quay lại</button>
      </div>
    );
  }

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
