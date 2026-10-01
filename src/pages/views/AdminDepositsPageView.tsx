/* eslint-disable no-unused-vars */


export default function AdminDepositsPageView({ scope }: { scope: any }) {
  const {
    hash,
    num,
    checkingAuth,
    setCheckingAuth,
    profile,
    setProfile,
    rows,
    setRows,
    loading,
    setLoading,
    updatingId,
    setUpdatingId,
    errorMsg,
    setErrorMsg,
    loadDeposits,
    handleUpdateStatus,
  } = scope;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">
        Quản lý cọc nhận mèo (Admin)
      </h1>

      {errorMsg && (
        <div className="mb-3 text-sm text-red-700 border border-red-300 rounded px-3 py-2">
          Lỗi: {errorMsg}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={loadDeposits}
          className="px-3 py-1 border rounded text-sm"
          disabled={loading}
        >
          {loading ? "Đang tải..." : "Tải lại danh sách"}
        </button>
        <span className="text-xs text-gray-500">
          Chỉ hiển thị các bản ghi status = 'pending'
        </span>
      </div>

      {loading && rows.length === 0 && (
        <div className="text-sm text-gray-600">Đang tải dữ liệu...</div>
      )}

      {!loading && rows.length === 0 && (
        <div className="text-sm text-gray-600">
          Hiện không có cọc nào đang chờ xác nhận.
        </div>
      )}

      {rows.length > 0 && (
        <div className="border rounded-lg overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Thời gian</th>
                <th className="px-3 py-2 text-left">Mã bài đăng</th>
                <th className="px-3 py-2 text-right">Số tiền (VND)</th>
                <th className="px-3 py-2 text-left">Uy tín người nhận</th>
                <th className="px-3 py-2 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isRowUpdating = updatingId === row.id;
                const code = getShortNumericCode(row.pet_id);
                const rep = row.reputation;
                return (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 align-top">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-mono text-sm font-semibold">#{code}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-right">
                      {row.amount.toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2 align-top text-sm">
                      {rep ? (
                        <>
                          <div>
                            Đã nhận mèo: <strong>{rep.total_trades}</strong> lần
                          </div>
                          <div>
                            OK: <strong>{rep.ok_trades}</strong> | Không OK:{" "}
                            <strong>{rep.bad_trades}</strong>
                          </div>
                        </>
                      ) : (
                        <span className="text-gray-500 text-xs">
                          Chưa có lịch sử đánh giá
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-center">
                      <div className="flex flex-col gap-1 items-center">
                        <button
                          className="px-3 py-1 rounded text-xs border border-green-700 text-green-700 hover:bg-green-50 disabled:opacity-50"
                          onClick={() =>
                            handleUpdateStatus(row, "confirmed")
                          }
                          disabled={isRowUpdating}
                        >
                          {isRowUpdating
                            ? "Đang xử lý..."
                            : "Đã nhận tiền (Confirm)"}
                        </button>
                        <button
                          className="px-3 py-1 rounded text-xs border border-red-700 text-red-700 hover:bg-red-50 disabled:opacity-50"
                          onClick={() =>
                            handleUpdateStatus(row, "cancelled")
                          }
                          disabled={isRowUpdating}
                        >
                          Huỷ / Sai thông tin
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
