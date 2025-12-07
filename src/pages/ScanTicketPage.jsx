// src/pages/ScanTicketPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Scanner } from "@yudiel/react-qr-scanner";
import { supabase } from "../supabaseClient";

async function confirmAdoptionFromQrPayload(qrText) {
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

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Bạn cần đăng nhập để quét mã.");
  }

  const ownerId = user.id;

  const { data: ticket, error: ticketError } = await supabase
    .from("adoption_tickets")
    .select("*")
    .eq("id", ticketId)
    .eq("token", token)
    .single();

  if (ticketError || !ticket)
    throw new Error("Không tìm thấy ticket hoặc token sai.");

  if (ticket.owner_id !== ownerId) {
    throw new Error("Ticket này không thuộc về tài khoản của bạn.");
  }

  if (ticket.status !== "active") {
    throw new Error("Ticket đã dùng hoặc không còn hiệu lực.");
  }

  const now = new Date();
  const expireAt = new Date(ticket.expire_at);
  if (now > expireAt) throw new Error("Ticket đã hết hạn.");

  const { data: activeAdoptions } = await supabase
    .from("adoptions")
    .select("id")
    .eq("receiver_id", ticket.receiver_id)
    .eq("status", "active");

  if (activeAdoptions?.length > 0) {
    throw new Error("Người nhận đang có 1 bé active trong hệ thống.");
  }

  const { data: deposit, error: depErr } = await supabase
    .from("deposits")
    .select("*")
    .eq("id", ticket.deposit_id)
    .single();

  if (depErr || !deposit) throw new Error("Không tìm thấy thông tin cọc.");

  const { data: adoption, error: adoptionErr } = await supabase
    .from("adoptions")
    .insert({
      pet_id: deposit.pet_id,
      deposit_id: deposit.id,
      owner_id: deposit.owner_id,
      receiver_id: deposit.receiver_id,
      status: "active",
    })
    .select("*")
    .single();

  if (adoptionErr || !adoption)
    throw new Error("Không tạo được bản ghi nhận mèo.");

  const adoptedAt = adoption.adopted_at
    ? new Date(adoption.adopted_at)
    : new Date();
  const dayOffsets = [1, 7, 30];

  const checkins = dayOffsets.map((d) => {
    const due = new Date(adoptedAt);
    due.setDate(due.getDate() + d);
    return {
      adoption_id: adoption.id,
      day_offset: d,
      due_at: due.toISOString(),
      status: "pending",
    };
  });

  const { error: checkinErr } = await supabase
    .from("adoption_checkins")
    .insert(checkins);

  if (checkinErr)
    throw new Error("Không tạo được nhiệm vụ theo dõi sau nhận mèo.");

  const { error: updateTicketErr } = await supabase
    .from("adoption_tickets")
    .update({ status: "used" })
    .eq("id", ticket.id);

  if (updateTicketErr) throw new Error("Không cập nhật trạng thái ticket.");

  const { error: updateDepErr } = await supabase
    .from("deposits")
    .update({ status: "confirmed" })
    .eq("id", deposit.id);

  if (updateDepErr) throw new Error("Không cập nhật trạng thái cọc.");

  return adoption;
}

export default function ScanTicketPage() {
  const [scannedText, setScannedText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [scanning, setScanning] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
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

  const handleScan = async (resultText) => {
    if (!resultText || processing) return;

    setScannedText(resultText);
    setProcessing(true);
    setMessage("Đang xác nhận...");

    try {
      const adoption = await confirmAdoptionFromQrPayload(resultText);
      setMessage("Xác nhận giao mèo thành công.");
      console.log("Adoption created:", adoption);

      setScanning(false); // turn off camera
    } catch (err) {
      setMessage(err.message || "Có lỗi khi xác nhận.");
      setProcessing(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Quét mã QR để xác nhận đã giao mèo</h2>

      {scanning ? (
        <div
          style={{
            maxWidth: 400,
            width: "100%",
            border: "1px solid #ccc",
            borderRadius: 8,
            overflow: "hidden",
            background: "#000",
          }}
        >
          <Scanner
            onDecode={(text) => handleScan(text)}
            onError={(error) => setMessage("Không truy cập được camera.")}
            constraints={{ facingMode: "environment" }}
            video={{ width: "100%", height: "100%", objectFit: "cover" }}
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
        <p
          style={{
            marginTop: 8,
            color: message.includes("thành công") ? "green" : "red",
          }}
        >
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
          style={{
            marginTop: 8,
            marginRight: 8,
            padding: 8,
            background: "#ff7f32",
            color: "#fff",
            border: "none",
            borderRadius: 6,
          }}
        >
          Quét lại
        </button>
      )}

      <button
        onClick={() => navigate("/")}
        style={{ marginTop: 8, padding: 8 }}
      >
        Về trang chủ
      </button>
    </div>
  );
}
