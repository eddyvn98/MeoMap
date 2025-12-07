import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function MyWalletPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [walletCredit, setWalletCredit] = useState(0);
  const [transactions, setTransactions] = useState([]);

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

      // 3. lấy lịch sử từ wallet_transactions (chỉ refund_deposit)
      const { data: txs, error: txErr } = await supabase
        .from("wallet_transactions")
        .select("id, deposit_id, amount, type, note, created_at")
        .eq("user_id", userId)
        .eq("type", "refund_deposit")
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

      {/* Lịch sử hoàn cọc */}
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lịch sử hoàn cọc vào ví</h2>
        <span className="text-xs text-gray-500">
          Chỉ hiển thị giao dịch loại <strong>refund_deposit</strong>
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="text-sm text-gray-600">
          Chưa có giao dịch hoàn cọc nào.
        </div>
      ) : (
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-1 text-left">Thời gian</th>
              <th className="px-2 py-1 text-right">Số tiền</th>
              <th className="px-2 py-1 text-left">Giao dịch liên quan</th>
              <th className="px-2 py-1 text-left">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-t align-top">
                <td className="px-2 py-1">
                  {new Date(tx.created_at).toLocaleString()}
                </td>
                <td className="px-2 py-1 text-right text-green-700 font-semibold">
                  +{tx.amount.toLocaleString("vi-VN")} đ
                </td>
                <td className="px-2 py-1">
                  {tx.deposit_id ? (
                    <span className="font-mono text-xs">
                      Cọc #{tx.deposit_id.slice(0, 6)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Không rõ</span>
                  )}
                </td>
                <td className="px-2 py-1 text-xs text-gray-700">
                  {tx.note || "Hoàn cọc do hủy giao mèo."}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
