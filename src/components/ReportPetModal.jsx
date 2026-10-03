import { useEffect, useRef, useState } from "react";
import {
  Field,
  ManualAddress,
  ModeButton,
  Notice,
  PetAttributes,
  Section,
  contactLabel,
  contactPlaceholder,
} from "./report/ReportPetFields";
import {
  EMPTY_REPORT_FORM,
  geocodeReportAddress,
  roundReportCoordinate,
} from "./report/reportPetModel";

export default function ReportPetModal({ isOpen, onClose, onSubmit }) {
  const [locationMode, setLocationMode] = useState("auto");
  const [formData, setFormData] = useState(EMPTY_REPORT_FORM);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
          lat: roundReportCoordinate(coords.latitude),
          lng: roundReportCoordinate(coords.longitude),
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
    setFormData(EMPTY_REPORT_FORM);
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
      const location = await geocodeReportAddress(formData);
      if (!location) {
        setLocationError("Không tìm thấy địa chỉ này. Vui lòng kiểm tra lại.");
        return;
      }
      setFormData((current) => ({ ...current, ...location }));
      setLocationError("");
    } catch (error) {
      console.error("Lỗi geocode:", error);
      setLocationError("Lỗi tìm kiếm địa chỉ. Vui lòng thử lại.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!Number.isFinite(formData.lat) || !Number.isFinite(formData.lng)) {
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

    setSubmitting(true);
    try {
      const success = await onSubmit(formData);
      if (success !== false) resetForm();
    } finally {
      setSubmitting(false);
    }
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
          <strong>⚠️ Lưu ý bảo mật:</strong> Thông tin liên hệ chỉ hiển thị
          trong trang chi tiết case. Vị trí được làm tròn để hạn chế lộ vị trí
          quá chính xác.
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

            <PetAttributes
              formData={formData}
              update={update}
              inputClass={inputClass}
            />

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
                accept="image/jpeg,image/png,image/webp,image/gif"
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
                ["email", "✉️ Email"],
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
            {Number.isFinite(formData.lat) && Number.isFinite(formData.lng) && (
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
              disabled={submitting}
              className="flex-1 rounded-lg border-0 bg-blue-500 p-3 text-base font-medium text-white disabled:opacity-50"
            >
              {submitting ? "Đang đăng..." : "✓ Đăng case"}
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
