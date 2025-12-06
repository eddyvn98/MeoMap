import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { QRCodeCanvas } from "qrcode.react";
import { createDepositAndTicket } from "../deposit";

// Tính mã số 6 chữ số từ pet_id
function getShortNumericCode(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0; // 32-bit int
  }
  const num = Math.abs(hash) % 1000000; // 0..999999
  return num.toString().padStart(6, "0"); // luôn 6 số
}

export default function PetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);

  // state cho cọc + QR
  const [currentDeposit, setCurrentDeposit] = useState(null);
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [maxDeposit, setMaxDeposit] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");

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
        // lấy cọc cao nhất hiện tại của mèo này
        const petId = data.id;
        const { data: depRows, error: depErr } = await supabase
          .from("deposits")
          .select("amount, status")
          .eq("pet_id", petId)
          .eq("status", "locked");

        if (depErr) {
          console.error("Load deposits error:", depErr);
        } else if (depRows && depRows.length > 0) {
          const max = depRows.reduce((m, d) => (d.amount > m ? d.amount : m), 0);
          setMaxDeposit(max);
        } else {
          setMaxDeposit(null);
        }

        // gợi ý số tiền cọc ban đầu
        const base = data.deposit_amount || 50000;
        const suggested =
          depRows && depRows.length > 0
            ? (depRows.reduce((m, d) => (d.amount > m ? d.amount : m), 0) +
                10000)
            : base;

        setDepositAmount(suggested);
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

      // số tiền cọc: lấy từ input (nếu có) hoặc fallback
      const base = pet.deposit_amount || 50000;
      const amount = Number(depositAmount) || base;

      if (!amount || amount <= 0) {
        throw new Error('Số tiền cọc không hợp lệ.');
      }

      const { deposit } = await createDepositAndTicket({
        petId,
        ownerId,
        amount,
      });

      // Load lại deposit từ DB để update state
      const { data: freshDeposit } = await supabase
        .from("deposits")
        .select("*")
        .eq("id", deposit.id)
        .single();

      setCurrentDeposit(freshDeposit);
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

      {/* Cọc + nút */}
      <div style={{ marginTop: 20 }}>
        {/* thông tin mức cọc hiện tại */}
        <div style={{ marginBottom: 8, fontSize: 14 }}>
          {maxDeposit != null ? (
            <>
              <div>
                Cọc cao nhất hiện tại: {" "}
                <strong>{maxDeposit.toLocaleString()} đ</strong>
              </div>
              <div>
                Cọc tối thiểu tiếp theo: {" "}
                <strong>{(maxDeposit + 10000).toLocaleString()} đ</strong>
              </div>
            </>
          ) : (
            <div>
              Chưa có ai cọc. Cọc tối thiểu gợi ý: {" "}
              <strong>
                {(pet.deposit_amount || 50000).toLocaleString()} {" "}
                đ
              </strong>
            </div>
          )}
        </div>

        {/* ô nhập số tiền cọc */}
        <div style={{ marginBottom: 8 }}>
          <label>
            Số tiền bạn muốn cọc (bước 10.000đ): {" "}
            <input
              type="number"
              step={10000}
              min={
                maxDeposit != null
                  ? maxDeposit + 10000
                  : pet.deposit_amount || 50000
              }
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              style={{ width: 160, marginLeft: 4 }}
            />
          </label>
        </div>

        <button onClick={handleDepositClick} disabled={loadingDeposit}>
          {loadingDeposit ? "Đang xử lý..." : "Đặt cọc & hiện mã QR"}
        </button>

        {depositError && (
          <p style={{ color: "red", marginTop: 8 }}>{depositError}</p>
        )}
      </div>

      {/* Hiển thị QR + token nếu đã có deposit */}
      
      {/* BLOCK 1: QR CHUYỂN TIỀN (hiện ngay sau đặt cọc) */}
      {currentDeposit && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #3b82f6",
            borderRadius: 8,
            maxWidth: 400,
            background: "#eff6ff",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#1e40af" }}>Mã chuyển khoản cọc</h3>
          <p>
            <strong>Nội dung chuyển khoản:</strong>
          </p>
          <p
            style={{
              fontSize: 14,
              color: "#000",
              fontFamily: "monospace",
              fontWeight: "bold",
              margin: "8px 0",
            }}
          >
            MEOMAP {getShortNumericCode(pet.id)}
          </p>
          <p style={{ fontSize: 12, color: "#555", margin: "8px 0" }}>
            <strong>Số tiền:</strong> {currentDeposit.amount.toLocaleString()} đ
          </p>
          <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
            Hãy chuyển khoản theo thông tin trên, sau đó upload bằng chứng chuyển tiền trên trang danh sách cọc.
          </p>
        </div>
      )}

      {/* BLOCK 2: QR NHẬN MÈO (chỉ hiện khi confirmed + có delivery_token) */}
      {currentDeposit &&
        currentDeposit.status === "confirmed" &&
        currentDeposit.delivery_token && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              border: "1px solid #10b981",
              borderRadius: 8,
              maxWidth: 400,
              background: "#f0fdf4",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#065f46" }}>Mã QR xác nhận đã nhận mèo</h3>
            <div style={{ background: "#fff", padding: 8, borderRadius: 6, display: "inline-block" }}>
              <QRCodeCanvas
                value={`https://map-meo.web.app/deliver/${currentDeposit.delivery_token}`}
                size={200}
              />
            </div>
            <p style={{ marginTop: 8, fontSize: 12, color: "#000" }}>
              Mã dự phòng (nhập tay nếu quét lỗi):{" "}
              <strong>{currentDeposit.delivery_token}</strong>
            </p>
            <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
              Khi gặp người đăng, hãy mở màn hình này để họ quét mã để xác nhận đã nhận mèo.
            </p>
          </div>
        )}
    </div>
  );
}
