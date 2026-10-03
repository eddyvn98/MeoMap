export function Section({ title, children }) {
  return (
    <div className="mb-5 border-b border-gray-200 pb-5">
      <h3 className="mb-3 text-base font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export function Notice({ className, children }) {
  return <div className={`mb-3 rounded-md p-3 text-[13px] ${className}`}>{children}</div>;
}

export function ModeButton({ active, onClick, children }) {
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

export function ManualAddress({ formData, update, onSearch, inputClass }) {
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

export function contactLabel(type) {
  if (type === "phone") return "Số điện thoại";
  if (type === "facebook") return "Facebook URL hoặc ID";
  return "Email";
}

export function contactPlaceholder(type) {
  if (type === "phone") return "Ví dụ: 0987654321";
  if (type === "facebook") return "Ví dụ: facebook.com/username";
  return "Ví dụ: ten@example.com";
}


export function PetAttributes({ formData, update, inputClass }) {
  return (
    <>
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Loài">
          <select
            className={inputClass}
            value={formData.animal}
            onChange={(event) => update("animal", event.target.value)}
          >
            <option value="cat">Mèo</option>
            <option value="dog">Chó</option>
          </select>
        </Field>

        <Field label="Màu lông">
          <select
            className={inputClass}
            value={formData.color}
            onChange={(event) => update("color", event.target.value)}
          >
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
    </>
  );
}
