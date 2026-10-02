import { useEffect, useRef, useState } from "react";

const EMPTY_FORM = {
  name: "",
  category: "lost",
  description: "",
  photo: null,
  lat: null,
  lng: null,
  ward: "",
  street: "",
  houseNumber: "",
  contact: "",
  contactType: "phone",
};

export default function ReportPetModal({
  isOpen,
  onClose,
  onSubmit,
}) {
  const [locationMode, setLocationMode] = useState("auto");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const photoInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen || locationMode !== "auto") return;

    setLoadingLocation(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Trình duyệt không hỗ trợ định vị.");
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setFormData((current) => ({
          ...current,
          lat: coords.latitude,
          lng: coords.longitude,
        }));
        setLoadingLocation(false);
      },
      (error) => {
        console.error("Lỗi lấy vị trí:", error);
        setLocationError(
          "Không thể lấy vị trí. Vui lòng cấp quyền định vị hoặc nhập địa chỉ.",
        );
        setLoadingLocation(false);
      },
    );
  }, [isOpen, locationMode]);

  const update = (key, value) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setLocationMode("auto");
    setFormData(EMPTY_FORM);
    setLocationError("");
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const close = () => {
    onClose();
    resetForm();
  };

  const geocodeAddress = async () => {
    if (!formData.ward && !formData.street) {
      setLocationError("Vui lòng nhập ít nhất phường hoặc đường");
      return;
    }

    try {
      const query = [
        formData.houseNumber,
        formData.street,
        formData.ward,
        "Ho Chi Minh City, Vietnam",
      ]
        .filter(Boolean)
        .join(" ");

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      );
      const data = await response.json();

      if (!data?.length) {
        setLocationError("Không tìm thấy địa chỉ này. Vui lòng kiểm tra lại.");
        return;
      }

      const lat = Math.round(Number(data[0].lat) * 100) / 100;
      const lng = Math.round(Number(data[0].lon) * 100) / 100;
      setFormData((current) => ({ ...current, lat, lng }));
      setLocationError("");
    } catch (error) {
      console.error("Lỗi geocode:", error);
      setLocationError("Lỗi tìm kiếm địa chỉ. Vui lòng thử lại.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.lat || !formData.lng) {
      alert("Vui lòng chọn vị trí");
      return;
    }
    if (!formData.name.trim()) {
      alert("Vui lòng nhập Tiêu đề bài viết");
      return;
    }
    if (!formData.contact.trim()) {
      alert("Vui lòng nhập thông tin liên hệ");
      return;
    }

    await onSubmit(formData);
    resetForm();
  };

  if (!isOpen) return null;

  const inputClass =
    "w-full box-border rounded-md border border-gray-300 px-2.5 py-2.5 text-sm";

  return (
    <div
      className="fixed inset-0 z-[50000] flex items-center justify-center bg-black/50"
      onClick={close}
    >
      <div
        className="max-h-[90vh] w-[95%] max-w-[700px] overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 text-xl font-bold">Đăng case thú cưng</h2>
          <button
            type="button"
            onClick={close}
            className="border-0 bg-transparent p-0 text-2xl text-gray-500"
          >
            ✕
          </button>
        </div>

        <div className="mb-5 rounded-md border-l-4 border-amber-500 bg-amber-100 p-3 text-[13px] leading-6 text-amber-800">
          <strong>⚠️ Lưu ý bảo mật:</strong> Thông tin liên hệ của bạn sẽ được
          ẩn. Vị trí được làm tròn để hạn chế người xấu.
        </div>

        <form onSubmit={handleSubmit}>
          <Section title="Thông tin thú cưng">
            <Field label="Tiêu đề bài viết">
              <input
                className={inputClass}
                value={formData.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Ví dụ: Miu, Bé mèo xám..."
              />
            </Field>

            <Field label="Loại báo cáo">
              <select
                className={inputClass}
                value={formData.category}
                onChange={(event) => update("category", event.target.value)}
              >
                <option value="lost">🔴 Thú cưng bị mất</option>
                <option value="adopt">🟢 Tìm chủ nhân</option>
                <option value="rescue">🟠 Cần cứu hộ</option>
              </select>
            </Field>

            <div className="mb-4 rounded-lg bg-blue-50 p-2.5 text-xs text-blue-800">
              MeoMap không thu cọc, giữ thưởng hoặc nhận tiền quyên góp.
            </div>

            <Field label="Mô tả chi tiết">
              <textarea
                className={inputClass}
                rows="3"
                value={formData.description}
                onChange={(event) => update("description", event.target.value)}
                placeholder="Đặc điểm, nơi thất lạc, tình trạng..."
              />
            </Field>

            <Field label="Tải ảnh">
              <input
                ref={photoInputRef}
                className={inputClass}
                type="file"
                accept="image/*"
                onChange={(event) =>
                  update("photo", event.target.files?.[0] || null)
                }
              />
              {formData.photo && (
                <p className="mt-1 text-xs text-emerald-600">
                  ✓ {formData.photo.name}
                </p>
              )}
            </Field>
          </Section>

          <Section title="📞 Thông tin liên hệ">
            <div className="mb-3 flex gap-2">
              {[
                ["phone", "📱 Số điện thoại"],
                ["facebook", "f Facebook"],
                ["google", "G Google"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("contactType", value)}
                  className={`flex-1 rounded-md border-0 p-2 text-[13px] font-medium ${
                    formData.contactType === value
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Field label={contactLabel(formData.contactType)}>
              <input
                className={inputClass}
                type={formData.contactType === "phone" ? "tel" : "text"}
                value={formData.contact}
                onChange={(event) => update("contact", event.target.value)}
                placeholder={contactPlaceholder(formData.contactType)}
              />
            </Field>
          </Section>

          <Section title="📍 Vị trí báo cáo">
            {loadingLocation && (
              <Notice className="bg-indigo-100 text-indigo-700">
                ⏳ Đang lấy vị trí của bạn...
              </Notice>
            )}
            {locationError && (
              <Notice className="bg-red-100 text-red-600">
                ❌ {locationError}
              </Notice>
            )}
            {formData.lat && formData.lng && (
              <Notice className="bg-green-100 text-green-600">
                ✓ Vị trí: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
              </Notice>
            )}

            <div className="mb-4 flex gap-2">
              <ModeButton
                active={locationMode === "auto"}
                onClick={() => setLocationMode("auto")}
              >
                🎯 Vị trí hiện tại
              </ModeButton>
              <ModeButton
                active={locationMode === "manual"}
                onClick={() => setLocationMode("manual")}
              >
                ✍️ Nhập địa chỉ
              </ModeButton>
            </div>

            {locationMode === "auto" ? (
              <p className="text-[13px] text-gray-500">
                Vị trí hiện tại được lấy từ quyền định vị của trình duyệt.
              </p>
            ) : (
              <ManualAddress
                formData={formData}
                update={update}
                onSearch={geocodeAddress}
                inputClass={inputClass}
              />
            )}
          </Section>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-lg border-0 bg-blue-500 p-3 text-base font-medium text-white"
            >
              ✓ Đăng case
            </button>
            <button
              type="button"
              onClick={close}
              className="flex-1 rounded-lg border-0 bg-gray-200 p-3 text-base font-medium text-gray-700"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5 border-b border-gray-200 pb-5">
      <h3 className="mb-3 text-base font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function Notice({ className, children }) {
  return <div className={`mb-3 rounded-md p-3 text-[13px] ${className}`}>{children}</div>;
}

function ModeButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-md border-0 p-2.5 text-[13px] font-medium ${
        active ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function ManualAddress({ formData, update, onSearch, inputClass }) {
  return (
    <div>
      {[
        ["ward", "Phường/Xã", "Ví dụ: Phường 1"],
        ["street", "Đường/Phố", "Ví dụ: Nguyễn Huệ"],
        ["houseNumber", "Số nhà (không bắt buộc)", "Ví dụ: 123"],
      ].map(([key, label, placeholder]) => (
        <Field key={key} label={label}>
          <input
            className={inputClass}
            value={formData[key]}
            onChange={(event) => update(key, event.target.value)}
            placeholder={placeholder}
          />
        </Field>
      ))}

      <button
        type="button"
        onClick={onSearch}
        className="w-full rounded-md border-0 bg-emerald-500 p-2.5 text-[13px] font-medium text-white"
      >
        🔍 Tìm địa chỉ
      </button>
    </div>
  );
}

function contactLabel(type) {
  if (type === "phone") return "Số điện thoại";
  if (type === "facebook") return "Facebook URL hoặc ID";
  return "Google Email";
}

function contactPlaceholder(type) {
  if (type === "phone") return "Ví dụ: 0987654321";
  if (type === "facebook") return "Ví dụ: facebook.com/username";
  return "Ví dụ: your@gmail.com";
}
