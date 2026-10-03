import { useState } from "react";
import { localApi } from "../localClient";

export default function EditPostPanel({ post, onClose, onSuccess }) {
  const [name, setName] = useState(post.name || "");
  const [description, setDescription] = useState(post.description || "");
  const [category, setCategory] = useState(post.category || "lost");
  const [file, setFile] = useState(null);
  const [contactType, setContactType] = useState(post.contact_type || "phone");
  const [contactValue, setContactValue] = useState(post.contact_value || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return setError("Tiêu đề không được để trống.");

    setLoading(true);
    setError("");
    try {
      let nextImage = post.image_url || null;

      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const requestedPath = `pets/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await localApi.storage
          .from("pet-images")
          .upload(requestedPath, file);

        if (uploadError) throw uploadError;
        nextImage = localApi.storage
          .from("pet-images")
          .getPublicUrl(uploadData.path).data.publicUrl;
      }

      const trimmedContact = contactValue.trim();
      const { error: updateError } = await localApi
        .from("pets")
        .update({
          name: name.trim(),
          description: description.trim(),
          category,
          image_url: nextImage,
          contact_type: trimmedContact ? contactType : null,
          contact_value: trimmedContact || null,
        })
        .eq("id", post.id);

      if (updateError) throw updateError;
      onSuccess?.();
    } catch (saveError) {
      setError(saveError.message || "Không thể cập nhật case.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Sửa case</h2>
        <button type="button" onClick={onClose} className="text-xl">×</button>
      </div>

      <Field label="Tiêu đề">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <Field label="Loại case">
        <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="lost">Đi lạc</option>
          <option value="adopt">Nhận nuôi</option>
          <option value="rescue">Cứu hộ</option>
        </select>
      </Field>

      <Field label="Mô tả">
        <textarea className={inputClass} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <Field label="Liên hệ">
        <div className="flex gap-2">
          <select className="rounded border p-2" value={contactType} onChange={(e) => setContactType(e.target.value)}>
            <option value="phone">Điện thoại</option>
            <option value="email">Email</option>
            <option value="facebook">Facebook</option>
          </select>
          <input
            className={inputClass}
            value={contactValue}
            onChange={(e) => setContactValue(e.target.value)}
            placeholder="Thông tin liên hệ"
          />
        </div>
      </Field>

      <Field label="Ảnh mới">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </Field>

      {category === "rescue" && (
        <div className="rounded-lg border bg-blue-50 p-3 text-xs text-blue-800">
          Thông tin tài khoản nhận hỗ trợ chỉ người đang phụ trách ca cứu hộ mới chỉnh
          được trong trang chi tiết ca.
        </div>
      )}

      {error && <div className="text-sm text-red-600">{error}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded border px-4 py-2">Hủy</button>
        <button disabled={loading} className="flex-1 rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
          {loading ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </form>
  );
}

const inputClass = "w-full rounded border p-2";

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold">{label}</label>
      {children}
    </div>
  );
}
