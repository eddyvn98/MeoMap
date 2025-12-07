import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import PetMap from "../components/PetMap";

console.log("ReportPage module loaded, supabase:", supabase ? "✅ OK" : "❌ undefined");

export default function ReportPage() {
  const navigate = useNavigate();

  const [position, setPosition] = useState(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Lost");
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
      setError("Nhập tên thú cưng.");
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

        const { error: uploadError } = await supabase.storage
          .from("pet-images")
          .upload(filePath, file);

        if (uploadError) {
          console.error(uploadError);
          setError("Upload ảnh lỗi.");
          setSubmitting(false);
          return;
        }

        const { data: publicData } = supabase.storage
          .from("pet-images")
          .getPublicUrl(filePath);

        imageUrl = publicData?.publicUrl || null;
      }

      // 2) Ghi bản ghi vào bảng pets (insert trả về row mới bằng .select())
      const petData = {
        name,
        status,
        district,
        description,
        lat: position.lat,
        lng: position.lng,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
      };

      console.log("Attempting to insert pet:", petData);

      const { data: insertedData, error: insertError } = await supabase
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
        <h2>Báo mèo / chó thất lạc</h2>

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
            <label>Tên thú cưng</label>
            <input
              style={{ width: "100%", padding: 8 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Trạng thái</label>
            <select
              style={{ width: "100%", padding: 8 }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Lost">Lost</option>
              <option value="Found">Found</option>
              <option value="Abandoned">Abandoned</option>
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
            {submitting ? "Đang gửi..." : "Gửi báo cáo"}
          </button>
        </form>
      </div>
    </div>
  );
}
