import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function MyWalletPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletCredit, setWalletCredit] = useState(0);
  const [transactions, setTransactions] = useState([]);

  // Hàm để lấy nhãn loại giao dịch
  const getTransactionTypeLabel = (type) => {
    const labels = {
      "refund_deposit": "Hoàn cọc",
      "use_for_deposit": "Dùng ví để cọc",
      "top_up": "Nạp ví",
      "withdrawal": "Rút tiền"
    };
    return labels[type] || type;
  };

  // Hàm để lấy màu theo loại giao dịch
  const getTransactionColor = (type) => {
    if (type === "refund_deposit") return "text-green-700";
    if (type === "use_for_deposit") return "text-orange-600";
    if (type === "top_up") return "text-blue-700";
    if (type === "withdrawal") return "text-red-700";
    return "text-gray-700";
  };

  // Hàm để lấy dấu (+/-) theo loại
  const getTransactionSign = (type) => {
    if (type === "use_for_deposit" || type === "withdrawal") return "-";
    return "+";
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      // 1. check login
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) {
        setError("Bạn cần đăng nhập để xem ví.");
        setLoading(false);
        return;
      }

      const userId = authData.user.id;

      // 2. lấy wallet_credit
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("wallet_credit")
        .eq("id", userId)
        .single();

      if (profErr || !profile) {
        setError("Không lấy được thông tin ví.");
        setLoading(false);
        return;
      }

      setWalletCredit(profile.wallet_credit || 0);

      // 3. lấy lịch sử từ wallet_transactions (tất cả loại: refund_deposit, use_for_deposit)
      const { data: txs, error: txErr } = await supabase
        .from("wallet_transactions")
        .select("id, deposit_id, amount, type, note, created_at")
        .eq("user_id", userId)
        .in("type", ["refund_deposit", "use_for_deposit"])
        .order("created_at", { ascending: false });

      if (txErr) {
        setError("Không lấy được lịch sử ví: " + txErr.message);
        setTransactions([]);
        setLoading(false);
        return;
      }

      setTransactions(txs || []);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return <div className="p-4">Đang tải ví...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Ví của tôi</h1>

      {/* Số dư hiện tại */}
      <div className="mb-4 p-4 border rounded bg-gray-50">
        <div className="text-sm text-gray-600 mb-1">Số dư ví hiện tại</div>
        <div className="text-2xl font-bold">
          {walletCredit.toLocaleString("vi-VN")} đ
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Đây là credit nhận được từ các cọc bị hủy (không rút về ngân hàng, chỉ dùng cho các giao dịch sau).
        </div>
      </div>

      {/* Lịch sử giao dịch ví */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lịch sử giao dịch ví</h2>
        <span className="text-xs text-gray-500">
          Tất cả loại giao dịch (hoàn cọc + dùng ví)
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="text-sm text-gray-600">
          Chưa có giao dịch nào.
        </div>
      ) : (
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1 text-left">Thời gian</th>
              <th className="px-2 py-1 text-left">Loại giao dịch</th>
              <th className="px-2 py-1 text-right">Số tiền</th>
              <th className="px-2 py-1 text-left">Liên quan</th>
              <th className="px-2 py-1 text-left">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-t align-top">
                <td className="px-2 py-1 text-xs">
                  {new Date(tx.created_at).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-xs font-medium">
                  {getTransactionTypeLabel(tx.type)}
                </td>
                <td className={`px-2 py-1 text-right font-semibold ${getTransactionColor(tx.type)}`}>
                  {getTransactionSign(tx.type)}{Math.abs(tx.amount).toLocaleString("vi-VN")} đ
                </td>
                <td className="px-2 py-1">
                  {tx.deposit_id ? (
                    <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                      Cọc #{tx.deposit_id.slice(0, 6)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">-</span>
                  )}
                </td>
                <td className="px-2 py-1 text-xs text-gray-600">
                  {tx.note || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
