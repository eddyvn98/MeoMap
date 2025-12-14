import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import {
  getUserWallet,
  getWalletTransactions,
  createWithdrawalRequest,
  getWithdrawalRequests,
  formatVND,
  getWithdrawalStatusDisplay
} from "../services/walletService";

export default function MyWalletPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balanceCoc, setBalanceCoc] = useState(0);
  const [balanceThuong, setBalanceThuong] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [selectedTab, setSelectedTab] = useState("overview"); // overview | transactions | withdrawal
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankName, setBankName] = useState("");
  const [withdrawalNote, setWithdrawalNote] = useState("");
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState("");

  // Transaction type labels
  const getTransactionTypeLabel = (type) => {
    const labels = {
      "increase_coc": "Nhận tiền cọc",
      "decrease_coc": "Trừ tiền cọc",
      "increase_thuong": "Nhận tiền thưởng",
      "decrease_thuong": "Rút tiền thưởng"
    };
    return labels[type] || type;
  };

  const getTransactionColor = (type) => {
    if (type?.includes("increase")) return "text-green-700";
    if (type?.includes("decrease")) return "text-red-600";
    return "text-gray-700";
  };

  const getTransactionSign = (type) => {
    if (type?.includes("increase")) return "+";
    if (type?.includes("decrease")) return "-";
    return "";
  };

  // Load wallet data
  const loadData = async () => {
    setLoading(true);
    setError("");

    // Check authentication
    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData.user) {
      setError("Bạn cần đăng nhập để xem ví.");
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    // Load wallet balances
    const walletResult = await getUserWallet(userId);
    if (!walletResult.success) {
      setError(walletResult.error);
      setLoading(false);
      return;
    }

    setBalanceCoc(walletResult.wallet.balance_coc);
    setBalanceThuong(walletResult.wallet.balance_thuong);

    // Load transactions
    const txResult = await getWalletTransactions(userId);
    if (txResult.success) {
      setTransactions(txResult.transactions);
    }

    // Load withdrawal requests
    const wrResult = await getWithdrawalRequests(userId);
    if (wrResult.success) {
      setWithdrawalRequests(wrResult.requests);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle withdrawal request
  const handleWithdrawalRequest = async () => {
    setWithdrawalError("");
    setWithdrawalLoading(true);

    const amount = parseInt(withdrawalAmount);
    if (!amount || amount < 10000) {
      setWithdrawalError("Số tiền rút tối thiểu là 10.000đ");
      setWithdrawalLoading(false);
      return;
    }

    if (amount > balanceThuong) {
      setWithdrawalError("Số dư Balance_THUONG không đủ");
      setWithdrawalLoading(false);
      return;
    }

    if (!bankAccount || !bankName) {
      setWithdrawalError("Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng");
      setWithdrawalLoading(false);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setWithdrawalError("Bạn cần đăng nhập");
      setWithdrawalLoading(false);
      return;
    }

    const result = await createWithdrawalRequest(
      authData.user.id,
      amount,
      bankAccount,
      bankName,
      withdrawalNote
    );

    if (!result.success) {
      setWithdrawalError(result.error);
    } else {
      // Reload data
      setWithdrawalAmount("");
      setBankAccount("");
      setBankName("");
      setWithdrawalNote("");
      
      // Reload balances and requests
      const walletResult = await getUserWallet(authData.user.id);
      if (walletResult.success) {
        setBalanceCoc(walletResult.wallet.balance_coc);
        setBalanceThuong(walletResult.wallet.balance_thuong);
      }
      
      const wrResult = await getWithdrawalRequests(authData.user.id);
      if (wrResult.success) {
        setWithdrawalRequests(wrResult.requests);
      }
      
      alert("Đã tạo yêu cầu rút tiền thành công! Admin sẽ xử lý trong vòng 24-48h.");
    }

    setWithdrawalLoading(false);
  };

  if (loading) {
    return <div className="p-4">Đang tải ví...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header with navigation */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Ví của tôi</h1>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
          >
            🔄 Làm mới
          </button>
          <button
            onClick={() => navigate("/account")}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            ← Tài khoản
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setSelectedTab("overview")}
          className={`px-4 py-2 font-medium ${
            selectedTab === "overview"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Tổng quan
        </button>
        <button
          onClick={() => setSelectedTab("transactions")}
          className={`px-4 py-2 font-medium ${
            selectedTab === "transactions"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Lịch sử giao dịch
        </button>
        <button
          onClick={() => setSelectedTab("withdrawal")}
          className={`px-4 py-2 font-medium ${
            selectedTab === "withdrawal"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Rút tiền thưởng
        </button>
      </div>

      {/* Overview Tab */}
      {selectedTab === "overview" && (
        <div className="space-y-6">
          {/* Balance Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Balance COC Card */}
            <div className="p-6 border-2 border-orange-300 rounded-lg bg-orange-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">💰</span>
                <h2 className="text-lg font-bold text-orange-800">Balance_COC</h2>
              </div>
              <div className="text-3xl font-bold text-orange-900 mb-2">
                {formatVND(balanceCoc)}
              </div>
              <div className="text-sm text-orange-700 space-y-1">
                <p>• Tiền cọc (Deposit Escrow)</p>
                <p>• <strong>KHÔNG RÚT ĐƯỢC</strong> về ngân hàng</p>
                <p>• Chỉ dùng cho cọc mới hoặc đổi voucher</p>
              </div>
            </div>

            {/* Balance THUONG Card */}
            <div className="p-6 border-2 border-green-300 rounded-lg bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎁</span>
                <h2 className="text-lg font-bold text-green-800">Balance_THUONG</h2>
              </div>
              <div className="text-3xl font-bold text-green-900 mb-2">
                {formatVND(balanceThuong)}
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>• Tiền thưởng (Rewards)</p>
                <p>• <strong>RÚT ĐƯỢC</strong> qua chuyển khoản ngân hàng</p>
                <p>• Nhận từ báo cáo, bounty, sự kiện</p>
              </div>
            </div>
          </div>

          {/* Policy Summary */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Chính sách ví</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Tiền cọc hoàn lại sẽ vào <strong>Balance_COC</strong> (không rút được)</li>
              <li>• Tiền thưởng từ hệ thống vào <strong>Balance_THUONG</strong> (rút được)</li>
              <li>• Rút tiền thưởng: tối thiểu 10.000đ, admin duyệt trong 24-48h</li>
              <li>• Phí rút tiền: 0đ (miễn phí hoàn toàn)</li>
            </ul>
          </div>

          {/* Recent Withdrawal Requests */}
          {withdrawalRequests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Yêu cầu rút tiền gần đây</h3>
              <div className="space-y-2">
                {withdrawalRequests.slice(0, 3).map((req) => {
                  const statusDisplay = getWithdrawalStatusDisplay(req.status);
                  return (
                    <div key={req.id} className="p-3 border rounded-lg bg-white">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{formatVND(req.amount)}</div>
                          <div className="text-xs text-gray-600">
                            {new Date(req.created_at).toLocaleString("vi-VN")}
                          </div>
                          <div className="text-xs text-gray-600">
                            {req.bank_name} - {req.bank_account}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusDisplay.color}`}>
                          {statusDisplay.icon} {statusDisplay.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {selectedTab === "transactions" && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Lịch sử giao dịch</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Chưa có giao dịch nào
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Thời gian</th>
                    <th className="px-3 py-2 text-left">Loại</th>
                    <th className="px-3 py-2 text-left">Nguồn</th>
                    <th className="px-3 py-2 text-right">Số tiền</th>
                    <th className="px-3 py-2 text-left">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs">
                        {new Date(tx.created_at).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium">
                        {getTransactionTypeLabel(tx.type)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          tx.source_type === "coc"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-green-100 text-green-800"
                        }`}>
                          {tx.source_type === "coc" ? "COC" : "THUONG"}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${getTransactionColor(tx.type)}`}>
                        {getTransactionSign(tx.type)}{formatVND(Math.abs(tx.amount))}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {tx.note || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Withdrawal Tab */}
      {selectedTab === "withdrawal" && (
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold mb-4">Rút tiền thưởng (Balance_THUONG)</h2>
          
          {/* Current Balance Display */}
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm text-green-700 mb-1">Số dư có thể rút</div>
            <div className="text-2xl font-bold text-green-900">
              {formatVND(balanceThuong)}
            </div>
          </div>

          {/* Withdrawal Form */}
          <div className="p-6 border rounded-lg bg-white space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Số tiền muốn rút (tối thiểu 10.000đ)
              </label>
              <input
                type="number"
                value={withdrawalAmount}
                onChange={(e) => setWithdrawalAmount(e.target.value)}
                placeholder="Ví dụ: 100000"
                className="w-full px-3 py-2 border rounded-lg"
                disabled={withdrawalLoading}
              />
                          {/* Quick amount buttons */}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {balanceThuong >= 50000 && (
                              <button
                                type="button"
                                onClick={() => setWithdrawalAmount("50000")}
                                className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                                disabled={withdrawalLoading}
                              >
                                50k
                              </button>
                            )}
                            {balanceThuong >= 100000 && (
                              <button
                                type="button"
                                onClick={() => setWithdrawalAmount("100000")}
                                className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                                disabled={withdrawalLoading}
                              >
                                100k
                              </button>
                            )}
                            {balanceThuong >= 200000 && (
                              <button
                                type="button"
                                onClick={() => setWithdrawalAmount("200000")}
                                className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                                disabled={withdrawalLoading}
                              >
                                200k
                              </button>
                            )}
                            {balanceThuong >= 500000 && (
                              <button
                                type="button"
                                onClick={() => setWithdrawalAmount("500000")}
                                className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                                disabled={withdrawalLoading}
                              >
                                500k
                              </button>
                            )}
                            {balanceThuong > 0 && (
                              <button
                                type="button"
                                onClick={() => setWithdrawalAmount(balanceThuong.toString())}
                                className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium"
                                disabled={withdrawalLoading}
                              >
                                Rút tất cả
                              </button>
                            )}
                          </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Số tài khoản ngân hàng
              </label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="Ví dụ: 0123456789"
                className="w-full px-3 py-2 border rounded-lg"
                disabled={withdrawalLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tên ngân hàng
              </label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Ví dụ: Vietcombank, ACB, Techcombank"
                className="w-full px-3 py-2 border rounded-lg"
                disabled={withdrawalLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Ghi chú (tùy chọn)
              </label>
              <textarea
                value={withdrawalNote}
                onChange={(e) => setWithdrawalNote(e.target.value)}
                placeholder="Thông tin bổ sung nếu có"
                className="w-full px-3 py-2 border rounded-lg"
                rows={2}
                disabled={withdrawalLoading}
              />
            </div>

            {withdrawalError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {withdrawalError}
              </div>
            )}

            <button
              onClick={handleWithdrawalRequest}
              disabled={withdrawalLoading}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {withdrawalLoading ? "Đang xử lý..." : "Tạo yêu cầu rút tiền"}
            </button>

            <div className="text-xs text-gray-600 space-y-1">
              <p>• Admin sẽ xem xét và chuyển khoản trong vòng 24-48 giờ</p>
              <p>• Miễn phí rút tiền (0đ phí xử lý)</p>
              <p>• Vui lòng kiểm tra thông tin tài khoản chính xác trước khi gửi</p>
            </div>
          </div>

          {/* Withdrawal History */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-3">Lịch sử yêu cầu rút tiền</h3>
            {withdrawalRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Chưa có yêu cầu rút tiền nào
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawalRequests.map((req) => {
                  const statusDisplay = getWithdrawalStatusDisplay(req.status);
                  return (
                    <div key={req.id} className="p-4 border rounded-lg bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-lg">{formatVND(req.amount)}</div>
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusDisplay.color}`}>
                          {statusDisplay.icon} {statusDisplay.text}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Ngân hàng: <strong>{req.bank_name}</strong></div>
                        <div>STK: <strong>{req.bank_account}</strong></div>
                        <div>Yêu cầu lúc: {new Date(req.created_at).toLocaleString("vi-VN")}</div>
                        {req.processed_at && (
                          <div>Xử lý lúc: {new Date(req.processed_at).toLocaleString("vi-VN")}</div>
                        )}
                        {req.admin_note && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                            Ghi chú admin: {req.admin_note}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
