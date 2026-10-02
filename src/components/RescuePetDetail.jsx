import { useState } from "react";
import { supabase } from "../supabaseClient";
import RescueAppealsList from "./RescueAppealsList";

export default function RescuePetDetail({ pet, user, isOwner }) {
  const isRescuer = !!user && pet.rescuer_id === user.id;
  const isClosed = ["closed", "delivered", "completed"].includes(String(pet.status || "").toLowerCase());
  const [busy, setBusy] = useState(false);
  const [appeal, setAppeal] = useState("");
  const [bank, setBank] = useState({
    bank_account_number: pet.bank_account_number || "",
    bank_account_name: pet.bank_account_name || "",
    bank_name: pet.bank_name || "",
  });

  const acceptCase = async () => {
    if (!user) return alert("Vui lòng đăng nhập để nhận ca.");
    if (pet.rescuer_id) return alert("Ca này đã có người nhận.");
    if (!confirm("Bạn xác nhận nhận ca cứu hộ này?")) return;

    setBusy(true);
    const { error } = await supabase
      .from("pets")
      .update({ rescuer_id: user.id })
      .eq("id", pet.id)
      .is("rescuer_id", null);
    setBusy(false);

    if (error) return alert("Không thể nhận ca: " + error.message);
    window.location.reload();
  };

  const saveDonationInfo = async () => {
    if (!isRescuer) return;

    setBusy(true);
    const { error } = await supabase
      .from("pets")
      .update(bank)
      .eq("id", pet.id)
      .eq("rescuer_id", user.id);
    setBusy(false);

    if (error) return alert("Không thể lưu thông tin: " + error.message);
    alert("Đã lưu thông tin nhận hỗ trợ trực tiếp.");
    window.location.reload();
  };

  const publishAppeal = async () => {
    if (!isRescuer || !appeal.trim()) return;

    setBusy(true);
    const { error } = await supabase.from("rescue_appeals").insert({
      case_id: pet.id,
      rescuer_id: user.id,
      title: "Kêu gọi hỗ trợ",
      content: appeal.trim(),
      status: "active",
    });
    setBusy(false);

    if (error) return alert("Không thể đăng lời kêu gọi: " + error.message);
    setAppeal("");
    alert("Đã đăng lời kêu gọi.");
    window.location.reload();
  };

  const closeCase = async () => {
    if (!user || (!isOwner && !isRescuer)) return;
    if (!confirm("Kết thúc ca cứu hộ này?")) return;

    setBusy(true);
    const { error } = await supabase
      .from("pets")
      .update({
        status: "delivered",
        completed_at: new Date().toISOString(),
      })
      .eq("id", pet.id);
    setBusy(false);

    if (error) return alert("Không thể kết thúc ca: " + error.message);
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border bg-white">
        {pet.image_url && (
          <img src={pet.image_url} alt={pet.name} className="h-64 w-full object-cover" />
        )}
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">🚑 {pet.name || "Ca cứu hộ"}</h2>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
              {isClosed ? "Đã kết thúc" : pet.rescuer_id ? "Đã có người cứu" : "Cần người cứu"}
            </span>
          </div>
          {pet.district && <p className="mt-1 text-sm text-gray-600">📍 {pet.district}</p>}
          {pet.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{pet.description}</p>
          )}
        </div>
      </section>

      {!isClosed && !pet.rescuer_id && !isOwner && (
        <button
          onClick={acceptCase}
          disabled={busy}
          className="w-full rounded-lg bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50"
        >
          ✋ Nhận ca cứu hộ
        </button>
      )}

      {pet.rescuer_id && (
        <section className="rounded-lg border bg-blue-50 p-4">
          <h3 className="font-bold text-blue-900">💙 Hỗ trợ trực tiếp người cứu</h3>
          <p className="my-2 text-sm text-blue-800">
            MeoMap chỉ hiển thị thông tin do người cứu tự đăng. Mọi khoản hỗ trợ chuyển trực tiếp
            giữa người ủng hộ và người cứu; MeoMap không nhận, giữ, đối soát hay giải ngân.
          </p>

          {pet.bank_account_number ? (
            <div className="rounded bg-white p-3 text-sm space-y-1">
              {pet.bank_name && <div><strong>Ngân hàng:</strong> {pet.bank_name}</div>}
              {pet.bank_account_name && <div><strong>Chủ tài khoản:</strong> {pet.bank_account_name}</div>}
              <div><strong>Số tài khoản:</strong> {pet.bank_account_number}</div>
            </div>
          ) : (
            <p className="text-sm text-blue-700">Người cứu chưa đăng thông tin nhận hỗ trợ.</p>
          )}
        </section>
      )}

      {!isClosed && (
        <section className="rounded-lg border bg-white p-4">
          <RescueAppealsList caseId={pet.id} />
        </section>
      )}

      {isRescuer && !isClosed && (
        <section className="space-y-3 rounded-lg border bg-white p-4">
          <h3 className="font-bold">📢 Kêu gọi hỗ trợ của tôi</h3>
          <p className="text-sm text-gray-600">
            Bạn tự đăng nội dung và thông tin nhận hỗ trợ. MeoMap không ghi nhận số tiền đã nhận.
          </p>

          <input
            className="w-full rounded border p-2 text-sm"
            placeholder="Ngân hàng"
            value={bank.bank_name}
            onChange={(e) => setBank({ ...bank, bank_name: e.target.value })}
          />
          <input
            className="w-full rounded border p-2 text-sm"
            placeholder="Tên chủ tài khoản"
            value={bank.bank_account_name}
            onChange={(e) => setBank({ ...bank, bank_account_name: e.target.value })}
          />
          <input
            className="w-full rounded border p-2 text-sm"
            placeholder="Số tài khoản"
            value={bank.bank_account_number}
            onChange={(e) => setBank({ ...bank, bank_account_number: e.target.value })}
          />
          <button
            onClick={saveDonationInfo}
            disabled={busy}
            className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            Lưu thông tin nhận hỗ trợ
          </button>

          <textarea
            className="w-full rounded border p-2 text-sm"
            rows={4}
            placeholder="Viết tình trạng hiện tại, nhu cầu hỗ trợ và cách liên hệ..."
            value={appeal}
            onChange={(e) => setAppeal(e.target.value)}
          />
          <button
            onClick={publishAppeal}
            disabled={busy || !appeal.trim()}
            className="w-full rounded bg-purple-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            📢 Đăng lời kêu gọi
          </button>
        </section>
      )}

      {(isOwner || isRescuer) && !isClosed && (
        <button
          onClick={closeCase}
          disabled={busy}
          className="w-full rounded bg-gray-800 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          ✓ Kết thúc ca cứu hộ
        </button>
      )}
    </div>
  );
}
