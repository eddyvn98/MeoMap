import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import QRScanner from "../components/QRScanner";

export default function AdoptApplicantsPage() {
  const { petId } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      // Load pet info
      const { data: petData, error: petError } = await supabase
        .from("pets")
        .select("id, name, image_url, status, category")
        .eq("id", petId)
        .single();

      if (petError) {
        setError("Không tải được thông tin mèo.");
        setLoading(false);
        return;
      }
      setPet(petData);

      // Load deposits/applicants
      const { data: depData, error: depError } = await supabase
        .from("deposits")
        .select("*, profiles:profiles!deposits_receiver_id_fkey(id, display_name), pets(name, image_url)")
        .eq("pet_id", petId)
        .order("created_at", { ascending: false });

      if (depError) {
        setError("Không tải được danh sách người đăng ký.");
        setApplications([]);
      } else {
        setApplications(depData || []);
      }

      setLoading(false);
    };

    load();
  }, [petId]);

  const grouped = useMemo(() => {
    const pending = []; // Chờ giao (status = pending)
    const locked = []; // Đang trong 3 ngày review (status = locked)
    const history = []; // Đã hoàn tất

    applications.forEach((d) => {
      if (d.status === 'pending') pending.push(d);
      else if (d.status === 'locked') locked.push(d);
      else history.push(d);
    });

    return { pending, locked, history };
  }, [applications]);

  const handleCancel = async (id) => {
    setActionLoading(true);
    const { error: updateError } = await supabase
      .from("deposits")
      .update({ status: "cancelled" })
      .eq("id", id);

    if (updateError) {
      setError("Không hủy được giao dịch.");
    } else {
      setApplications((prev) => prev.map((d) => (d.id === id ? { ...d, status: "cancelled" } : d)));
    }
    setActionLoading(false);
  };

  // XÁC NHẬN GIAO MÈO - Quét QR hoặc chọn người
  const handleConfirmDelivery = async (receiverQrId) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('confirm_delivery_by_qr', {
        p_owner_id: (await supabase.auth.getUser()).data.user.id,
        p_receiver_qr_id: receiverQrId,
        p_pet_id: petId
      });

      if (error) throw error;
      const result = data[0];
      
      if (!result.success) {
        alert('❌ ' + result.message);
      } else {
        alert('✅ Đã xác nhận giao mèo!');
        window.location.reload(); // Reload để cập nhật trạng thái
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
    setActionLoading(false);
    setShowQRScanner(false);
  };

  // ĐÁNH GIÁ GIAO DỊCH
  const handleReview = async (depositId, reviewType) => {
    if (!confirm(`Xác nhận đánh giá ${reviewType === 'good' ? 'TỐT' : 'XẤU'}?`)) return;
    
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('owner_review_delivery', {
        p_deposit_id: depositId,
        p_owner_id: (await supabase.auth.getUser()).data.user.id,
        p_review: reviewType
      });

      if (error) throw error;
      alert('✅ Đã ghi nhận đánh giá!');
      window.location.reload();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
    setActionLoading(false);
    setShowReviewModal(null);
  };

  if (loading) {
    return <div className="p-4 text-sm">Đang tải…</div>;
  }

  if (!pet) {
    return <div className="p-4 text-sm">Không tìm thấy mèo.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500 cursor-pointer" onClick={() => navigate(-1)}>
            ← Quay lại
          </div>
          <h1 className="text-lg font-bold">Người đăng ký nhận mèo</h1>
          <div className="text-sm text-gray-600">{pet.name}</div>
        </div>
        {pet.image_url && (
          <img
            src={pet.image_url}
            alt={pet.name}
            className="w-16 h-16 object-cover rounded"
          />
        )}
      </header>

      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">{error}</div>
      )}

      <div className="space-y-4">
        {/* Danh sách người cọc - CHỜ GIAO */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="text-sm font-bold">Người đã đặt cọc ({grouped.pending.length})</div>
            {grouped.pending.length > 0 && (
              <button
                onClick={() => setShowQRScanner(true)}
                className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
              >
                📷 Quét QR xác nhận
              </button>
            )}
          </div>

          {grouped.pending.length === 0 ? (
            <div className="text-xs text-gray-500 bg-gray-50 border rounded p-3">Chưa có ai cọc.</div>
          ) : (
            <div className="space-y-2">
              {grouped.pending.map((d) => (
                <div key={d.id} className="border rounded p-3 bg-white">
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-semibold">{d.profiles?.display_name || "N/A"}</div>
                    <div className="text-xs text-gray-500">Cọc: {d.amount?.toLocaleString()}đ</div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleConfirmDelivery(d.receiver?.user_qr_id || `USER-${d.receiver_id.slice(0,8)}`)}
                      className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      ✅ Xác nhận giao
                    </button>
                    <button
                      onClick={() => handleCancel(d.id)}
                      className="px-3 py-1 border text-xs rounded hover:bg-red-50 text-red-600"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Đang chờ đánh giá - LOCKED 3 NGÀY */}
        {grouped.locked.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-bold text-orange-600">Chờ đánh giá ({grouped.locked.length})</div>
            <div className="space-y-2">
              {grouped.locked.map((d) => {
                const deadline = new Date(d.review_period_ends_at);
                const hoursLeft = Math.max(0, Math.floor((deadline - new Date()) / 3600000));
                
                return (
                  <div key={d.id} className="border rounded p-3 bg-orange-50">
                    <div className="flex justify-between items-start">
                      <div className="text-sm font-semibold">{d.profiles?.display_name}</div>
                      <div className="text-xs text-orange-600">⏰ Còn {Math.floor(hoursLeft/24)}d {hoursLeft%24}h</div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleReview(d.id, 'good')}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded"
                      >
                        ✅ Tốt
                      </button>
                      <button
                        onClick={() => handleReview(d.id, 'bad')}
                        className="px-3 py-1 bg-red-600 text-white text-xs rounded"
                      >
                        ❌ Xấu
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Lịch sử */}
        {grouped.history.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-bold text-gray-600">Lịch sử ({grouped.history.length})</div>
            <div className="space-y-2">
              {grouped.history.map((d) => (
                <div key={d.id} className="border rounded p-2 bg-gray-50 text-xs text-gray-600">
                  <div>{d.profiles?.display_name} - {d.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Quét mã QR người nhận</h3>
            <QRScanner
              onScanSuccess={(qrCode) => handleConfirmDelivery(qrCode)}
              onScanError={(err) => console.error(err)}
            />
            <button
              onClick={() => setShowQRScanner(false)}
              className="mt-4 w-full px-4 py-2 border rounded hover:bg-gray-50"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
