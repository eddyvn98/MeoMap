import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function LostPetDetail({ pet, user, isOwner, onMarkAsFound, onDelete, onEdit }) {
  const [owner, setOwner] = useState(null);
  const [closing, setClosing] = useState(false);
  const isClosed = ["closed", "delivered", "completed", "found"].includes(String(pet.status || "").toLowerCase());

  useEffect(() => {
    const loadOwner = async () => {
      if (!pet.owner_id) return;
      const { data } = await supabase
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
    if (!confirm("Đóng case đi lạc này vì đã tìm thấy hoặc không còn cần tìm?")) return;
    setClosing(true);
    const { error } = await supabase
      .from("pets")
      .update({ status: "closed" })
      .eq("id", pet.id)
      .eq("owner_id", user.id);
    setClosing(false);
    if (error) return alert("Không thể đóng case: " + error.message);
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
          <span className="absolute right-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white">
            {isClosed ? "Đã đóng" : "Đang tìm"}
          </span>
        </div>
        <div className="p-4">
          <h2 className="text-xl font-bold">{pet.name || "Thú cưng đi lạc"}</h2>
          {pet.district && <p className="mt-1 text-sm text-gray-600">📍 Khu vực: {pet.district}</p>}
          {pet.description && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{pet.description}</p>}
        </div>
      </section>

      {!isOwner && !isClosed && (
        <section className="rounded-lg border bg-blue-50 p-4">
          <h3 className="font-bold text-blue-900">👀 Bạn có thông tin?</h3>
          <p className="mb-3 mt-1 text-sm text-blue-800">
            Hãy liên hệ trực tiếp người đăng. MeoMap không thu, giữ hoặc chi trả tiền thưởng.
          </p>
          {owner?.phone && <a className="mb-2 block rounded bg-green-600 px-4 py-2 text-center font-semibold text-white" href={`tel:${owner.phone}`}>📱 Gọi {owner.phone}</a>}
          {owner?.email && <a className="block rounded bg-blue-600 px-4 py-2 text-center font-semibold text-white" href={`mailto:${owner.email}`}>✉️ Gửi email</a>}
          {!owner?.phone && !owner?.email && <p className="text-sm text-gray-600">Người đăng chưa cập nhật thông tin liên hệ công khai.</p>}
        </section>
      )}

      {isOwner && (
        <section className="rounded-lg border bg-gray-50 p-4">
          <h3 className="font-bold">Quản lý case đi lạc</h3>
          <p className="my-2 text-sm text-gray-600">
            Luồng được tối giản: đăng bài, nhận liên hệ trực tiếp và đóng case. Không còn báo tin có thưởng, xác minh thưởng hay ví.
          </p>
          <div className="flex gap-2">
            {onEdit && !isClosed && <button onClick={onEdit} className="flex-1 rounded border bg-white px-4 py-2">Sửa bài</button>}
            {!isClosed && <button onClick={closeCase} disabled={closing} className="flex-1 rounded bg-gray-800 px-4 py-2 font-semibold text-white disabled:opacity-50">{closing ? "Đang đóng..." : "✓ Đóng case"}</button>}
          </div>
        </section>
      )}
    </div>
  );
}
