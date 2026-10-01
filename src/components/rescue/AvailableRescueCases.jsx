export default function AvailableRescueCases({ loading, cases, onAccept }) {
  return (
    <div className="space-y-4">
      {loading ? (
        <div className="p-4 text-center text-gray-600">
          <p>⏳ Đang tải danh sách ca cứu hộ...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg text-center">
          <p className="text-blue-900 font-semibold">✨ Không có ca cứu hộ khẩn cấp nào</p>
          <p className="text-sm text-blue-800 mt-2">
            Kiểm tra lại sau hoặc liên hệ với chủ mèo/chó qua các ca khác
          </p>
        </div>
      ) : (
        cases.map((caseItem) => (
          <div
            key={caseItem.id}
            className="p-4 border border-gray-300 rounded-lg hover:shadow-lg transition"
          >
            <div className="flex items-start gap-3 mb-3">
              {caseItem.image_url && (
                <img
                  src={caseItem.image_url}
                  alt={caseItem.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900">🚑 {caseItem.name}</h3>
                <p className="text-xs text-orange-600 font-semibold mt-1">🆘 KHẨN CẤP - Cần cứu ngay!</p>
                <p className="text-xs text-gray-600 mt-1">📍 {caseItem.district || "Chưa xác định"}</p>
              </div>
            </div>

            {caseItem.description && (
              <div className="mb-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                <p className="text-sm text-gray-700 line-clamp-3">{caseItem.description}</p>
              </div>
            )}

            {caseItem.bounty_amount > 0 && (
              <div className="mb-3 flex gap-2 items-center">
                <div className="p-3 bg-orange-100 rounded flex-1 border border-orange-300">
                  <p className="text-xs text-orange-700 font-semibold">💰 Hỗ trợ cứu hộ</p>
                  <p className="text-xl font-bold text-orange-900">{caseItem.bounty_amount.toLocaleString()}đ</p>
                </div>
                {caseItem.total_donations > 0 && (
                  <div className="p-3 bg-purple-100 rounded flex-1 border border-purple-300">
                    <p className="text-xs text-purple-700 font-semibold">💜 Quyên góp</p>
                    <p className="text-xl font-bold text-purple-900">{caseItem.total_donations.toLocaleString()}đ</p>
                  </div>
                )}
              </div>
            )}

            {caseItem.profiles && (
              <div className="mb-3 p-2 bg-gray-100 rounded text-sm">
                <p className="text-gray-700">
                  <strong>👤 Người đăng:</strong> {caseItem.profiles.name || "Ẩn danh"}
                </p>
              </div>
            )}

            <button
              onClick={() => onAccept(caseItem.id)}
              className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-bold hover:shadow-lg transition text-center"
            >
              ✋ Nhận ca cứu hộ này
            </button>
          </div>
        ))
      )}
    </div>
  );
}
