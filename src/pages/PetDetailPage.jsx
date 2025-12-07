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

  // state cho uy tín người nhận
  const [receiverReputation, setReceiverReputation] = useState(null);

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
          const max = depRows.reduce(
            (m, d) => (d.amount > m ? d.amount : m),
            0
          );
          setMaxDeposit(max);
        } else {
          setMaxDeposit(null);
        }

        // gợi ý số tiền cọc ban đầu
        const base = data.deposit_amount || 50000;
        const suggested =
          depRows && depRows.length > 0
            ? depRows.reduce((m, d) => (d.amount > m ? d.amount : m), 0) + 10000
            : base;

        setDepositAmount(suggested);

        // Load deposit hiện tại của user (nếu đã đặt cọc)
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: existingDeposit } = await supabase
            .from("deposits")
            .select("*")
            .eq("pet_id", petId)
            .eq("receiver_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingDeposit) {
            setCurrentDeposit(existingDeposit);

            // Load uy tín người nhận (chính user hiện tại)
            const { data: rep } = await supabase
              .from("user_reputation")
              .select("*")
              .eq("user_id", existingDeposit.receiver_id)
              .maybeSingle();

            setReceiverReputation(rep || null);
          }
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

      // số tiền cọc: lấy từ input (nếu có) hoặc fallback
      const base = pet.deposit_amount || 50000;
      const amount = Number(depositAmount) || base;

      if (!amount || amount <= 0) {
        throw new Error("Số tiền cọc không hợp lệ.");
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

      // Load uy tín người nhận (receiver_id từ deposit mới)
      if (freshDeposit && freshDeposit.receiver_id) {
        const { data: rep } = await supabase
          .from("user_reputation")
          .select("*")
          .eq("user_id", freshDeposit.receiver_id)
          .maybeSingle();

        setReceiverReputation(rep || null);
      }
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
    <div className="px-4 pb-24 max-w-2xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="text-blue-600 text-sm mb-4 flex items-center gap-1 hover:underline"
      >
        ← Quay lại
      </button>

      {/* Pet info card */}
      <div className="bg-white shadow-md rounded-xl p-5 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900">{pet.name}</h2>

        <div className="mt-2 space-y-1 text-gray-700 text-sm">
          <p>
            <span className="font-semibold">Trạng thái:</span> {pet.status}
          </p>
          <p>
            <span className="font-semibold">Khu vực:</span> {pet.district}
          </p>
          <p>
            <span className="font-semibold">Thời gian:</span> {pet.timeAgo}
          </p>
        </div>

        {(pet.image_url || pet.imageUrl) && (
          <img
            src={pet.image_url || pet.imageUrl}
            alt={pet.name}
            className="w-full max-h-[320px] object-cover rounded-xl mt-4"
          />
        )}

        <p className="mt-4 text-gray-800 leading-relaxed">{pet.description}</p>
      </div>

      {/* Deposit Section */}
      <div className="mt-6 bg-white shadow-md rounded-xl p-5 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Đặt cọc giữ mèo
        </h3>

        {/* max deposit info */}
        <div className="text-sm text-gray-700 mb-3">
          {maxDeposit != null ? (
            <>
              <div>
                Cọc cao nhất hiện tại:{" "}
                <strong>{maxDeposit.toLocaleString()} đ</strong>
              </div>
              <div>
                Cọc tối thiểu tiếp theo:{" "}
                <strong>{(maxDeposit + 10000).toLocaleString()} đ</strong>
              </div>
            </>
          ) : (
            <div>
              Chưa có ai cọc. Gợi ý cọc tối thiểu:{" "}
              <strong>
                {(pet.deposit_amount || 50000).toLocaleString()} đ
              </strong>
            </div>
          )}
        </div>

        {/* deposit input */}
        <label className="block mb-4">
          <span className="text-sm font-medium text-gray-800">
            Số tiền bạn muốn cọc
          </span>
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
            className="mt-1 w-full border rounded-lg p-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </label>

        <button
          onClick={handleDepositClick}
          disabled={loadingDeposit}
          className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loadingDeposit ? "Đang xử lý..." : "Đặt cọc & hiện mã QR"}
        </button>

        {depositError && (
          <p className="text-red-600 text-sm mt-3">{depositError}</p>
        )}
      </div>

      {/* QR chuyển khoản */}
      {currentDeposit && (
        <div className="mt-6 bg-blue-50 border border-blue-300 rounded-xl p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-blue-800">
            Mã chuyển khoản cọc
          </h3>

          <p className="mt-3 text-sm font-medium text-gray-800">
            Nội dung chuyển khoản:
          </p>

          <p className="mt-1 font-mono font-bold text-lg tracking-wide text-gray-900 bg-white border rounded-lg inline-block px-3 py-2">
            MEOMAP {getShortNumericCode(pet.id)}
          </p>

          <p className="text-sm text-gray-700 mt-3">
            <strong>Số tiền:</strong> {currentDeposit.amount.toLocaleString()} đ
          </p>

          <p className="text-xs text-gray-500 mt-3">
            Hãy chuyển khoản đúng nội dung và số tiền rồi upload ảnh chứng minh
            ở trang danh sách cọc.
          </p>

          {/* Uy tín người nhận */}
          {currentDeposit.receiver_id && (
            <div className="mt-4 bg-blue-100 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 text-sm mb-1">
                Người đang nhận mèo
              </h4>
              <p className="text-xs text-gray-700">
                ID: {currentDeposit.receiver_id}
              </p>

              {receiverReputation ? (
                <p className="text-xs text-gray-800 mt-1">
                  Uy tín: <strong>{receiverReputation.total_trades}</strong> lần
                  nhận • OK: <strong>{receiverReputation.ok_trades}</strong> •{" "}
                  Không OK: <strong>{receiverReputation.bad_trades}</strong>
                </p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">
                  Chưa có lịch sử uy tín.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* QR nhận mèo */}
      {currentDeposit &&
        currentDeposit.status === "confirmed" &&
        currentDeposit.delivery_token && (
          <div className="mt-6 bg-green-50 border border-green-300 rounded-xl p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-green-800">
              Mã QR xác nhận đã nhận mèo
            </h3>

            <div className="bg-white p-3 rounded-lg inline-block mt-3">
              <QRCodeCanvas
                value={`https://map-meo.web.app/deliver/${currentDeposit.delivery_token}`}
                size={180}
              />
            </div>

            <p className="mt-3 text-sm text-gray-900">
              Mã dự phòng: <strong>{currentDeposit.delivery_token}</strong>
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Khi gặp người đăng, mở màn hình này để họ quét mã.
            </p>
          </div>
        )}
    </div>
  );
}
