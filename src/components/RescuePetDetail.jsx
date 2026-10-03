import { useState } from "react";
import { localApi } from "../localClient";
import { isClosedStatus } from "../utils/petStatus";
import RescueAppealsList from "./RescueAppealsList";
import RescueManager from "./RescueManager";
import RescueUpdatesTimeline from "./RescueUpdatesTimeline";

export default function RescuePetDetail({
  pet,
  user,
  isOwner,
  onChanged,
}) {
  const isRescuer = !!user && pet.rescuer_id === user.id;
  const isClosed = isClosedStatus(pet.status);
  const [busy, setBusy] = useState(false);
  const [contentVersion, setContentVersion] = useState(0);

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
      onChanged?.();
    } catch (error) {
      alert("Không thể nhận ca: " + error.message);
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
      onChanged?.();
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
        <RescueAppealsList
          caseId={pet.id}
          refreshKey={contentVersion}
        />
      </section>

      <section className="rounded-lg border bg-white p-4">
        <RescueUpdatesTimeline
          caseId={pet.id}
          refreshKey={contentVersion}
        />
      </section>

      {isRescuer && !isClosed && (
        <RescueManager
          pet={pet}
          user={user}
          onPetChanged={onChanged}
          onContentChanged={() =>
            setContentVersion((value) => value + 1)
          }
        />
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
