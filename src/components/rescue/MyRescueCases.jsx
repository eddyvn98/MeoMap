export default function MyRescueCases({ loading, cases }) {
  return (
    <div className="space-y-4">
      {loading ? (
        <div className="p-4 text-center text-gray-600">
          <p>⏳ Đang tải ca của bạn...</p>
        </div>
      ) : cases.length === 0 ? (
        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg text-center">
          <p className="text-gray-900 font-semibold">📭 Bạn chưa nhận ca cứu hộ nào</p>
          <p className="text-sm text-gray-600 mt-2">
            Hãy quay lại tab "Ca cứu hộ khẩn cấp" để tìm và nhận ca!
          </p>
        </div>
      ) : (
        cases.map((caseItem) => {
          const isClosed = caseItem.status === "delivered";
          return (
            <div
              key={caseItem.id}
              className={`p-4 border rounded-lg transition ${
                isClosed ? "border-green-300 bg-green-50" : "border-orange-300 bg-orange-50 shadow-md"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">🚑 {caseItem.name}</h3>
                  <div className="mt-2">
                    {isClosed ? (
                      <span className="inline-block px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
                        ✅ Đã hoàn thành
                      </span>
                    ) : (
                      <span className="inline-block px-3 py-1 bg-orange-600 text-white rounded-full text-xs font-semibold animate-pulse">
                        ⏳ Đang tiến hành
                      </span>
                    )}
                  </div>
                </div>
                {caseItem.image_url && (
                  <img src={caseItem.image_url} alt={caseItem.name} className="w-20 h-20 rounded-lg object-cover" />
                )}
              </div>

              {caseItem.description && (
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">{caseItem.description}</p>
              )}

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="p-2 bg-orange-100 rounded border border-orange-300">
                  <p className="text-xs text-orange-700 font-semibold">💰 Hỗ trợ ban đầu</p>
                  <p className="text-lg font-bold text-orange-900">{(caseItem.bounty_amount || 0).toLocaleString()}đ</p>
                </div>
                <div className="p-2 bg-purple-100 rounded border border-purple-300">
                  <p className="text-xs text-purple-700 font-semibold">💜 Quyên góp</p>
                  <p className="text-lg font-bold text-purple-900">{(caseItem.total_donations || 0).toLocaleString()}đ</p>
                </div>
              </div>

              <button
                onClick={() => { window.location.href = `/pet-detail/${caseItem.id}`; }}
                className={`w-full px-4 py-2 rounded-lg font-semibold transition text-white ${
                  isClosed ? "bg-gray-500 hover:bg-gray-600" : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {isClosed ? "📋 Xem chi tiết" : "🎯 Vào Trung tâm cứu hộ"}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}
