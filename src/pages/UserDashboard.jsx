import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, loading: loadingUser } = useAuth();

  const [activeTab, setActiveTab] = useState("posts"); // posts | deposits | rescues | wallet | reputation

  // Tab 1: Bài đăng của tôi (vai trò: owner)
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Tab 2: Cọc & giao dịch của tôi (vai trò: receiver)
  const [deposits, setDeposits] = useState([]);
  const [loadingDeposits, setLoadingDeposits] = useState(false);

  // Tab 3: Ca cứu hộ của tôi (vai trò: rescuer)
  const [rescues, setRescues] = useState([]);
  const [loadingRescues, setLoadingRescues] = useState(false);

  // Tab 4: Ví của tôi
  const [walletCredit, setWalletCredit] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Tab 5: Uy tín của tôi
  const [reputation, setReputation] = useState(null);
  const [loadingReputation, setLoadingReputation] = useState(false);

  const [error, setError] = useState("");

  // 2) Load bài đăng (vai trò: owner)
  useEffect(() => {
    if (!user || activeTab !== "posts") return;

    const loadPosts = async () => {
      setLoadingPosts(true);
      setError("");

      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setError("Không tải được danh sách bài đăng.");
        setPosts([]);
      } else {
        setPosts(data || []);
      }
      setLoadingPosts(false);
    };

    loadPosts();
  }, [user, activeTab]);

  // 3) Load cọc & giao dịch (vai trò: receiver)
  useEffect(() => {
    if (!user || activeTab !== "deposits") return;

    const loadDeposits = async () => {
      setLoadingDeposits(true);
      setError("");

      const { data, error } = await supabase
        .from("deposits")
        .select("*, pets(name, image_url, category)")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setError("Không tải được danh sách cọc.");
        setDeposits([]);
      } else {
        setDeposits(data || []);
      }
      setLoadingDeposits(false);
    };

    loadDeposits();
  }, [user, activeTab]);

  // 4) Load ví của tôi
  useEffect(() => {
    if (!user || activeTab !== "wallet") return;

    const loadWallet = async () => {
      setLoadingWallet(true);
      setError("");

      // Lấy wallet credit
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("wallet_credit")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setError("Không tải được thông tin ví.");
        setWalletCredit(0);
      } else {
        setWalletCredit(profile?.wallet_credit || 0);
      }

      // Lấy wallet transactions
      const { data: txs, error: txError } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (txError) {
        setWalletTransactions([]);
      } else {
        setWalletTransactions(txs || []);
      }

      setLoadingWallet(false);
    };

    loadWallet();
  }, [user, activeTab]);

  // 5) Load uy tín của tôi
  useEffect(() => {
    if (!user || activeTab !== "reputation") return;

    const loadReputation = async () => {
      setLoadingReputation(true);
      setError("");

      const { data, error } = await supabase
        .from("user_reputation")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        setReputation(null);
      } else {
        setReputation(data);
      }
      setLoadingReputation(false);
    };

    loadReputation();
  }, [user, activeTab]);

  if (loadingUser) {
    return <div className="p-4 text-sm">Đang kiểm tra đăng nhập…</div>;
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {/* HEADER */}
      <header className="flex items-center justify-between border-b pb-2 mb-2">
        <div>
          <div className="font-bold text-lg">Trung tâm tài khoản</div>
          <div className="text-xs text-gray-600">
            Tài khoản: {user?.email}
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            className="px-3 py-1 border rounded hover:bg-gray-100"
            onClick={() => navigate("/")}
          >
            Về trang chủ
          </button>
          <button
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => navigate("/report")}
          >
            Đăng bài mới
          </button>
        </div>
      </header>

      {/* TABS NAVIGATION */}
      <div className="flex gap-2 flex-wrap text-xs border-b">
        {[
          { id: "posts", label: "📝 Bài đăng của tôi (Người đăng)" },
          { id: "deposits", label: "💰 Cọc & giao dịch của tôi (Người nhận)" },
          { id: "wallet", label: "💳 Ví của tôi" },
          { id: "reputation", label: "⭐ Uy tín của tôi" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-orange-500 text-orange-600 bg-orange-50"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          {error}
        </div>
      )}

      {/* TAB CONTENT */}

      {/* TAB 1: BÀI ĐĂNG CỦA TÔI */}
      {activeTab === "posts" && (
        <section>
          {loadingPosts && (
            <div className="text-xs text-gray-600">Đang tải danh sách…</div>
          )}

          {!loadingPosts && posts.length === 0 && (
            <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded">
              Bạn chưa có bài đăng nào. Hãy bấm "Đăng bài mới".
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((pet) => (
              <article
                key={pet.id}
                className="border rounded-lg overflow-hidden text-xs bg-white shadow-sm hover:shadow-md transition"
              >
                {pet.image_url && (
                  <img
                    src={pet.image_url}
                    alt={pet.name || "pet"}
                    className="w-full h-32 object-cover"
                  />
                )}

                <div className="p-2 space-y-1">
                  <div className="font-semibold text-sm truncate">
                    {pet.name || "Không đặt tên"}
                  </div>

                  <div className="text-gray-600">
                    Loại:{" "}
                    {pet.category === "lost"
                      ? "🔴 Mèo đi lạc"
                      : pet.category === "adopt"
                      ? "🟢 Nhận nuôi"
                      : pet.category === "rescue"
                      ? "🟠 Cứu hộ"
                      : "Khác"}
                  </div>

                  <div className="text-gray-600">
                    Trạng thái: {pet.status || "unknown"}
                  </div>

                  <div className="text-[11px] text-gray-500">
                    {pet.created_at
                      ? new Date(pet.created_at).toLocaleString("vi-VN")
                      : "N/A"}
                  </div>

                  <div className="flex gap-1 mt-2">
                    <button
                      className="flex-1 border rounded py-1 hover:bg-blue-50"
                      onClick={() => navigate(`/pet/${pet.id}`)}
                    >
                      Xem
                    </button>
                    <button
                      className="flex-1 border rounded py-1 hover:bg-gray-50"
                      onClick={() => navigate(`/edit-pet/${pet.id}`)}
                    >
                      Sửa
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* TAB 2: CỌC & GIAO DỊCH CỦA TÔI */}
      {activeTab === "deposits" && (
        <section>
          {loadingDeposits && (
            <div className="text-xs text-gray-600">Đang tải danh sách…</div>
          )}

          {!loadingDeposits && deposits.length === 0 && (
            <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded">
              Bạn chưa đặt cọc bất kỳ mèo nào.
            </div>
          )}

          <div className="space-y-2">
            {deposits.map((deposit) => (
              <div
                key={deposit.id}
                className="border rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition text-xs"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold">
                    {deposit.pets?.name || "Mèo"} (#{deposit.id.slice(0, 6)})
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-[11px] font-medium ${
                      deposit.status === "locked"
                        ? "bg-yellow-100 text-yellow-800"
                        : deposit.status === "pending"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {deposit.status === "locked"
                      ? "Chờ admin"
                      : deposit.status === "pending"
                      ? "Chờ xác nhận"
                      : "Đã xác nhận"}
                  </span>
                </div>
                <div className="space-y-1 text-gray-600">
                  <div>Số tiền: {(deposit.amount || 0).toLocaleString()} đ</div>
                  <div>
                    Trạng thái giao:{" "}
                    {deposit.delivery_status || "Chưa giao"}
                  </div>
                </div>
                <button
                  className="mt-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
                  onClick={() => navigate(`/deposits`)}
                >
                  Xem chi tiết →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: CA CỨU HỘ CỦA TÔI */}
      {activeTab === "rescues" && (
        <section className="p-4 bg-gray-50 rounded text-xs text-gray-600">
          Chưa có ca cứu hộ. Tính năng này sẽ được bổ sung sau.
        </section>
      )}

      {/* TAB 4: VÍ CỦA TÔI */}
      {activeTab === "wallet" && (
        <section>
          {loadingWallet && (
            <div className="text-xs text-gray-600">Đang tải thông tin…</div>
          )}

          {!loadingWallet && (
            <>
              <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white mb-4">
                <div className="text-xs opacity-90">Số dư ví</div>
                <div className="text-2xl font-bold">
                  {walletCredit.toLocaleString()} đ
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm mb-2">
                  Lịch sử giao dịch
                </h3>
                {walletTransactions.length === 0 ? (
                  <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                    Chưa có giao dịch nào.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {walletTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex justify-between items-center p-2 border rounded text-xs"
                      >
                        <div>
                          <div className="font-medium">{tx.type}</div>
                          <div className="text-gray-500">
                            {tx.created_at
                              ? new Date(tx.created_at).toLocaleString("vi-VN")
                              : ""}
                          </div>
                        </div>
                        <div
                          className={`font-semibold ${
                            tx.amount > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} đ
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}

      {/* TAB 5: UY TÍN CỦA TÔI */}
      {activeTab === "reputation" && (
        <section>
          {loadingReputation && (
            <div className="text-xs text-gray-600">Đang tải thông tin…</div>
          )}

          {!loadingReputation && reputation ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 border rounded-lg bg-blue-50">
                <div className="text-xs text-gray-600">Tổng giao dịch</div>
                <div className="text-2xl font-bold text-blue-600">
                  {reputation.total_trades || 0}
                </div>
              </div>
              <div className="p-3 border rounded-lg bg-green-50">
                <div className="text-xs text-gray-600">Giao dịch tốt</div>
                <div className="text-2xl font-bold text-green-600">
                  {reputation.ok_trades || 0}
                </div>
              </div>
              <div className="p-3 border rounded-lg bg-red-50">
                <div className="text-xs text-gray-600">Giao dịch xấu</div>
                <div className="text-2xl font-bold text-red-600">
                  {reputation.bad_trades || 0}
                </div>
              </div>
              <div className="p-3 border rounded-lg bg-yellow-50">
                <div className="text-xs text-gray-600">Điểm uy tín</div>
                <div className="text-2xl font-bold text-yellow-600">
                  {reputation.reputation_score || 0}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded">
              Chưa có đánh giá uy tín. Hoàn thành một số giao dịch để nhận đánh
              giá.
            </div>
          )}
        </section>
      )}

      {/* FOOTER */}
      <footer className="pt-4 border-t mt-4 text-center text-[11px] text-gray-500">
        Pet Rescue • Trung tâm tài khoản
      </footer>
    </div>
  );
}
