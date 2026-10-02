import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { localApi } from "../localClient";
import PetMap from "../components/PetMap";

console.log("ReportPage module loaded, localApi:", localApi ? "✅ OK" : "❌ undefined");

export default function ReportPage() {
  const navigate = useNavigate();

  const [position, setPosition] = useState(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Lost");
  const [category, setCategory] = useState("lost"); // adopt, lost, rescue
  const [district, setDistrict] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  console.log("ReportPage component rendered");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nhập Tiêu đề bài viết.");
      return;
    }
    if (!position) {
      setError("Chọn vị trí trên bản đồ (chạm vào map).");
      return;
    }

    setSubmitting(true);

    let imageUrl = null;

    try {
      // 1) Upload ảnh nếu có
      if (file) {
        const ext = file.name.split(".").pop();
        const filePath = `pets/${Date.now()}.${ext}`;

        const { error: uploadError } = await localApi.storage
          .from("pet-images")
          .upload(filePath, file);

        if (uploadError) {
          console.error(uploadError);
          setError("Upload ảnh lỗi.");
          setSubmitting(false);
          return;
        }

        const { data: publicData } = localApi.storage
          .from("pet-images")
          .getPublicUrl(filePath);

        imageUrl = publicData?.publicUrl || null;
      }

      // 2) Ghi bản ghi vào bảng pets (insert trả về row mới bằng .select())
      const petData = {
        name,
        status,
        category, // adopt, lost, rescue
        district,
        description,
        lat: position.lat,
        lng: position.lng,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      };

      console.log("Attempting to insert pet:", petData);

      const { data: insertedData, error: insertError } = await localApi
        .from("pets")
        .insert([petData])
        .select();

      console.log("Insert response - data:", insertedData, "error:", insertError);

      if (insertError) {
        console.error("Insert pet error (full):", {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });
        setError(
          "Lưu thú cưng bị lỗi: " +
            (insertError.details || insertError.message || insertError)
        );
        setSubmitting(false);
        return;
      }

      console.log("Inserted pet successfully:", insertedData);
      alert("Đã báo mèo thành công.");
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Có lỗi bất ngờ.");
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
          fullscreen={true}
          reportMode={true}
          onSelectPosition={setPosition}
        />

        <p style={{ marginTop: 8, fontSize: 12 }}>
          Chạm vào bản đồ để chọn vị trí thú cưng được thấy lần cuối.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Tiêu đề bài viết</label>
            <input
              style={{ width: "100%", padding: 8 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Nhóm bài</label>
            <select
              style={{ width: "100%", padding: 8 }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="lost">🔍 Đi lạc (Lost)</option>
              <option value="adopt">🏡 Nhận nuôi (Adoption)</option>
              <option value="rescue">🚑 Cứu hộ (Rescue)</option>
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Trạng thái</label>
            <select
              style={{ width: "100%", padding: 8 }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="available">Có sẵn</option>
              <option value="pending">Chờ xử lý</option>
              <option value="in_contact">Đang liên lạc</option>
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Quận / Khu vực</label>
            <input
              style={{ width: "100%", padding: 8 }}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="VD: Bình Thạnh"
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Mô tả ngắn</label>
            <textarea
              style={{ width: "100%", padding: 8 }}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Đặc điểm nhận dạng, thời điểm, thông tin liên hệ..."
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Ảnh thú cưng (tuỳ chọn)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {error && (
            <div style={{ color: "red", marginBottom: 10 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: 12,
              background: "#ff7f32",
              border: "none",
              color: "#fff",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            {submitting ? "Đang gửi..." : "Đăng case"}
          </button>
        </form>
      </div>
    </div>
  );
}
