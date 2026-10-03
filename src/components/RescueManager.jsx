import { useEffect, useState } from "react";
import { localApi } from "../localClient";

function initialBank(pet) {
  return {
    bank_name: pet.bank_name || "",
    bank_account_name: pet.bank_account_name || "",
    bank_account_number: pet.bank_account_number || "",
  };
}

export default function RescueManager({
  pet,
  user,
  onPetChanged,
  onContentChanged,
}) {
  const [busy, setBusy] = useState(false);
  const [appeal, setAppeal] = useState("");
  const [updateText, setUpdateText] = useState("");
  const [spentCost, setSpentCost] = useState("");
  const [bank, setBank] = useState(() => initialBank(pet));

  useEffect(() => {
    setBank(initialBank(pet));
  }, [pet]);

  const saveDonationInfo = async () => {
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
      onPetChanged?.();
    } catch (error) {
      alert("Không thể lưu thông tin: " + error.message);
    } finally {
      setBusy(false);
    }
  };

  const publishAppeal = async () => {
    if (!appeal.trim()) return;

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
      onContentChanged?.();
    } catch (error) {
      alert("Không thể đăng lời kêu gọi: " + error.message);
    } finally {
      setBusy(false);
    }
  };

  const publishUpdate = async () => {
    if (!updateText.trim()) return;

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
      onContentChanged?.();
    } catch (error) {
      alert("Không thể đăng cập nhật: " + error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
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

      <p className="text-xs text-gray-500">
        Người phụ trách: {user?.email || "Tài khoản hiện tại"}
      </p>
    </section>
  );
}
