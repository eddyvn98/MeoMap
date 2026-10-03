import { useEffect, useState } from "react";
import { localApi } from "../localClient";
import { isClosedStatus } from "../utils/petStatus";
import RescueAppealsList from "./RescueAppealsList";
import RescueUpdatesTimeline from "./RescueUpdatesTimeline";

function initialBank(pet) {
  return {
    bank_name: pet.bank_name || "",
    bank_account_name: pet.bank_account_name || "",
    bank_account_number: pet.bank_account_number || "",
  };
}

export default function RescuePetDetail({
  pet,
  user,
  isOwner,
  onChanged,
}) {
  const isRescuer = !!user && pet.rescuer_id === user.id;
  const isClosed = isClosedStatus(pet.status);
  const [busy, setBusy] = useState(false);
  const [appeal, setAppeal] = useState("");
  const [updateText, setUpdateText] = useState("");
  const [spentCost, setSpentCost] = useState("");
  const [bank, setBank] = useState(() => initialBank(pet));
  const [refreshTimeline, setRefreshTimeline] = useState(0);

  useEffect(() => {
    setBank(initialBank(pet));
  }, [pet]);

  const changed = () => {
    onChanged?.();
  };

  const acceptCase = async () => {
    if (!user) return alert("Vui lòng đăng nhập để nhận ca.");
    if (pet.rescuer_id) return alert("Ca này đã có người nhận.");
    if (!confirm("Bạn xác nhận nhận ca cứu hộ này?")) return;

    setBusy(true);
    try {
      const { data: claimed, error } = await localApi.rpc(
        "claim_rescue_case",
        { p_case_id: pet.id },
      );
      if (error) throw error;
      if (!claimed) {
        return alert("Ca này đã có người khác nhận hoặc đã kết thúc.");
      }
      changed();
    } catch (error) {
      alert("Không thể nhận ca: " + error.message);
    } finally {
      setBusy(false);
    }
  };

  const saveDonationInfo = async () => {
    if (!isRescuer) return;

    setBusy(true);
    try {
      const { data: saved, error } = await localApi.rpc(
        "update_rescue_support_info",
        {
          p_case_id: pet.id,
          p_bank_account_number: bank.bank_account_number,
          p_bank_account_name: bank.bank_account_name,
          p_bank_name: bank.bank_name,
        },
      );
      if (error) throw error;
      if (!saved) return alert("Bạn không còn là người phụ trách ca này.");
      alert("Đã lưu thông tin nhận hỗ trợ trực tiếp.");
      changed();
    } catch (error) {
      alert("Không thể lưu thông tin: " + error.message);
    } finally {
      setBusy(false);
    }
  };

  const publishAppeal = async () => {
    if (!isRescuer || !appeal.trim()) return;

    setBusy(true);
    try {
      const { error } = await localApi.from("rescue_appeals").insert({
        case_id: pet.id,
        title: "Kêu gọi hỗ trợ",
        content: appeal.trim(),
        status: "active",
      });
      if (error) throw error;
      setAppeal("");
      alert("Đã đăng lời kêu gọi.");
      changed();
    } catch (error) {
      alert("Không thể đăng lời kêu gọi: " + error.message);
    } finally {
      setBusy(false);
    }
  };

  const publishUpdate = async () => {
    if (!isRescuer || !updateText.trim()) return;

    const cost = spentCost === "" ? 0 : Number(spentCost);
    if (!Number.isFinite(cost) || cost < 0) {
      return alert("Chi phí không hợp lệ.");
    }

    setBusy(true);
    try {
      const { error } = await localApi.from("rescue_updates").insert({
        case_id: pet.id,
        title: "Cập nhật tình hình",
        content: updateText.trim(),
        spent_cost: cost,
        image_urls: [],
        video_urls: [],
      });
      if (error) throw error;
      setUpdateText("");
      setSpentCost("");
      setRefreshTimeline((value) => value + 1);
    } catch (error) {
      alert("Không thể đăng cập nhật: " + error.message);
    } finally {
      setBusy(false);
    }
  };

  const closeCase = async () => {
    if (!user || (!isOwner && !isRescuer)) return;
    if (!confirm("Kết thúc ca cứu hộ này?")) return;

    setBusy(true);
    try {
      const { data: closed, error } = await localApi.rpc(
        "close_rescue_case_simple",
        { p_case_id: pet.id },
      );
      if (error) throw error;
      if (!closed) {
        return alert("Ca đã kết thúc hoặc bạn không có quyền đóng ca.");
      }
      changed();
    } catch (error) {
      alert("Không thể kết thúc ca: " + error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border bg-white">
        {pet.image_url && (
          <img
            src={pet.image_url}
            alt={pet.name}
            className="h-64 w-full object-cover"
          />
        )}
        <div className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">🚑 {pet.name || "Ca cứu hộ"}</h2>
            <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
              {isClosed
                ? "Đã kết thúc"
                : pet.rescuer_id
                  ? "Đã có người cứu"
                  : "Cần người cứu"}
            </span>
          </div>
          {pet.district && (
            <p className="mt-1 text-sm text-gray-600">📍 {pet.district}</p>
          )}
          {pet.description && (
            <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
              {pet.description}
            </p>
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
          <h3 className="font-bold text-blue-900">
            💙 Hỗ trợ trực tiếp người cứu
          </h3>
          <p className="my-2 text-sm text-blue-800">
            MeoMap chỉ hiển thị thông tin do người cứu tự đăng. Mọi khoản hỗ trợ
            chuyển trực tiếp giữa người ủng hộ và người cứu.
          </p>
          {pet.bank_account_number ? (
            <div className="space-y-1 rounded bg-white p-3 text-sm">
              {pet.bank_name && (
                <div><strong>Ngân hàng:</strong> {pet.bank_name}</div>
              )}
              {pet.bank_account_name && (
                <div><strong>Chủ tài khoản:</strong> {pet.bank_account_name}</div>
              )}
              <div><strong>Số tài khoản:</strong> {pet.bank_account_number}</div>
            </div>
          ) : (
            <p className="text-sm text-blue-700">
              Người cứu chưa đăng thông tin nhận hỗ trợ.
            </p>
          )}
        </section>
      )}

      <section className="rounded-lg border bg-white p-4">
        <RescueAppealsList caseId={pet.id} />
      </section>

      <section className="rounded-lg border bg-white p-4">
        <RescueUpdatesTimeline
          caseId={pet.id}
          refreshKey={refreshTimeline}
        />
      </section>

      {isRescuer && !isClosed && (
        <section className="space-y-3 rounded-lg border bg-white p-4">
          <h3 className="font-bold">📢 Quản lý ca cứu hộ</h3>
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
            onChange={(e) =>
              setBank({ ...bank, bank_account_name: e.target.value })
            }
          />
          <input
            className="w-full rounded border p-2 text-sm"
            placeholder="Số tài khoản"
            value={bank.bank_account_number}
            onChange={(e) =>
              setBank({ ...bank, bank_account_number: e.target.value })
            }
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
            rows={3}
            placeholder="Nội dung kêu gọi hỗ trợ..."
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

          <textarea
            className="w-full rounded border p-2 text-sm"
            rows={3}
            placeholder="Cập nhật tình hình cứu hộ..."
            value={updateText}
            onChange={(e) => setUpdateText(e.target.value)}
          />
          <input
            type="number"
            min="0"
            step="1000"
            className="w-full rounded border p-2 text-sm"
            placeholder="Chi phí đã phát sinh (nếu có)"
            value={spentCost}
            onChange={(e) => setSpentCost(e.target.value)}
          />
          <button
            onClick={publishUpdate}
            disabled={busy || !updateText.trim()}
            className="w-full rounded bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
          >
            📝 Đăng cập nhật tình hình
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
