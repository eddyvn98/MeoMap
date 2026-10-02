export function AvailableRescueCard({ caseItem, onAccept }) {
  return (
    <div className="rounded-lg border border-gray-300 p-4 transition hover:shadow-lg">
      <div className="mb-3 flex items-start gap-3">
        {caseItem.image_url && (
          <img
            src={caseItem.image_url}
            alt={caseItem.name}
            className="h-16 w-16 rounded-lg object-cover"
          />
        )}
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">
            🚑 {caseItem.name}
          </h3>
          <p className="mt-1 text-xs font-semibold text-orange-600">
            🆘 KHẨN CẤP - Cần cứu ngay!
          </p>
          <p className="mt-1 text-xs text-gray-600">
            📍 {caseItem.district || "Chưa xác định"}
          </p>
        </div>
      </div>

      {caseItem.description && (
        <div className="mb-3 rounded border-l-4 border-blue-400 bg-blue-50 p-3">
          <p className="line-clamp-3 text-sm text-gray-700">
            {caseItem.description}
          </p>
        </div>
      )}

      {caseItem.profiles && (
        <div className="mb-3 rounded bg-gray-100 p-2 text-sm">
          <p className="text-gray-700">
            <strong>👤 Người đăng:</strong>{" "}
            {caseItem.profiles.name || "Ẩn danh"}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => onAccept(caseItem.id)}
        className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-3 text-center font-bold text-white transition hover:shadow-lg"
      >
        ✋ Nhận ca cứu hộ này
      </button>
    </div>
  );
}

export function MyRescueCard({ caseItem }) {
  const isClosed = caseItem.status === "delivered";

  return (
    <div
      className={`rounded-lg border p-4 transition ${
        isClosed
          ? "border-green-300 bg-green-50"
          : "border-orange-300 bg-orange-50 shadow-md"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">
            🚑 {caseItem.name}
          </h3>
          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white ${
              isClosed ? "bg-green-600" : "animate-pulse bg-orange-600"
            }`}
          >
            {isClosed ? "✅ Đã hoàn thành" : "⏳ Đang tiến hành"}
          </span>
        </div>
        {caseItem.image_url && (
          <img
            src={caseItem.image_url}
            alt={caseItem.name}
            className="h-20 w-20 rounded-lg object-cover"
          />
        )}
      </div>

      {caseItem.description && (
        <p className="mb-3 line-clamp-2 text-sm text-gray-700">
          {caseItem.description}
        </p>
      )}

      <div className="mb-3 rounded border bg-blue-50 p-2 text-xs text-blue-800">
        MeoMap không quản lý tiền. Bạn có thể tự đăng lời kêu gọi và thông tin
        chuyển khoản của mình trong ca cứu hộ.
      </div>

      <button
        type="button"
        onClick={() => {
          window.location.href = `/pet-detail/${caseItem.id}`;
        }}
        className={`w-full rounded-lg px-4 py-2 font-semibold text-white transition ${
          isClosed
            ? "bg-gray-500 hover:bg-gray-600"
            : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {isClosed ? "📋 Xem chi tiết" : "🎯 Vào Trung tâm cứu hộ"}
      </button>
    </div>
  );
}
