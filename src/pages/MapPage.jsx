import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PetMap from "../components/PetMap";
import { localApi } from "../localClient";

export default function MapPage() {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imageThumb, setImageThumb] = useState("");
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    name: "",
    status: "Lost",
    district: "",
    imageUrl: "",
    description: "",
  });

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (ev) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 160; // thumbnail vuông 160x160

        let w = img.width;
        let h = img.height;

        if (w > h) {
          if (w > maxSize) {
            h = (h * maxSize) / w;
            w = maxSize;
          }
        } else {
          if (h > maxSize) {
            w = (w * maxSize) / h;
            h = maxSize;
          }
        }

        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        // nén quality 0.7 cho nhẹ
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

        setImageThumb(dataUrl);
      };

      img.src = ev.target.result;
    };

    reader.readAsDataURL(file);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!position) {
      alert("Nhấn vào bản đồ để chọn vị trí mèo.");
      return;
    }
    if (!form.name.trim()) {
      alert("Nhập tên mèo.");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = null;

      // 1) Upload ảnh lên local server nếu có chọn file
      if (file) {
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const filePath = fileName;

        const { error: uploadError } = await localApi
          .storage
          .from("pet-images")
          .upload(filePath, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          alert("Upload ảnh bị lỗi, thử lại sau.");
          setSaving(false);
          return;
        }

        // 2) Lấy public URL
        const { data } = localApi
          .storage
          .from("pet-images")
          .getPublicUrl(filePath);

        imageUrl = data.publicUrl;
      }

      // 3) Lưu vào local server
      const { data: insertedData, error: insertError } = await localApi
        .from("pets")
        .insert([
          {
            name: form.name,
            status: form.status,
            district: form.district,
            description: form.description,
            lat: position.lat,
            lng: position.lng,
            image_url: imageUrl,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (insertError) {
        console.error("Insert pet error:", insertError);
        alert("Lỗi khi lưu báo mèo: " + (insertError.message || insertError));
        setSaving(false);
        return;
      }

      console.log("Inserted pet:", insertedData);

      // về trang chính, list + map sẽ tự cập nhật realtime
      alert("Đã tạo báo cáo thành công!");
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Lỗi khi lưu báo mèo, mở console để xem chi tiết.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: 10 }}>
        <button onClick={() => navigate("/")}>← Back</button>
      </div>

      {/* Bản đồ full screen, bật chế độ chọn vị trí */}
      <PetMap
        fullscreen
        reportMode
        onSelectPosition={(latlng) => setPosition(latlng)}
      />

      <form onSubmit={handleSubmit} style={{ padding: 16 }}>
        <h3>Báo mèo thất lạc / cần giúp</h3>

        <div style={{ marginBottom: 8 }}>
          <label>Tên mèo</label>
          <br />
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            style={{ width: "100%", padding: 6 }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Trạng thái</label>
          <br />
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            style={{ width: "100%", padding: 6 }}
          >
            <option value="Lost">Lost</option>
            <option value="Found">Found</option>
            <option value="Abandoned">Abandoned</option>
          </select>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Khu vực (Quận / khu chợ / hẻm)</label>
          <br />
          <input
            name="district"
            value={form.district}
            onChange={handleChange}
            style={{ width: "100%", padding: 6 }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Link hình mèo (ảnh online)</label>
          <br />
          <input
            name="imageUrl"
            value={form.imageUrl}
            onChange={handleChange}
            style={{ width: "100%", padding: 6 }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Ảnh mèo (chỉ test nội bộ)</label>
          <br />
          <input type="file" accept="image/*" onChange={handleImageChange} />
          {imageThumb && (
            <div style={{ marginTop: 8 }}>
              <small>Preview:</small>
              <br />
              <img
                src={imageThumb}
                alt="preview"
                style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }}
              />
            </div>
          )}
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Upload ảnh lên local server</label>
          <br />
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {file && <small style={{ marginTop: 4, display: "block" }}>File chọn: {file.name}</small>}
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Mô tả ngắn</label>
          <br />
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            style={{ width: "100%", padding: 6 }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>Vị trí đã chọn</label>
          <br />
          <small>
            {position
              ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
              : "Nhấn vào bản đồ để chọn"}
          </small>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "none",
            background: "#ff7f32",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          {saving ? "Đang lưu..." : "Gửi báo mèo"}
        </button>
      </form>
    </div>
  );
}
