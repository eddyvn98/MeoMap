import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import DeliveryConfirmPageView from './views/DeliveryConfirmPageView';

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
            receiver:receiver_id(id, display_name, email, phone),
            owner:owner_id(id, display_name, email)
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
      // P1 FIX: Use atomic RPC instead of multiple queries
      // This prevents race condition when refunding deposit
      const { data: rpcResult, error: rpcErr } = await supabase
        .rpc('finish_delivery_with_refund', {
          p_deposit_id: deposit.id,
          p_user_id: currentUser.id
        });

      if (rpcErr) throw rpcErr;

      if (!rpcResult.success) {
        throw new Error(rpcResult.error || 'Lỗi không xác định khi hoàn cọc');
      }

      // 2. Update delivery_status + delivered_at
      const { error: updateErr } = await supabase
        .from("deposits")
        .update({
          delivery_status: "delivered",
          delivered_at: new Date().toISOString(),
          status: "refunded" // RPC đã set status, nhưng update lại để sure
        })
        .eq("id", deposit.id);

      if (updateErr) throw updateErr;

      // 3. Update pet status
      await supabase
        .from("pets")
        .update({ status: "delivered" })
        .eq("id", deposit.pet_id);

      // 4. Create adoption record (nếu chưa có)
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

      alert("✅ Đã xác nhận giao mèo thành công!\n💰 Cọc đã hoàn lại cho người nhận.");
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

  return <DeliveryConfirmPageView scope={{
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
  }} />;
}
