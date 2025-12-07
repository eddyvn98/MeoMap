import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PetMap from "../components/PetMap";
import { supabase } from "../supabaseClient";

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

  // HANDLERS ...
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    const img = new Image();

    reader.onload = (ev) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 160;
        let w = img.width,
          h = img.height;

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

        setImageThumb(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = ev.target.result;
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!position) return alert("Hãy chọn vị trí mèo trên bản đồ.");
    if (!form.name.trim()) return alert("Nhập tên mèo.");

    setSaving(true);
    try {
      let img = null;

      if (file) {
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("pet-images")
          .upload(fileName, file);

        if (uploadError) {
          alert("Lỗi upload hình.");
          return setSaving(false);
        }

        const { data } = supabase.storage
          .from("pet-images")
          .getPublicUrl(fileName);

        img = data.publicUrl;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      //Remove imageUrl field from form state
      const { error } = await supabase.from("pets").insert([
        {
          name: form.name,
          status: form.status,
          district: form.district,
          description: form.description,
          lat: position.lat,
          lng: position.lng,
          image_url: img,
          created_at: new Date().toISOString(),
          owner_id: user?.id || null,
        },
      ]);

      if (error) {
        alert("Lỗi khi lưu.");
        return;
      }

      alert("Đã gửi báo mèo!");
      navigate("/");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-16">
      <button
        onClick={() => {
          document
            .getElementById("report-form")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
        className="fixed bottom-20 right-4 bg-orange-500 text-white px-4 py-2 rounded-full shadow-lg animate-pulse z-[99999]"
      >
        Điền thông tin ↓
      </button>
      {/* BACK BTN */}
      <div className="p-4">
        <button
          onClick={() => navigate("/")}
          className="text-blue-600 text-sm flex items-center gap-1 hover:underline"
        >
          ← Quay lại
        </button>
      </div>

      {/* MAP CARD */}
      <div className="px-4 lg:px-32">
        <div className="bg-white shadow-md rounded-xl p-4 md:p-6">
          <PetMap
            fullscreen
            reportMode
            onSelectPosition={(latlng) => setPosition(latlng)}
          />
        </div>
      </div>

      {/* FORM */}
      <form
        id="report-form"
        onSubmit={handleSubmit}
        className="p-4 max-w-xl mx-auto mt-6 bg-white shadow-lg rounded-xl p-6"
      >
        <h3 className="text-2xl font-bold mb-6 text-gray-800">
          Báo mèo thất lạc / cần giúp
        </h3>

        {/* NAME */}
        <div className="mb-5">
          <label className="text-sm font-medium">Tên mèo</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full mt-1 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="VD: Miu, Mun, Cam..."
          />
        </div>

        {/* STATUS */}
        <div className="mb-5">
          <label className="text-sm font-medium">Trạng thái</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full mt-1 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="Lost">Lost (Thất lạc)</option>
            <option value="Found">Found (Đã thấy)</option>
            <option value="Abandoned">Abandoned (Bị bỏ rơi)</option>
          </select>
        </div>

        {/* DISTRICT */}
        <div className="mb-5">
          <label className="text-sm font-medium">Khu vực</label>
          <input
            name="district"
            value={form.district}
            onChange={handleChange}
            className="w-full mt-1 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="VD: Quận 5 • Chợ Lớn • Hẻm 284"
          />
        </div>

        {/* LINK IMAGE */}
        <div className="mb-5">
          <label className="text-sm font-medium">Link hình mèo (nếu có)</label>
          <input
            name="imageUrl"
            value={form.imageUrl}
            onChange={handleChange}
            className="w-full mt-1 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="https://..."
          />
        </div>

        {/* THUMBNAIL PREVIEW */}
        <div className="mb-5">
          <label className="text-sm font-medium block mb-1">
            Thumb preview
          </label>

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="block"
          />

          {imageThumb && (
            <img
              src={imageThumb}
              className="mt-3 w-24 h-24 object-cover rounded-lg border"
            />
          )}
        </div>

        {/* UPLOAD REAL */}
        <div className="mb-5">
          <label className="text-sm font-medium block mb-1">
            Upload ảnh lên Supabase
          </label>

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block"
          />

          {file && <p className="text-xs mt-2 text-gray-600">{file.name}</p>}
        </div>

        {/* DESCRIPTION */}
        <div className="mb-5">
          <label className="text-sm font-medium">Mô tả</label>
          <textarea
            name="description"
            rows={3}
            value={form.description}
            onChange={handleChange}
            className="w-full mt-1 border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Thông tin thêm về mèo..."
          />
        </div>

        {/* POSITION */}
        <div className="mb-5">
          <label className="text-sm font-medium">Vị trí</label>
          <p className="text-sm text-gray-600 mt-1">
            {position
              ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
              : "Chưa chọn vị trí trên bản đồ"}
          </p>
        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition disabled:opacity-50 mt-4"
        >
          {saving ? "Đang xử lý..." : "Gửi báo mèo"}
        </button>
      </form>
    </div>
  );
}
