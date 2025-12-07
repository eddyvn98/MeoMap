import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function WalletPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [walletCredit, setWalletCredit] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      // 1. Get current user
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr || !authData.user) {
        setError("Bạn cần đăng nhập.");
        setLoading(false);
        return;
      }

      setUser(authData.user);

      // 2. Get wallet credit
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("wallet_credit")
        .eq("id", authData.user.id)
        .single();

      if (profErr) {
        setError("Không tải được thông tin ví.");
        setLoading(false);
        return;
      }

      setWalletCredit(profile?.wallet_credit || 0);

      // 3. Get wallet transactions (loại refund_deposit)
      const { data: txs, error: txErr } = await supabase
        .from("wallet_transactions")
        .select("id, type, amount, deposit_id, note, created_at")
        .eq("user_id", authData.user.id)
        .eq("type", "refund_deposit")
        .order("created_at", { ascending: false });

      if (txErr) {
        setError("Không tải được lịch sử giao dịch.");
        setLoading(false);
        return;
      }

      setTransactions(txs || []);
      setLoading(false);
    };

    load();
  }, []);

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: "#dc2626" }}>{error}</p>
        <button onClick={() => navigate("/")} style={{ marginTop: 12 }}>
          Về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        ← Quay lại
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
        💳 Ví của tôi
      </h1>

      {/* Wallet Balance Card */}
      <div
        style={{
          padding: 24,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 12,
          color: "#fff",
          marginBottom: 24,
        }}
      >
        <p style={{ margin: "0 0 8px 0", fontSize: 14, opacity: 0.9 }}>
          Số dư trong ví
        </p>
        <h2 style={{ margin: 0, fontSize: 32, fontWeight: 700 }}>
          {walletCredit.toLocaleString("vi-VN")} đ
        </h2>
        <p style={{ margin: "8px 0 0 0", fontSize: 12, opacity: 0.8 }}>
          Tiền từ hoàn cọc
        </p>
      </div>

      {/* Transaction History */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          📋 Lịch sử hoàn cọc
        </h2>

        {transactions.length === 0 ? (
          <div
            style={{
              padding: 20,
              background: "#f3f4f6",
              borderRadius: 8,
              textAlign: "center",
              color: "#6b7280",
              fontSize: 14,
            }}
          >
            Chưa có giao dịch hoàn cọc nào.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {transactions.map((tx) => (
              <div
                key={tx.id}
                style={{
                  padding: 16,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  background: "#f9fafb",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0 0 4px 0", fontSize: 14, fontWeight: 600 }}>
                      Hoàn cọc
                    </p>
                    {tx.note && (
                      <p style={{ margin: "0 0 4px 0", fontSize: 12, color: "#6b7280" }}>
                        {tx.note}
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                      {new Date(tx.created_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#16a34a" }}>
                      +{tx.amount.toLocaleString("vi-VN")} đ
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div
        style={{
          marginTop: 32,
          padding: 16,
          background: "#fef3c7",
          border: "1px solid #fcd34d",
          borderRadius: 8,
          fontSize: 13,
          color: "#92400e",
          lineHeight: 1.6,
        }}
      >
        <strong>ℹ️ Thông tin:</strong>
        <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
          <li>Tiền trong ví là credit hoàn cọc từ các giao dịch bị hủy.</li>
          <li>Credit này có thể dùng để rút về tài khoản ngân hàng (tính năng sắp tới).</li>
          <li>Không có hạn sử dụng, credit sẽ luôn nằm trong ví cho đến khi bạn rút.</li>
        </ul>
      </div>

      <button
        onClick={() => navigate("/")}
        style={{
          marginTop: 24,
          padding: "12px 24px",
          background: "#3b82f6",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Về trang chủ
      </button>
    </div>
  );
}
