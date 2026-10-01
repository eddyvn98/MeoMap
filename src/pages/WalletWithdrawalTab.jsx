import { formatVND } from "../services/walletService";

export default function WalletWithdrawalTab({
  selectedTab, handleCreateWithdrawal, formError, amount, setAmount, formLoading,
  balanceThuong, quickAmounts, bankName, setBankName, bankAccount, setBankAccount,
  accountHolder, setAccountHolder,
}) {
  return (
    <>
      {/* Withdrawal Tab */}
      {selectedTab === "withdrawal" && (
      <div className="space-y-4">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded">
      <h3 className="font-semibold text-amber-900 mb-2">⚠️ Lưu ý</h3>
      <ul className="text-sm text-amber-800 space-y-1">
      <li>• Số tài khoản <strong>không thể thay đổi</strong> sau khi tạo lệnh</li>
      <li>• Chỉ có thể rút từ Balance THƯỞNG</li>
      <li>• Quá 24h chưa nhận được tiền? Mở tranh chấp ngay</li>
      </ul>
      </div>
      
      <form onSubmit={handleCreateWithdrawal} className="space-y-4">
      {formError && (
      <div className="p-4 bg-red-100 text-red-800 rounded">{formError}</div>
      )}
      
      <div>
      <label className="block text-sm font-medium mb-1">Số tiền rút (VND)</label>
      <input
      type="number"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      placeholder="Nhập số tiền"
      className="w-full px-3 py-2 border rounded-lg"
      disabled={formLoading}
      />
      <div className="text-xs text-gray-600 mt-1">Có thể rút: {formatVND(balanceThuong)}</div>
      </div>
      
      {/* Quick amount buttons */}
      <div className="grid grid-cols-4 gap-2">
      {quickAmounts.map((q) => (
      <button
      key={q}
      type="button"
      onClick={() => setAmount(q.toString())}
      disabled={q > balanceThuong || formLoading}
      className={`py-2 text-xs font-medium rounded ${
      q > balanceThuong
      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
      }`}
      >
      {formatVND(q).replace(" đ", "")}
      </button>
      ))}
      </div>
      <button
      type="button"
      onClick={() => setAmount(balanceThuong.toString())}
      disabled={balanceThuong === 0 || formLoading}
      className="w-full py-2 bg-blue-600 text-white rounded font-medium disabled:bg-gray-400"
      >
      Rút tất cả ({formatVND(balanceThuong)})
      </button>
      
      <div>
      <label className="block text-sm font-medium mb-1">Tên ngân hàng</label>
      <input
      type="text"
      value={bankName}
      onChange={(e) => setBankName(e.target.value)}
      placeholder="VCB, TCB, ACB, ..."
      className="w-full px-3 py-2 border rounded-lg"
      disabled={formLoading}
      />
      </div>
      
      <div>
      <label className="block text-sm font-medium mb-1">Số tài khoản</label>
      <input
      type="text"
      value={bankAccount}
      onChange={(e) => setBankAccount(e.target.value)}
      placeholder="Số tài khoản"
      className="w-full px-3 py-2 border rounded-lg"
      disabled={formLoading}
      />
      </div>
      
      <div>
      <label className="block text-sm font-medium mb-1">Tên chủ tài khoản</label>
      <input
      type="text"
      value={accountHolder}
      onChange={(e) => setAccountHolder(e.target.value)}
      placeholder="Tên đầy đủ"
      className="w-full px-3 py-2 border rounded-lg"
      disabled={formLoading}
      />
      </div>
      
      <button
      type="submit"
      disabled={formLoading}
      className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-400"
      >
      {formLoading ? "Đang tạo..." : "Tạo lệnh rút"}
      </button>
      </form>
      </div>
      )}
      
    </>
  );
}
