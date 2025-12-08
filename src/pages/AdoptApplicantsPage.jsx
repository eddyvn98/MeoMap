import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function AdoptApplicantsPage() {
  const { petId } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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
    const waitingPayment = [];
    const waitingDelivery = [];
    const history = [];

    applications.forEach((d) => {
      const isWaitingPayment = (d.status === "pending" || d.status === "locked") && d.payment_status === "pending";
      const isWaitingDelivery = d.status === "confirmed" && d.delivery_status !== "delivered";

      if (isWaitingPayment) waitingPayment.push(d);
      else if (isWaitingDelivery) waitingDelivery.push(d);
      else history.push(d);
    });

    return { waitingPayment, waitingDelivery, history };
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
        {[
          { title: "Cần xác nhận thanh toán", list: grouped.waitingPayment },
          { title: "Đã xác nhận, chờ giao mèo", list: grouped.waitingDelivery },
          { title: "Lịch sử", list: grouped.history },
        ].map((section) => (
          <div key={section.title} className="space-y-2">
            <div className="text-[11px] font-semibold text-gray-700">{section.title}</div>
            {section.list.length === 0 ? (
              <div className="text-[11px] text-gray-500 bg-gray-50 border rounded p-2">Chưa có mục nào.</div>
            ) : (
              <div className="space-y-2">
                {section.list.map((d) => (
                  <div key={d.id} className="border rounded p-3 bg-white shadow-sm text-xs">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-semibold">{d.profiles?.display_name || "Người nhận"}</div>
                        <div className="text-gray-500">ID: {d.receiver_id?.slice(0, 8)}</div>
                      </div>
                      <div className="text-right text-gray-600 text-[11px]">
                        <div>Trạng thái: {d.status}</div>
                        <div>Thanh toán: {d.payment_status || "?"}</div>
                        <div>Giao mèo: {d.delivery_status || "Chưa giao"}</div>
                      </div>
                    </div>

                    <div className="mt-2 text-gray-700">
                      Số tiền: {(d.amount || 0).toLocaleString()} đ
                    </div>

                    <div className="mt-2 flex gap-2 text-[11px]">
                      {section.title === "Đã xác nhận, chờ giao mèo" && (
                        <button
                          className="px-2 py-1 border rounded hover:bg-blue-50 text-blue-600"
                          onClick={() => navigate(`/deposit/${d.id}/ticket`)}
                        >
                          Xem QR giao mèo
                        </button>
                      )}
                      {section.title !== "Lịch sử" && (
                        <button
                          className="px-2 py-1 border rounded hover:bg-red-50 text-red-600"
                          disabled={actionLoading}
                          onClick={() => handleCancel(d.id)}
                        >
                          Hủy giao dịch
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
