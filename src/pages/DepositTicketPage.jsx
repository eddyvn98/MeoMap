import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../supabaseClient";

export default function DepositTicketPage() {
  const { id } = useParams(); // deposit id
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ticket, setTicket] = useState(null);
  const [deposit, setDeposit] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      // Try to load ticket by deposit_id
      const { data: ticketData, error: ticketError } = await supabase
        .from("adoption_tickets")
        .select("*")
        .eq("deposit_id", id)
        .maybeSingle();

      if (!ticketError && ticketData) {
        setTicket(ticketData);
      }

      // Load deposit for context (and fallback token if exists on deposit)
      const { data: depositData, error: depositError } = await supabase
        .from("deposits")
        .select("*, pets(name, image_url)")
        .eq("id", id)
        .maybeSingle();

      if (depositError) {
        setError("Không tải được thông tin cọc.");
        setLoading(false);
        return;
      }

      setDeposit(depositData || null);
      setLoading(false);
    };

    load();
  }, [id]);

  const qrValue = ticket?.token || deposit?.delivery_token;
  const petName = deposit?.pets?.name;

  if (loading) return <div className="p-4 text-sm">Đang tải…</div>;
  if (!deposit) return <div className="p-4 text-sm">Không tìm thấy cọc.</div>;

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4">
      <div className="text-sm text-gray-500 cursor-pointer" onClick={() => navigate(-1)}>
        ← Quay lại
      </div>
      <h1 className="text-lg font-bold">Mã QR giao mèo</h1>
      <div className="text-sm text-gray-600">Cọc #{id?.slice(0, 8)} • {petName || "Mèo"}</div>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">{error}</div>
      )}

      {qrValue ? (
        <div className="p-4 border rounded-lg bg-white shadow-sm flex flex-col items-center gap-3">
          <QRCodeCanvas value={`https://map-meo.web.app/deliver/${qrValue}`} size={220} />
          <div className="text-sm text-center">
            Mã dự phòng: <span className="font-mono font-semibold">{qrValue}</span>
          </div>
          <div className="text-xs text-gray-600 text-center">
            Khi gặp chủ mèo, mở màn hình này để họ quét mã hoặc nhập mã dự phòng.
          </div>
        </div>
      ) : (
        <div className="p-3 border rounded bg-yellow-50 text-xs text-yellow-800">
          Chưa có mã QR giao mèo. Hãy chờ admin/owner xác nhận.
        </div>
      )}
    </div>
  );
}
