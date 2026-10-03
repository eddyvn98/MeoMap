import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PetMap from "../components/PetMap";
import { roundReportCoordinate } from "../components/report/reportPetModel";
import { localApi } from "../localClient";

export default function MapPage() {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageThumb, setImageThumb] = useState("");
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    status: "available",
    animal: "cat",
    color: "",
    district: "",
    imageUrl: "",
    description: "",
    contact: "",
  });

  const handleImageChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setImageThumb("");
    if (!selectedFile) return;

    const img = new Image();
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 160;
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImageThumb(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = String(readerEvent.target?.result || "");
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!position) return alert("Nhấn vào bản đồ để chọn vị trí.");
    if (!form.name.trim()) return alert("Nhập tiêu đề bài viết.");
    if (!form.contact.trim()) return alert("Nhập thông tin liên hệ.");

    setSaving(true);
    try {
      const { data: auth } = await localApi.auth.getUser();
      if (!auth?.user) {
        navigate("/login");
        return;
      }

      let imageUrl = form.imageUrl.trim() || null;
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const requestedPath = `pets/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await localApi.storage
          .from("pet-images")
          .upload(requestedPath, file);

        if (uploadError) throw uploadError;
        imageUrl = localApi.storage
          .from("pet-images")
          .getPublicUrl(uploadData.path).data.publicUrl;
      }

      const contactValue = form.contact.trim();
      const { error: insertError } = await localApi.from("pets").insert({
        name: form.name.trim(),
        status: form.status,
        category: "lost",
        animal: form.animal,
        ...(form.color ? { color: form.color } : {}),
        district: form.district.trim(),
        description: form.description.trim(),
        lat: roundReportCoordinate(position.lat),
        lng: roundReportCoordinate(position.lng),
        image_url: imageUrl,
        contact_type: contactValue.includes("@") ? "email" : "phone",
        contact_value: contactValue,
      });

      if (insertError) throw insertError;
      alert("Đã tạo case thành công.");
      navigate("/");
    } catch (submitError) {
      console.error(submitError);
      alert("Không thể lưu case: " + (submitError.message || submitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: 10 }}>
        <button onClick={() => navigate("/")}>← Quay lại</button>
      </div>

      <PetMap
        fullscreen
        reportMode
        onSelectPosition={setPosition}
      />

      <form onSubmit={handleSubmit} style={{ padding: 16 }}>
        <h3>Báo thú cưng đi lạc</h3>

        <Field label="Tiêu đề">
          <input name="name" value={form.name} onChange={handleChange} style={inputStyle} />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Loài">
            <select name="animal" value={form.animal} onChange={handleChange} style={inputStyle}>
              <option value="cat">Mèo</option>
              <option value="dog">Chó</option>
            </select>
          </Field>
          <Field label="Màu lông">
            <select name="color" value={form.color} onChange={handleChange} style={inputStyle}>
              <option value="">Chưa rõ</option>
              <option value="white">Trắng</option>
              <option value="black">Đen</option>
              <option value="orange">Vàng / cam</option>
              <option value="gray">Xám</option>
              <option value="mixed">Nhiều màu</option>
              <option value="other">Khác</option>
            </select>
          </Field>
        </div>

        <Field label="Trạng thái">
          <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
            <option value="available">Đang mở</option>
            <option value="pending">Chờ xử lý</option>
            <option value="in_contact">Đang liên lạc</option>
          </select>
        </Field>

        <Field label="Khu vực">
          <input name="district" value={form.district} onChange={handleChange} style={inputStyle} />
        </Field>

        <Field label="Link ảnh online (tuỳ chọn)">
          <input name="imageUrl" value={form.imageUrl} onChange={handleChange} style={inputStyle} />
        </Field>

        <Field label="Ảnh tải lên (tuỳ chọn)">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleImageChange}
          />
          {file && <small style={{ display: "block", marginTop: 4 }}>{file.name}</small>}
          {imageThumb && (
            <img
              src={imageThumb}
              alt="Xem trước"
              style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, marginTop: 8 }}
            />
          )}
        </Field>

        <Field label="Mô tả">
          <textarea name="description" value={form.description} onChange={handleChange} rows={3} style={inputStyle} />
        </Field>

        <Field label="Số điện thoại hoặc email liên hệ">
          <input name="contact" value={form.contact} onChange={handleChange} style={inputStyle} />
        </Field>

        <div style={{ marginBottom: 8 }}>
          <small>
            {position
              ? `${roundReportCoordinate(position.lat)}, ${roundReportCoordinate(position.lng)}`
              : "Nhấn vào bản đồ để chọn vị trí"}
          </small>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            ...inputStyle,
            border: "none",
            background: "#ff7f32",
            color: "#fff",
            fontWeight: "bold",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Đang lưu..." : "Gửi báo cáo"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = { width: "100%", padding: 8, boxSizing: "border-box" };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label>{label}</label>
      <br />
      {children}
    </div>
  );
}
