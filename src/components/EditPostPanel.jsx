import { useState } from "react";
import { supabase } from "../supabaseClient";

export default function EditPostPanel({ post, onClose, onSuccess }) {
  const [name, setName] = useState(post.name || "");
  const [description, setDescription] = useState(post.description || "");
  const [category, setCategory] = useState(post.category || "lost");
  const [file, setFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(post.image_url || "");
  const [bankAccountNumber, setBankAccountNumber] = useState(post.bank_account_number || "");
  const [bankAccountName, setBankAccountName] = useState(post.bank_account_name || "");
  const [bankName, setBankName] = useState(post.bank_name || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError("Tiêu đề không được để trống.");
    setLoading(true);
    setError("");

    try {
      let nextImage = imageUrl;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `pets/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("pet-images").upload(path, file);
        if (uploadError) throw uploadError;
        nextImage = supabase.storage.from("pet-images").getPublicUrl(path).data?.publicUrl || nextImage;
      }

      const update = {
        name: name.trim(),
        description: description.trim(),
        category,
        image_url: nextImage || null,
        updated_at: new Date().toISOString(),
      };

      if (category === "rescue") {
        update.bank_account_number = bankAccountNumber.trim() || null;
        update.bank_account_name = bankAccountName.trim() || null;
        update.bank_name = bankName.trim() || null;
      }

      const { error: updateError } = await supabase.from("pets").update(update).eq("id", post.id);
      if (updateError) throw updateError;
      onSuccess?.();
    } catch (err) {
      setError(err.message || "Không thể cập nhật case.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">Sửa case</h2>
        <button type="button" onClick={onClose} className="text-xl">×</button>
      </div>

      <div><label className="block text-sm font-semibold mb-1">Tiêu đề</label><input className="w-full border rounded p-2" value={name} onChange={e=>setName(e.target.value)} /></div>
      <div><label className="block text-sm font-semibold mb-1">Loại case</label><select className="w-full border rounded p-2" value={category} onChange={e=>setCategory(e.target.value)}><option value="lost">Đi lạc</option><option value="adopt">Nhận nuôi</option><option value="rescue">Cứu hộ</option></select></div>
      <div><label className="block text-sm font-semibold mb-1">Mô tả</label><textarea className="w-full border rounded p-2" rows={5} value={description} onChange={e=>setDescription(e.target.value)} /></div>
      <div><label className="block text-sm font-semibold mb-1">Ảnh mới</label><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0] || null)} /></div>

      {category === "rescue" && (
        <section className="border rounded-lg p-3 bg-blue-50 space-y-2">
          <h3 className="font-semibold text-blue-900">Thông tin nhận hỗ trợ trực tiếp</h3>
          <p className="text-xs text-blue-800">Đây là thông tin của người cứu. MeoMap chỉ hiển thị, không nhận hoặc quản lý tiền.</p>
          <input className="w-full border rounded p-2 bg-white" placeholder="Ngân hàng" value={bankName} onChange={e=>setBankName(e.target.value)} />
          <input className="w-full border rounded p-2 bg-white" placeholder="Tên chủ tài khoản" value={bankAccountName} onChange={e=>setBankAccountName(e.target.value)} />
          <input className="w-full border rounded p-2 bg-white" placeholder="Số tài khoản" value={bankAccountNumber} onChange={e=>setBankAccountNumber(e.target.value)} />
        </section>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 border rounded px-4 py-2">Hủy</button>
        <button disabled={loading} className="flex-1 rounded bg-blue-600 text-white font-semibold px-4 py-2 disabled:opacity-50">{loading ? "Đang lưu..." : "Lưu"}</button>
      </div>
    </form>
  );
}
