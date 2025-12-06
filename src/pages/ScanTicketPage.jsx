// src/pages/ScanTicketPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QrReader } from "react-qr-reader";
import { supabase } from "../supabaseClient";

async function confirmAdoptionFromQrPayload(qrText) {
  // 1. parse QR
  let parsed;
  try {
    parsed = JSON.parse(qrText);
  } catch {
    throw new Error("Mã QR không hợp lệ.");
  }

  const { ticketId, token } = parsed || {};
  if (!ticketId || !token) {
    throw new Error("Thiếu dữ liệu trong mã QR.");
  }

  // 2. lấy user hiện tại (người đăng)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Bạn cần đăng nhập để quét mã.");
  }

  const ownerId = user.id;

  // 3. lấy ticket
  const { data: ticket, error: ticketError } = await supabase
    .from("adoption_tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("token", token)
    .single();

  if (ticketError || !ticket) {
    console.error(ticketError);
    throw new Error("Không tìm thấy ticket hoặc token sai.");
  }

  if (ticket.owner_id !== ownerId) {
    throw new Error("Ticket này không thuộc về tài khoản của bạn.");
  }

  if (ticket.status !== "active") {
    throw new Error("Ticket đã dùng hoặc không còn hiệu lực.");
  }

  const now = new Date();
  const expireAt = new Date(ticket.expire_at);
  if (now > expireAt) {
    throw new Error("Ticket đã hết hạn.");
  }

  // 4. kiểm tra người nhận có adoption active nào chưa
  const { data: activeAdoptions, error: activeErr } = await supabase
    .from("adoptions")
    .select("id")
    .eq("seeker_id", ticket.seeker_id)
    .eq("status", "active");

  if (activeErr) {
    console.error(activeErr);
    throw new Error("Không kiểm tra được trạng thái nhận mèo.");
  }

  if (activeAdoptions && activeAdoptions.length > 0) {
    throw new Error("Người nhận đang có 1 bé active trong hệ thống.");
  }

  // 5. lấy deposit để biết pet_id
  const { data: deposit, error: depErr } = await supabase
    .from("deposits")
    .select("*")
    .eq("id", ticket.deposit_id)
    .single();

  if (depErr || !deposit) {
    console.error(depErr);
    throw new Error("Không tìm thấy thông tin cọc.");
  }

  // 6. tạo adoption
  const { data: adoption, error: adoptionErr } = await supabase
    .from("adoptions")
    .insert({
      pet_id: deposit.pet_id,
      deposit_id: deposit.id,
      owner_id: deposit.owner_id,
      seeker_id: deposit.seeker_id,
      status: "active",
    })
    .select("*")
    .single();

  if (adoptionErr || !adoption) {
    console.error(adoptionErr);
    throw new Error("Không tạo được bản ghi nhận mèo.");
  }

  // 7. cập nhật ticket + deposit
  const { error: updateTicketErr } = await supabase
    .from("adoption_tickets")
    .update({ status: "used" })
    .eq("id", ticket.id);

  if (updateTicketErr) {
    console.error(updateTicketErr);
    throw new Error("Không cập nhật trạng thái ticket.");
  }

  const { error: updateDepErr } = await supabase
    .from("deposits")
    .update({ status: "confirmed" })
    .eq("id", deposit.id);

  if (updateDepErr) {
    console.error(updateDepErr);
    throw new Error("Không cập nhật trạng thái cọc.");
  }

  return adoption;
}

export default function ScanTicketPage() {
  const [hasCamera, setHasCamera] = useState(true);
  const [scannedText, setScannedText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [scanning, setScanning] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // kiểm tra user login sơ sơ
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setMessage("Bạn cần đăng nhập bằng tài khoản người đăng.");
      }
    };
    checkUser();
  }, []);

  const handleScan = async (result) => {
    if (!result || processing) return;

    const text = result?.text || result;
    setScannedText(text);
    setProcessing(true);
    setMessage("Đang xác nhận...");

    try {
      const adoption = await confirmAdoptionFromQrPayload(text);
      setMessage("Xác nhận giao mèo thành công.");
      console.log("Adoption created:", adoption);
      
      // TẮT CAMERA sau khi thành công
      setScanning(false);
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Có lỗi khi xác nhận.");
      setProcessing(false); // cho phép quét lại
    }
  };

  const handleError = (err) => {
    console.error(err);
    setHasCamera(false);
    setMessage("Không truy cập được camera.");
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Quét mã QR để xác nhận đã giao mèo</h2>

      {hasCamera && scanning ? (
    <div
        style={{
        maxWidth: 400,
        width: "100%",
        border: "1px solid #ccc",
        borderRadius: 8,
        overflow: "hidden",
        minHeight: 260,
        }}
    >
        <QrReader
        onResult={(result, error) => {
            if (!!result) {
            handleScan(result);
            }
        }}
        constraints={{ facingMode: "environment" }}
        videoStyle={{ width: "100%", height: "100%", objectFit: "cover" }}
        containerStyle={{ width: "100%", height: "100%" }}
        />
    </div>
    ) : (
    <p>Camera đang tắt.</p>
    )}


      {scannedText && (
        <p style={{ marginTop: 8, fontSize: 12 }}>
          Đã đọc: <code>{scannedText}</code>
        </p>
      )}

      {message && (
        <p style={{ marginTop: 8, color: message.includes("thành công") ? "green" : "red" }}>
          {message}
        </p>
      )}

      {!scanning && (
        <button
          onClick={() => {
            setScanning(true);
            setProcessing(false);
            setMessage("");
            setScannedText("");
          }}
          style={{ marginTop: 8, marginRight: 8, padding: 8, background: "#ff7f32", color: "#fff", border: "none", borderRadius: 6 }}
        >
          Quét lại
        </button>
      )}

      <button onClick={() => navigate("/")} style={{ marginTop: 8, padding: 8 }}>Về trang chủ</button>
    </div>
  );
}
