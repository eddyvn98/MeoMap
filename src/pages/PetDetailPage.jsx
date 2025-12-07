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

// Hàm tính số tiền cọc dựa trên uy tín
function calculateDepositAmount(userInput, rep) {
  const bad = rep?.bad_trades ?? 0;

  // CASE C: Blacklist - Bị hạ uy tín >= 3 lần
  if (bad >= 3) {
    return {
      blocked: true,
      amount: null,
      reason: "Tài khoản đã bị hạ uy tín 3 lần. Không thể đặt cọc."
    };
  }

  // CASE B: 1-2 lần xấu → tăng 50%
  if (bad >= 1) {
    let boosted = userInput * 1.5;
    boosted = Math.ceil(boosted / 10000) * 10000; // làm tròn 10k
    return {
      blocked: false,
      amount: boosted,
      reason: `Bạn đã bị đánh giá không tốt ${bad} lần, số tiền cọc sẽ tăng 50% và làm tròn.`
    };
  }

  // CASE A: bình thường → giữ nguyên
  return {
    blocked: false,
    amount: userInput,
    reason: null
  };
}

// Hàm chia tiền ví + chuyển khoản
function splitWalletAndCash(requiredAmount, walletCredit) {
  if (walletCredit <= 0) {
    return {
      walletUsed: 0,
      cashAmount: requiredAmount,
    };
  }

  if (walletCredit >= requiredAmount) {
    // đủ ví, không cần chuyển khoản
    return {
      walletUsed: requiredAmount,
      cashAmount: 0,
    };
  }

  // không đủ, dùng hết ví, phần còn lại chuyển khoản
  return {
    walletUsed: walletCredit,
    cashAmount: requiredAmount - walletCredit,
  };
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
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserReputation, setCurrentUserReputation] = useState(null);
  const [depositCalculation, setDepositCalculation] = useState(null);
  
  // state cho ví
  const [walletCredit, setWalletCredit] = useState(0);
  const [splitPreview, setSplitPreview] = useState(null);

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

        // gợi ý số tiền cọc ban đầu (không còn bắt buộc tối thiểu)
        const base = data.deposit_amount || 50000;
        const suggested =
          depRows && depRows.length > 0
            ? (depRows.reduce((m, d) => (d.amount > m ? d.amount : m), 0) +
                10000)
            : base;

        setDepositAmount(suggested);

        // Load current user và uy tín của user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);

          // Load uy tín của user hiện tại
          const { data: userRep } = await supabase
            .from("user_reputation")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          setCurrentUserReputation(userRep || null);
          
          // Load wallet credit
          const { data: profile } = await supabase
            .from("profiles")
            .select("wallet_credit")
            .eq("id", user.id)
            .single();
          
          setWalletCredit(profile?.wallet_credit || 0);

          // Load deposit hiện tại của user (nếu đã đặt cọc)
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

  // Tính toán số tiền cọc dựa trên uy tín khi depositAmount thay đổi
  useEffect(() => {
    if (depositAmount && currentUserReputation !== null) {
      const userInput = Number(depositAmount);
      if (userInput > 0) {
        const result = calculateDepositAmount(userInput, currentUserReputation);
        setDepositCalculation(result);
        
        // Tính split ví + tiền mặt nếu không bị block
        if (!result.blocked && result.amount) {
          const split = splitWalletAndCash(result.amount, walletCredit);
          setSplitPreview(split);
        } else {
          setSplitPreview(null);
        }
      } else {
        setDepositCalculation(null);
        setSplitPreview(null);
      }
    } else {
      setDepositCalculation(null);
      setSplitPreview(null);
    }
  }, [depositAmount, currentUserReputation, walletCredit]);

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

      // Kiểm tra user input
      const userInput = Number(depositAmount);
      if (!userInput || userInput <= 0) {
        throw new Error('Số tiền cọc không hợp lệ.');
      }

      // Tính toán tiền cọc dựa trên uy tín
      const calculation = calculateDepositAmount(userInput, currentUserReputation);

      // Kiểm tra blacklist
      if (calculation.blocked) {
        throw new Error(calculation.reason);
      }

      const finalAmount = calculation.amount;
      
      // Tính split ví + tiền mặt
      const split = splitWalletAndCash(finalAmount, walletCredit);
      const walletUsed = split.walletUsed;
      const cashAmount = split.cashAmount;
      
      // Xác định status ban đầu
      let initialStatus = "pending";
      let paymentStatus = "pending";
      let paymentProvider = "manual";
      
      if (cashAmount === 0) {
        // Dùng toàn bộ ví -> confirmed luôn
        initialStatus = "confirmed";
        paymentStatus = "success";
        paymentProvider = "wallet";
      }

      // Tạo deposit với wallet_used và cash_amount
      const { deposit } = await createDepositAndTicket({
        petId,
        ownerId,
        amount: finalAmount,
        walletUsed,
        cashAmount,
        initialStatus,
        paymentStatus,
        paymentProvider,
      });
      
      // Nếu có dùng ví -> trừ ví
      if (walletUsed > 0) {
        const { error: walletErr } = await supabase.rpc("decrease_wallet_credit", {
          p_user_id: currentUser.id,
          p_amount: walletUsed,
          p_deposit_id: deposit.id,
          p_type: "use_for_deposit",
          p_note: "Dùng ví để đặt cọc nhận mèo.",
        });

        if (walletErr) {
          console.error("Lỗi decrease_wallet_credit", walletErr);
          throw new Error("Có lỗi khi trừ tiền trong ví. Vui lòng liên hệ admin.");
        }
        
        // Cập nhật wallet credit local
        setWalletCredit(walletCredit - walletUsed);
      }

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
              <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                (Gợi ý: {(maxDeposit + 10000).toLocaleString()} đ)
              </div>
            </>
          ) : (
            <div>
              Chưa có ai cọc. {" "}
              <span style={{ color: "#6b7280", fontSize: 12 }}>
                (Gợi ý: {(pet.deposit_amount || 50000).toLocaleString()} đ)
              </span>
            </div>
          )}
        </div>

        {/* ô nhập số tiền cọc */}
        <div style={{ marginBottom: 8 }}>
          <label>
            Số tiền bạn muốn cọc: {" "}
            <input
              type="number"
              step={10000}
              min={10000}
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              style={{ width: 160, marginLeft: 4, padding: "4px 8px" }}
            />
            {" "} đ
          </label>
        </div>

        {/* Hiển thị số dư ví */}
        {currentUser && (
          <div 
            style={{ 
              marginBottom: 12, 
              padding: 10, 
              background: "#f0fdf4", 
              border: "1px solid #86efac",
              borderRadius: 6,
              fontSize: 13,
              color: "#166534"
            }}
          >
            💰 Số dư ví hiện tại: <strong>{walletCredit.toLocaleString()} đ</strong>
          </div>
        )}

        {/* Hiển thị cảnh báo/thông báo về tính toán tiền cọc */}
        {depositCalculation && depositCalculation.reason && (
          <div 
            style={{ 
              marginBottom: 12, 
              padding: 10, 
              background: "#fef2f2", 
              border: "1px solid #fca5a5",
              borderRadius: 6,
              fontSize: 13,
              color: "#991b1b"
            }}
          >
            ⚠️ {depositCalculation.reason}
            <div style={{ marginTop: 6, fontWeight: "bold" }}>
              Số tiền cọc thực tế: {depositCalculation.amount.toLocaleString()} đ
            </div>
          </div>
        )}
        
        {/* Hiển thị preview chia ví + chuyển khoản */}
        {splitPreview && depositCalculation && !depositCalculation.blocked && (
          <div 
            style={{ 
              marginBottom: 12, 
              padding: 10, 
              background: "#eff6ff", 
              border: "1px solid #93c5fd",
              borderRadius: 6,
              fontSize: 13,
              color: "#1e40af"
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 6 }}>📊 Phân bổ thanh toán:</div>
            {splitPreview.walletUsed > 0 && (
              <div style={{ marginTop: 4 }}>
                • Dùng từ ví: <strong>{splitPreview.walletUsed.toLocaleString()} đ</strong>
              </div>
            )}
            {splitPreview.cashAmount > 0 && (
              <div style={{ marginTop: 4 }}>
                • Cần chuyển khoản thêm: <strong>{splitPreview.cashAmount.toLocaleString()} đ</strong>
              </div>
            )}
            {splitPreview.cashAmount === 0 && (
              <div style={{ marginTop: 4, color: "#059669" }}>
                ✅ Dùng toàn bộ ví, không cần chuyển khoản!
              </div>
            )}
          </div>
        )}

        {depositCalculation && depositCalculation.blocked && (
          <div 
            style={{ 
              marginBottom: 12, 
              padding: 10, 
              background: "#fee2e2", 
              border: "1px solid #dc2626",
              borderRadius: 6,
              fontSize: 13,
              color: "#7f1d1d",
              fontWeight: "bold"
            }}
          >
            🚫 {depositCalculation.reason}
          </div>
        )}

        <button 
          onClick={handleDepositClick} 
          disabled={loadingDeposit || (depositCalculation && depositCalculation.blocked)}
          style={{
            opacity: (loadingDeposit || (depositCalculation && depositCalculation.blocked)) ? 0.5 : 1,
            cursor: (loadingDeposit || (depositCalculation && depositCalculation.blocked)) ? "not-allowed" : "pointer"
          }}
        >
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

          {/* Hiển thị uy tín người nhận */}
          {currentDeposit.receiver_id && (
            <div style={{ marginTop: 12, padding: 8, background: "#dbeafe", borderRadius: 6 }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#1e40af" }}>Người đang nhận mèo</h4>
              <div style={{ fontSize: 12, color: "#1e293b" }}>ID: {currentDeposit.receiver_id}</div>

              {receiverReputation ? (
                <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
                  Uy tín: <strong>{receiverReputation.total_trades}</strong> lần nhận •{" "}
                  OK: <strong>{receiverReputation.ok_trades}</strong> •{" "}
                  Không OK: <strong>{receiverReputation.bad_trades}</strong>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Chưa có lịch sử uy tín.
                </div>
              )}
            </div>
          )}
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
