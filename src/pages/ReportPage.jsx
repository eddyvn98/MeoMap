import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PetMap from "../components/PetMap";
import { roundReportCoordinate } from "../components/report/reportPetModel";
import { localApi } from "../localClient";

export default function ReportPage() {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("available");
  const [category, setCategory] = useState("lost");
  const [animal, setAnimal] = useState("cat");
  const [color, setColor] = useState("");
  const [district, setDistrict] = useState("");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) return setError("Nhập tiêu đề bài viết.");
    if (!position) return setError("Chọn vị trí trên bản đồ.");
    if (!contact.trim()) return setError("Nhập số điện thoại hoặc email liên hệ.");

    setSubmitting(true);
    try {
      const { data: auth } = await localApi.auth.getUser();
      if (!auth?.user) {
        navigate("/login");
        return;
      }

      let imageUrl = null;
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

      const contactValue = contact.trim();
      const contactType = contactValue.includes("@") ? "email" : "phone";
      const { error: insertError } = await localApi.from("pets").insert({
        name: name.trim(),
        status,
        category,
        animal,
        ...(color ? { color } : {}),
        district: district.trim(),
        description: description.trim(),
        lat: roundReportCoordinate(position.lat),
        lng: roundReportCoordinate(position.lng),
        image_url: imageUrl,
        contact_type: contactType,
        contact_value: contactValue,
      });

      if (insertError) throw insertError;
      alert("Đã đăng case thành công.");
      navigate("/");
    } catch (submitError) {
      console.error(submitError);
      setError(submitError.message || "Không thể đăng case.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: 20 }}>
        <h2>Đăng case thú cưng</h2>

        <PetMap
          pets={[]}
          fullscreen
          reportMode
          onSelectPosition={setPosition}
        />

        <p style={{ marginTop: 8, fontSize: 12 }}>
          Chạm vào bản đồ để chọn vị trí gần đúng của thú cưng.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <Field label="Tiêu đề bài viết">
            <input
              style={inputStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label="Nhóm bài">
            <select
              style={inputStyle}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="lost">🔍 Đi lạc</option>
              <option value="adopt">🏡 Nhận nuôi</option>
              <option value="rescue">🚑 Cứu hộ</option>
            </select>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Field label="Loài">
              <select style={inputStyle} value={animal} onChange={(e) => setAnimal(e.target.value)}>
                <option value="cat">Mèo</option>
                <option value="dog">Chó</option>
              </select>
            </Field>
            <Field label="Màu lông">
              <select style={inputStyle} value={color} onChange={(e) => setColor(e.target.value)}>
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
            <select
              style={inputStyle}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="available">Đang mở</option>
              <option value="pending">Chờ xử lý</option>
              <option value="in_contact">Đang liên lạc</option>
            </select>
          </Field>

          <Field label="Quận / Khu vực">
            <input
              style={inputStyle}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="VD: Bình Thạnh"
            />
          </Field>

          <Field label="Mô tả ngắn">
            <textarea
              style={inputStyle}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <Field label="Số điện thoại hoặc email liên hệ">
            <input
              style={inputStyle}
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="0987654321 hoặc ten@example.com"
            />
          </Field>

          <Field label="Ảnh thú cưng (tuỳ chọn)">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Field>

          {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...inputStyle,
              background: "#ff7f32",
              border: "none",
              color: "#fff",
              fontWeight: "bold",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Đang gửi..." : "Đăng case"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = { width: "100%", padding: 8, boxSizing: "border-box" };

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label>{label}</label>
      {children}
    </div>
  );
}
