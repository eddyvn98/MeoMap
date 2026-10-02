import { useEffect, useState } from "react";
import { localApi } from "../localClient";

export default function AdoptPetDetail({ pet, user, isOwner }) {
  const [owner, setOwner] = useState(null);
  const [closing, setClosing] = useState(false);
  const isClosed = ["closed", "delivered", "completed"].includes(pet.status);

  useEffect(() => {
    const loadOwner = async () => {
      if (!pet.owner_id) return;
      const { data } = await localApi
        .from("profiles")
        .select("display_name,email,phone")
        .eq("id", pet.owner_id)
        .maybeSingle();
      setOwner(data || null);
    };
    loadOwner();
  }, [pet.owner_id]);

  const closeCase = async () => {
    if (!isOwner || isClosed) return;
    if (!confirm("Đóng bài nhận nuôi này? Bài sẽ được đánh dấu là đã kết thúc.")) return;
    setClosing(true);
    const { error } = await localApi
      .from("pets")
      .update({ status: "closed" })
      .eq("id", pet.id)
      .eq("owner_id", user.id);
    setClosing(false);
    if (error) return alert("Không thể đóng bài: " + error.message);
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border bg-white">
        <div className="relative h-56 bg-gray-100">
          {pet.image_url ? (
            <img src={pet.image_url} alt={pet.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">Không có ảnh</div>
          )}
          <span className="absolute right-3 top-3 rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white">
            {isClosed ? "Đã đóng" : "Tìm người nhận nuôi"}
          </span>
        </div>
        <div className="p-4">
          <h2 className="text-xl font-bold">{pet.name || "Thú cưng cần nhận nuôi"}</h2>
          {pet.district && <p className="mt-1 text-sm text-gray-600">📍 {pet.district}</p>}
          {pet.description && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{pet.description}</p>}
        </div>
      </section>

      {!isOwner && !isClosed && (
        <section className="rounded-lg border bg-blue-50 p-4">
          <h3 className="font-bold text-blue-900">📞 Liên hệ người đăng</h3>
          <p className="mb-3 mt-1 text-sm text-blue-800">
            MeoMap chỉ kết nối hai bên. Việc trao đổi và bàn giao do hai bên tự thỏa thuận; hệ thống không thu tiền cọc.
          </p>
          <div className="space-y-2 text-sm">
            {owner?.display_name && <div>👤 {owner.display_name}</div>}
            {owner?.phone && <a className="block font-semibold text-blue-700" href={`tel:${owner.phone}`}>📱 {owner.phone}</a>}
            {owner?.email && <a className="block font-semibold text-blue-700" href={`mailto:${owner.email}`}>✉️ {owner.email}</a>}
            {!owner?.phone && !owner?.email && <div className="text-gray-600">Người đăng chưa cập nhật thông tin liên hệ công khai.</div>}
          </div>
        </section>
      )}

      {isOwner && (
        <section className="rounded-lg border bg-gray-50 p-4">
          <h3 className="font-bold">Quản lý bài nhận nuôi</h3>
          <p className="my-2 text-sm text-gray-600">
            Khi đã tìm được người nhận, chỉ cần đóng case. MeoMap không quản lý yêu cầu nhận nuôi, cọc, QR bàn giao hay thanh toán.
          </p>
          {!isClosed && (
            <button onClick={closeCase} disabled={closing} className="w-full rounded bg-gray-800 px-4 py-2 font-semibold text-white disabled:opacity-50">
              {closing ? "Đang đóng..." : "✓ Đóng case"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
