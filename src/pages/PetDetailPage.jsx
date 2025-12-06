import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { QRCodeCanvas } from "qrcode.react";
import { createDepositAndTicket } from "../deposit";

export default function PetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);

  // state cho cọc + QR
  const [ticket, setTicket] = useState(null);
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [depositError, setDepositError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("pets")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Load pet error:", error);
          setPet(null);
        } else {
          setPet(data || null);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // Hàm xử lý đặt cọc
  const handleDepositClick = async () => {
    if (!pet) return;

    setDepositError("");
    setLoadingDeposit(true);

    try {
      const petId = pet.id;

      // TÙY BẢNG CỦA BẠN:
      // nếu trong pets có cột owner_id (hoặc user_id) thì chỉnh cho đúng:
      const ownerId = pet.owner_id || pet.user_id;
      if (!ownerId) {
        throw new Error("Thiếu thông tin người đăng (owner_id) trong pet.");
      }

      // số tiền cọc: nếu chưa có cột riêng thì tạm fix 50k
      const amount = pet.deposit_amount || 50000;

      const { ticket } = await createDepositAndTicket({
        petId,
        ownerId,
        amount,
      });

      setTicket(ticket);
    } catch (err) {
      console.error(err);
      setDepositError(err.message || "Có lỗi khi đặt cọc.");
    } finally {
      setLoadingDeposit(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  if (!pet) {
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy thông tin mèo.
        <br />
        <button onClick={() => navigate("/")}>Về trang chủ</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, paddingBottom: 80 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 10 }}>
        ← Quay lại
      </button>

      <h2>{pet.name}</h2>
      <p>
        <strong>Trạng thái:</strong> {pet.status}
      </p>
      <p>
        <strong>Khu vực:</strong> {pet.district}
      </p>
      <p>
        <strong>Thời gian:</strong> {pet.timeAgo}
      </p>

      {(pet.image_url || pet.imageUrl) && (
        <img
          src={pet.image_url || pet.imageUrl}
          alt={pet.name}
          style={{
            width: "100%",
            maxWidth: 400,
            borderRadius: 16,
            margin: "10px 0",
          }}
        />
      )}

      <p>{pet.description}</p>

      {/* Nút đặt cọc */}
      <div style={{ marginTop: 20 }}>
        <button onClick={handleDepositClick} disabled={loadingDeposit}>
          {loadingDeposit ? "Đang xử lý..." : "Đặt cọc & hiện mã QR"}
        </button>

        {depositError && (
          <p style={{ color: "red", marginTop: 8 }}>{depositError}</p>
        )}
      </div>

      {/* Hiển thị QR + token nếu đã có ticket */}
      {ticket && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #ccc",
            borderRadius: 8,
            maxWidth: 300,
          }}
        >
          <p>
            <strong>Mã QR xác nhận nhận mèo</strong>
          </p>
          <QRCodeCanvas
            value={JSON.stringify({
              ticketId: ticket.id,
              token: ticket.token,
            })}
            size={200}
          />
          <p style={{ marginTop: 8 }}>
            Mã dự phòng (nhập tay nếu quét lỗi):{" "}
            <strong>{ticket.token}</strong>
          </p>
          <p style={{ fontSize: 12, color: "#666" }}>
            Khi gặp người đăng, hãy mở màn hình này để họ quét mã.
          </p>
        </div>
      )}
    </div>
  );
}
