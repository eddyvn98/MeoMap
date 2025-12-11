import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function UserReportPage() {
  const { depositId } = useParams(); // /report-user/:depositId
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [deposit, setDeposit] = useState(null);
  const [reasonCategory, setReasonCategory] = useState("no_show");
  const [reasonDetail, setReasonDetail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");

      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) {
        setError("Bạn cần đăng nhập để gửi báo cáo.");
        setLoading(false);
        return;
      }

      // Load deposit để biết ai là ai
      const { data: dep, error: depErr } = await supabase
        .from("deposits")
        .select("id, pet_id, owner_id, receiver_id, amount, status, delivery_status")
        .eq("id", depositId)
        .single();

      if (depErr || !dep) {
        setError("Không tìm thấy giao dịch để báo cáo.");
        setLoading(false);
        return;
      }

      setDeposit(dep);
      setLoading(false);
    };

    run();
  }, [depositId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!deposit) return;

    setSubmitting(true);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setError("Bạn đã bị đăng xuất. Vui lòng đăng nhập lại.");
      setSubmitting(false);
      return;
    }

    const currentUserId = authData.user.id;

    // P1 FIX: Check rate limit before submitting report
    const { data: rateCheckResult, error: rateCheckErr } = await supabase
      .rpc('can_submit_report', {
        p_deposit_id: deposit.id,
        p_user_id: currentUserId
      });

    if (rateCheckErr) {
      setError("Lỗi kiểm tra báo cáo: " + rateCheckErr.message);
      setSubmitting(false);
      return;
    }

    if (!rateCheckResult.allowed) {
      setError("❌ " + rateCheckResult.reason);
      if (rateCheckResult.retry_after_seconds) {
        const minutes = Math.ceil(rateCheckResult.retry_after_seconds / 60);
        setError(`❌ ${rateCheckResult.reason} (chờ ${minutes} phút)`);
      }
      setSubmitting(false);
      return;
    }

    // Xác định target: nếu người đăng đang report thì target là receiver, và ngược lại
    let targetId;
    if (currentUserId === deposit.owner_id) {
      targetId = deposit.receiver_id;
    } else if (currentUserId === deposit.receiver_id) {
      targetId = deposit.owner_id;
    } else {
      setError("Bạn không thuộc giao dịch này, không thể báo cáo.");
      setSubmitting(false);
      return;
    }

    const { error: insErr } = await supabase.from("adoption_reports").insert({
      deposit_id: deposit.id,
      pet_id: deposit.pet_id,
      reporter_id: currentUserId,
      target_id: targetId,
      reason_category: reasonCategory,
      reason_detail: reasonDetail.trim() || null,
    });

    if (insErr) {
      setError("Gửi báo cáo lỗi: " + insErr.message);
      setSubmitting(false);
      return;
    }

    alert("Đã gửi báo cáo. Admin sẽ xem xét.");
    navigate(-1);
  };

  if (loading) {
    return <div className="p-4">Đang tải...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (!deposit) {
    return <div className="p-4">Không có dữ liệu.</div>;
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-lg font-semibold mb-3">Tố cáo hành vi xấu</h1>

      <div className="text-xs text-gray-600 mb-3">
        Giao dịch liên quan: deposit #{deposit.id.slice(0, 6)} – pet{" "}
        {deposit.pet_id.slice(0, 6)}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block text-sm mb-1">Lý do chính</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={reasonCategory}
            onChange={(e) => setReasonCategory(e.target.value)}
          >
            <option value="no_show">Không đến, bùng hẹn</option>
            <option value="late">Đi trễ, không báo</option>
            <option value="rude">Thái độ thiếu tôn trọng</option>
            <option value="fraud">Dấu hiệu lừa đảo</option>
            <option value="other">Khác</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="block text-sm mb-1">Mô tả chi tiết</label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            rows={3}
            value={reasonDetail}
            onChange={(e) => setReasonDetail(e.target.value)}
            placeholder="Mô tả ngắn gọn tình huống, thời gian, hành vi..."
          />
        </div>

        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded bg-red-600 text-white text-sm disabled:opacity-50"
        >
          {submitting ? "Đang gửi..." : "Gửi báo cáo"}
        </button>
      </form>
    </div>
  );
}
