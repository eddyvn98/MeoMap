import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const QRCodeComponent = lazy(() => 
  import('qrcode.react').then(mod => ({ default: mod.default }))
);
import {
  getUserWallet,
  getWithdrawalRequestsP2P,
  createWithdrawalRequestP2P,
  userConfirmReceiptP2P,
  userOpenDisputeP2P,
  formatVND,
  getWithdrawalStatusDisplayP2P,
  generateVietQRData
} from "../services/walletService";

export default function MyWalletPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balanceCoc, setBalanceCoc] = useState(0);
  const [balanceThuong, setBalanceThuong] = useState(0);
  const [withdrawals, setWithdrawals] = useState([]);
  const [selectedTab, setSelectedTab] = useState("overview"); // overview | withdrawal | history

  // Form state
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Dispute state
  const [disputeWithdrawalId, setDisputeWithdrawalId] = useState(null);
  const [disputeReason, setDisputeReason] = useState("");

  const quickAmounts = [50000, 100000, 200000, 500000];

  // Load wallet data
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        navigate("/login");
        return;
      }

      setUser(authData.user);

      // Get wallet
      const walletRes = await getUserWallet(authData.user.id);
      if (walletRes.success) {
        setBalanceCoc(walletRes.wallet.balance_coc);
        setBalanceThuong(walletRes.wallet.balance_thuong);
      }

      // Get withdrawals
      const withdrawalRes = await getWithdrawalRequestsP2P(authData.user.id);
      if (withdrawalRes.success) {
        setWithdrawals(withdrawalRes.requests);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Create withdrawal
  const handleCreateWithdrawal = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!amount || !bankName || !bankAccount || !accountHolder) {
      setFormError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    const amountNum = parseInt(amount);
    if (amountNum <= 0) {
      setFormError("Số tiền rút phải lớn hơn 0");
      return;
    }

    if (amountNum > balanceThuong) {
      setFormError(`Số dư không đủ. Hiện tại: ${formatVND(balanceThuong)}`);
      return;
    }

    try {
      setFormLoading(true);
      const result = await createWithdrawalRequestP2P(
        user.id,
        amountNum,
        bankName,
        bankAccount,
        accountHolder
      );

      if (result.success) {
        alert(`✅ Đã tạo lệnh rút tiền thành công!\n\nMã lệnh: ${result.orderCode}\n\nHãy ghi lại mã này. Admin sẽ xử lý trong vòng 24-48h.`);
        setAmount("");
        setBankName("");
        setBankAccount("");
        setAccountHolder("");
        setSelectedTab("history");
        await loadData();
      } else {
        setFormError(result.error || "Lỗi tạo lệnh rút");
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Confirm receipt
  const handleConfirmReceipt = async (withdrawalId) => {
    if (!window.confirm("Bạn đã nhận được tiền từ admin?")) return;

    try {
      const result = await userConfirmReceiptP2P(withdrawalId, user.id);
      if (result.success) {
        alert("✅ Đã xác nhận nhận tiền thành công!");
        await loadData();
      } else {
        alert("❌ Lỗi: " + (result.error || "Không thể xác nhận"));
      }
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    }
  };

  // Open dispute
  const handleOpenDispute = async (withdrawalId) => {
    if (!disputeReason.trim()) {
      alert("Vui lòng nhập lý do tranh chấp");
      return;
    }

    try {
      const result = await userOpenDisputeP2P(withdrawalId, user.id, disputeReason);
      if (result.success) {
        alert("✅ Đã mở tranh chấp. Admin sẽ kiểm tra và xử lý.");
        setDisputeWithdrawalId(null);
        setDisputeReason("");
        await loadData();
      } else {
        alert("❌ Lỗi: " + (result.error || "Không thể mở tranh chấp"));
      }
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    }
  };

  if (loading) return <div className="p-4 text-center">Đang tải...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Ví của tôi</h1>

      {error && <div className="p-4 bg-red-100 text-red-800 rounded mb-4">{error}</div>}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setSelectedTab("overview")}
          className={`px-4 py-2 font-medium ${
            selectedTab === "overview"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600"
          }`}
        >
          Tổng quan
        </button>
        <button
          onClick={() => setSelectedTab("withdrawal")}
          className={`px-4 py-2 font-medium ${
            selectedTab === "withdrawal"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600"
          }`}
        >
          Tạo lệnh rút
        </button>
        <button
          onClick={() => setSelectedTab("history")}
          className={`px-4 py-2 font-medium ${
            selectedTab === "history"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600"
          }`}
        >
          Lịch sử
        </button>
      </div>

      {/* Overview Tab */}
      {selectedTab === "overview" && (
        <div className="space-y-4">
          <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
            <div className="text-sm opacity-90">Số dư COC (Cọc)</div>
            <div className="text-3xl font-bold">{formatVND(balanceCoc)}</div>
            <div className="text-xs opacity-75 mt-2">Tiền cọc (không rút được)</div>
          </div>

          <div className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg">
            <div className="text-sm opacity-90">Số dư THƯỞNG (Rút được)</div>
            <div className="text-3xl font-bold">{formatVND(balanceThuong)}</div>
            <div className="text-xs opacity-75 mt-2">Tiền thưởng (có thể rút)</div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Cách hoạt động</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Balance COC:</strong> Tiền cọc khi nhận nuôi mèo. Không thể rút.</li>
              <li>• <strong>Balance THƯỞNG:</strong> Tiền thưởng từ hệ thống. Có thể rút.</li>
              <li>• Tạo lệnh rút → Admin chuyển tiền → Bạn xác nhận nhận tiền → Hoàn thành</li>
            </ul>
          </div>
        </div>
      )}

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

      {/* History Tab */}
      {selectedTab === "history" && (
        <div className="space-y-4">
          {withdrawals.length === 0 ? (
            <div className="p-4 text-center text-gray-600">Chưa có lệnh rút nào</div>
          ) : (
            withdrawals.map((wd) => {
              const status = getWithdrawalStatusDisplayP2P(wd.status);
              return (
                <div key={wd.id} className="p-4 border rounded-lg bg-white space-y-3">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-lg">{formatVND(wd.amount)}</div>
                      <div className="text-sm text-gray-600">Mã lệnh: <span className="font-mono font-bold text-gray-900">{wd.order_code}</span></div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${status.color}`}>
                      {status.icon} {status.text}
                    </span>
                  </div>

                  {/* Bank Info */}
                  <div className="p-3 bg-gray-50 rounded border border-gray-200">
                    <div className="text-sm space-y-1">
                      <div><strong>Ngân hàng:</strong> {wd.bank_name}</div>
                      <div><strong>STK:</strong> {wd.bank_account}</div>
                      <div><strong>Tên chủ:</strong> {wd.account_holder}</div>
                    </div>
                  </div>

                  {/* QR Code for Admin (info only) */}
                  {wd.status !== 'PENDING' && (
                    <div className="p-3 bg-blue-50 rounded border border-blue-200">
                      <div className="text-xs text-blue-700 mb-2">
                        <strong>Nội dung chuyển khoản để ghi vào:</strong><br />
                        <code className="bg-white px-2 py-1 rounded">{`PAY ${wd.order_code}`}</code>
                      </div>
                    </div>
                  )}

                  {/* Trace ID (Admin provided) */}
                  {wd.bank_trace_id && (
                    <div className="p-3 bg-green-50 rounded border border-green-200">
                      <div className="text-xs space-y-1 text-green-800">
                        <div><strong>Mã giao dịch:</strong> {wd.bank_trace_id}</div>
                        {wd.transfer_time && (
                          <div><strong>Thời gian:</strong> {new Date(wd.transfer_time).toLocaleString("vi-VN")}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Tạo lệnh: {new Date(wd.created_at).toLocaleString("vi-VN")}</div>
                    {wd.user_confirmed_at && (
                      <div className="text-green-700">✅ Xác nhận nhận tiền: {new Date(wd.user_confirmed_at).toLocaleString("vi-VN")}</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    {wd.status === "AWAITING_USER_CONFIRMATION" && (
                      <>
                        <button
                          onClick={() => handleConfirmReceipt(wd.id)}
                          className="w-full py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700"
                        >
                          ✅ Đã nhận tiền
                        </button>
                        {!disputeWithdrawalId && (
                          <button
                            onClick={() => setDisputeWithdrawalId(wd.id)}
                            className="w-full py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700"
                          >
                            ⚠️ Mở tranh chấp
                          </button>
                        )}
                      </>
                    )}

                    {/* Dispute Form */}
                    {disputeWithdrawalId === wd.id && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded space-y-2">
                        <textarea
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          placeholder="Mô tả lý do tranh chấp..."
                          className="w-full px-3 py-2 border rounded text-sm"
                          rows="3"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenDispute(wd.id)}
                            className="flex-1 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700"
                          >
                            Gửi tranh chấp
                          </button>
                          <button
                            onClick={() => {
                              setDisputeWithdrawalId(null);
                              setDisputeReason("");
                            }}
                            className="flex-1 py-2 bg-gray-400 text-white rounded font-medium hover:bg-gray-500"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Admin Notes */}
                  {wd.admin_notes && (
                    <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                      <div className="text-xs text-yellow-800">
                        <strong>Ghi chú từ admin:</strong><br />
                        {wd.admin_notes}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
