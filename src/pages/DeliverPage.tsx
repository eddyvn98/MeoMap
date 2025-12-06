import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function DeliverPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Đang kiểm tra token...");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const { data: deposit, error } = await supabase
        .from("deposits")
        .select("*")
        .eq("delivery_token", token)
        .single();

      if (!deposit) {
        setMsg("Token không hợp lệ hoặc đã hết hạn.");
        return;
      }

      if (deposit.status !== "confirmed") {
        setMsg("Tiền cọc chưa được xác nhận. Không thể giao mèo.");
        return;
      }

      if (deposit.delivery_status === "delivered") {
        setMsg("Mèo này đã được giao trước đó.");
        return;
      }

      if (deposit.delivery_status === "cancelled_no_trade") {
        setMsg("Giao dịch đã bị hủy (không trao mèo). Tiền đã hoàn về ví.");
        return;
      }

      // user phải login để xác thực
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setMsg("Bạn cần đăng nhập để xác nhận giao mèo.");
        return;
      }

      // chỉ người nhận mới được confirm
      if (authData.user.id !== deposit.receiver_id) {
        setMsg("Bạn không phải người nhận của cọc này.");
        return;
      }

      // update DB đánh dấu đã giao
      await supabase
        .from("deposits")
        .update({
          delivery_status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", deposit.id);

      await supabase
        .from("pets")
        .update({ status: "delivered" })
        .eq("id", deposit.pet_id);

      setMsg("Xác nhận giao mèo thành công!");
      setSuccess(true);

      // Sau 2 giây chuyển sang trang đánh giá uy tín
      setTimeout(() => {
        navigate("/adoptions");
      }, 2000);
    };

    verify();
  }, [token, navigate]);

  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      <h2>{msg}</h2>
      {success && (
        <p style={{ marginTop: 16, color: "green" }}>
          Đang chuyển đến trang đánh giá uy tín...
        </p>
      )}
    </div>
  );
}
