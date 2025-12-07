import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import PetMap from "../components/PetMap";

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
      if (file) {
        const ext = file.name.split(".").pop();
        const filePath = `pets/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("pet-images")
          .upload(filePath, file);

        if (uploadError) {
          setError("Upload ảnh lỗi.");
          setSubmitting(false);
          return;
        }

        const { data: publicData } = supabase.storage
          .from("pet-images")
          .getPublicUrl(filePath);

        imageUrl = publicData?.publicUrl || null;
      }

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

      const { error: insertError } = await supabase
        .from("pets")
        .insert([petData]);

      if (insertError) {
        setError("Có lỗi khi lưu báo cáo.");
        setSubmitting(false);
        return;
      }

      alert("Đã gửi báo cáo thành công!");
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Có lỗi không xác định.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-24">
      {/* Back */}
      <div className="p-4">
        <button
          onClick={() => navigate("/")}
          className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
        >
          ← Quay lại
        </button>
      </div>

      {/* Map Card */}
      <div className="px-4 lg:px-32">
        <div className="bg-white shadow-md rounded-xl p-3 md:p-5">
          <PetMap
            fullscreen
            reportMode
            onSelectPosition={setPosition}
            pets={[]}
          />
        </div>

        <p className="text-xs text-gray-500 mt-2 ml-1">
          Chạm vào bản đồ để chọn vị trí thú cưng được thấy lần cuối.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 p-5 bg-white shadow-lg rounded-xl max-w-xl mx-auto"
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Báo mèo / chó thất lạc
        </h2>

        {/* Tên */}
        <div className="mb-4">
          <label className="text-sm font-medium">Tên thú cưng</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
            placeholder="VD: Miu, Vàng, Đen..."
          />
        </div>

        {/* Trạng thái */}
        <div className="mb-4">
          <label className="text-sm font-medium">Trạng thái</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
          >
            <option value="Lost">Lost (Thất lạc)</option>
            <option value="Found">Found (Đã tìm thấy)</option>
            <option value="Abandoned">Abandoned (Bị bỏ rơi)</option>
          </select>
        </div>

        {/* Quận */}
        <div className="mb-4">
          <label className="text-sm font-medium">Khu vực</label>
          <input
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
            placeholder="VD: Quận 5, Bình Thạnh..."
          />
        </div>

        {/* Mô tả */}
        <div className="mb-4">
          <label className="text-sm font-medium">Mô tả</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full mt-1 p-3 border rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
            placeholder="Đặc điểm nhận dạng, màu lông, thời điểm..."
          />
        </div>

        {/* Ảnh */}
        <div className="mb-4">
          <label className="text-sm font-medium">Ảnh thú cưng (tuỳ chọn)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-1"
          />
          {file && <p className="text-xs text-gray-600 mt-1">{file.name}</p>}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          disabled={submitting}
          className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold transition disabled:opacity-50"
        >
          {submitting ? "Đang gửi..." : "Gửi báo cáo"}
        </button>
      </form>

      {/* Floating Scroll-to-form */}
      {!submitting && (
        <button
          onClick={() =>
            window.scrollTo({
              top: document.body.scrollHeight,
              behavior: "smooth",
            })
          }
          className="fixed bottom-20 right-4 bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg animate-pulse z-[99999]"
        >
          Điền thông tin ↓
        </button>
      )}
    </div>
  );
}
