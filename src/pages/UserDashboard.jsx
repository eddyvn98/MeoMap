import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { getUserWallet, formatVND } from "../services/walletService";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, loading: loadingUser } = useAuth();
  const [searchParams] = useSearchParams();

  // Read tab from URL parameter, default to "posts"
  const urlTab = searchParams.get("tab");
  const initialTab = ["posts", "deposits", "rescues", "reports", "wallet", "reputation"].includes(urlTab) ? urlTab : "posts";
  
  const [activeTab, setActiveTab] = useState(initialTab); // posts | deposits | rescues | wallet | reputation | reports

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

  // Tab 6: Báo của tôi (vai trò: finder - người tìm thấy)
  const [reports, setReports] = useState([]);
  const [reportPets, setReportPets] = useState({});
  const [loadingReports, setLoadingReports] = useState(false);

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
      console.log(data);
      
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
        .select("*, pets!inner(name, image_url, category)")
        .eq("receiver_id", user.id)
        .eq("pets.category", "adopt")
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

  // 3b) Load ca cứu hộ của tôi (vai trò: rescuer)
  useEffect(() => {
    if (!user || activeTab !== "rescues") return;

    const loadRescues = async () => {
      setLoadingRescues(true);
      setError("");

      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("rescuer_id", user.id)
        .eq("category", "rescue")
        .order("created_at", { ascending: false });

      if (error) {
        setError("Không tải được danh sách ca cứu hộ.");
        setRescues([]);
      } else {
        setRescues(data || []);
      }
      setLoadingRescues(false);
    };

    loadRescues();
  }, [user, activeTab]);

  // 4) Load ví của tôi
  useEffect(() => {
    if (!user || activeTab !== "wallet") return;

    const loadWallet = async () => {
      setLoadingWallet(true);
      setError("");

      // Load both wallet balances
      const walletResult = await getUserWallet(user.id);
      if (!walletResult.success) {
        setError("Không tải được thông tin ví.");
        setWalletCredit(0);
      } else {
        // Store total for backward compatibility, but should show both separately in UI
        setWalletCredit(walletResult.balance_coc + walletResult.balance_thuong);
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

  // 6) Load báo của tôi (sightings - người tìm thấy)
  useEffect(() => {
    if (!user || activeTab !== "reports") return;

    const loadReports = async () => {
      setLoadingReports(true);
      setError("");

      const { data, error: loadErr } = await supabase
        .from("adoption_activities")
        .select("id, pet_id, actor_id, activity_type, description, metadata, created_at")
        .eq("activity_type", "sighting")
        .eq("actor_id", user.id)
        .order("created_at", { ascending: false });

      if (loadErr) {
        setError("Lỗi tải danh sách báo: " + loadErr.message);
        setReports([]);
      } else {
        setReports(data || []);

        // Load pet info for each sighting
        const petIds = [...new Set(data.map((r) => r.pet_id))];
        if (petIds.length > 0) {
          const { data: petsData } = await supabase
            .from("pets")
            .select("id, name, image_url, status, bounty_amount")
            .in("id", petIds);

          if (petsData) {
            const petsMap = {};
            petsData.forEach((p) => {
              petsMap[p.id] = p;
            });
            setReportPets(petsMap);
          }
        }
      }
      setLoadingReports(false);
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

  const mapPetStatus = (status) => {
    switch (status) {
      case "available":
        return { label: "Đang tìm người nhận", color: "bg-green-100 text-green-700" };
      case "reserved":
        return { label: "Đã có cọc", color: "bg-yellow-100 text-yellow-700" };
      case "delivered":
        return { label: "Đã giao", color: "bg-blue-100 text-blue-700" };
      case "closed":
        return { label: "Đã đóng", color: "bg-gray-100 text-gray-600" };
      default:
        return { label: status || "Không rõ", color: "bg-gray-100 text-gray-600" };
    }
  };

  const groupedDeposits = useMemo(() => {
    const waitingPayment = [];
    const waitingDelivery = [];
    const history = [];

    deposits.forEach((d) => {
      const isWaitingPayment = (d.status === "pending" || d.status === "locked") && d.payment_status === "pending";
      const isWaitingDelivery = d.status === "confirmed" && d.delivery_status !== "delivered";

      if (isWaitingPayment) {
        waitingPayment.push(d);
      } else if (isWaitingDelivery) {
        waitingDelivery.push(d);
      } else {
        history.push(d);
      }
    });

    return { waitingPayment, waitingDelivery, history };
  }, [deposits]);

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
          { id: "rescues", label: "🚑 Ca cứu hộ của tôi (Người cứu)" },
          { id: "reports", label: "👀 Báo của tôi (Người tìm thấy)" },
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
            {posts.map((pet) => {
              const statusInfo = mapPetStatus(pet.status);
              return (
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
                    Loại: {
                      pet.category === "rescue" ? "🚑 Cứu hộ" :
                      pet.category === "lost" ? "🔍 Đi lạc" :
                      "🟢 Nhận nuôi"
                    }
                  </div>

                  <div className="text-gray-600 flex items-center gap-2">
                    <span>Trạng thái:</span>
                    <span className={`px-2 py-1 rounded text-[11px] font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
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
                    {pet.category === "adopt" && (
                      <button
                        className="flex-1 border rounded py-1 hover:bg-orange-50"
                        onClick={() => navigate(`/account/adopt/${pet.id}/applicants`)}
                      >
                        Người đăng ký
                      </button>
                    )}
                    {pet.category === "rescue" && (
                      <button
                        className="flex-1 border rounded py-1 hover:bg-orange-50 text-orange-600 font-medium"
                        onClick={() => navigate(`/pet/${pet.id}`)}
                      >
                        Xem ca cứu
                      </button>
                    )}
                    {pet.category === "lost" && (
                      <button
                        className="flex-1 border rounded py-1 hover:bg-red-50 text-red-600 font-medium"
                        onClick={() => navigate(`/pet/${pet.id}`)}
                      >
                        Xem báo tin
                      </button>
                    )}
                  </div>
                </div>
              </article>
              );
            })}
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

          <div className="space-y-4">
            {[
              { title: "Cọc đang chờ xác nhận tiền", list: groupedDeposits.waitingPayment },
              { title: "Đang chờ giao mèo", list: groupedDeposits.waitingDelivery },
              { title: "Lịch sử cọc", list: groupedDeposits.history },
            ].map((section) => (
              <div key={section.title} className="space-y-2">
                <div className="text-[11px] font-semibold text-gray-700">{section.title}</div>
                {section.list.length === 0 ? (
                  <div className="text-[11px] text-gray-500 bg-gray-50 border rounded p-2">Chưa có mục nào.</div>
                ) : (
                  <div className="space-y-2">
                    {section.list.map((deposit) => (
                      <div
                        key={deposit.id}
                        className="border rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition text-xs"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold">
                            {deposit.pets?.name || "Mèo"} (#{deposit.id.slice(0, 6)})
                          </div>
                          <span className="px-2 py-1 rounded text-[11px] font-medium bg-blue-100 text-blue-800">
                            {deposit.status} / {deposit.payment_status || "payment?"}
                          </span>
                        </div>
                        <div className="space-y-1 text-gray-600">
                          <div>Số tiền: {(deposit.amount || 0).toLocaleString()} đ</div>
                          <div>Trạng thái giao: {deposit.delivery_status || "Chưa giao"}</div>
                        </div>
                        {section.title === "Đang chờ giao mèo" && (
                          <button
                            className="mt-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
                            onClick={() => navigate(`/deposit/${deposit.id}/ticket`)}
                          >
                            Xem QR giao mèo →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: CA CỨU HỘ CỦA TÔI */}
      {activeTab === "rescues" && (
        <section>
          {loadingRescues && (
            <div className="text-xs text-gray-600">Đang tải danh sách…</div>
          )}

          {!loadingRescues && rescues.length === 0 && (
            <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded">
              Bạn chưa nhận ca cứu hộ nào. Hãy vào <strong>"🚑 Cứu hộ"</strong> để tìm và nhận ca.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rescues.map((rescue) => {
              const isClosed = rescue.status === "delivered";
              return (
                <article
                  key={rescue.id}
                  className={`border rounded-lg overflow-hidden text-xs bg-white shadow-sm hover:shadow-md transition ${
                    isClosed ? "opacity-75" : ""
                  }`}
                >
                  {rescue.image_url && (
                    <img
                      src={rescue.image_url}
                      alt={rescue.name || "pet"}
                      className="w-full h-32 object-cover"
                    />
                  )}

                  <div className="p-2 space-y-1">
                    <div className="font-semibold text-sm truncate">
                      🚑 {rescue.name || "Không đặt tên"}
                    </div>

                    <div className="text-gray-600">Loại: 🚑 Cứu hộ</div>

                    <div className="text-gray-600 flex items-center gap-2">
                      <span>Trạng thái:</span>
                      <span
                        className={`px-2 py-1 rounded text-[11px] font-medium ${
                          isClosed
                            ? "bg-green-100 text-green-700"
                            : "bg-orange-100 text-orange-700 animate-pulse"
                        }`}
                      >
                        {isClosed ? "✅ Đã hoàn thành" : "⏳ Đang tiến hành"}
                      </span>
                    </div>

                    {rescue.bounty_amount > 0 && (
                      <div className="text-gray-600">
                        💰 Hỗ trợ: {rescue.bounty_amount.toLocaleString()}đ
                      </div>
                    )}

                    {rescue.total_donations > 0 && (
                      <div className="text-gray-600">
                        💜 Quyên góp: {rescue.total_donations.toLocaleString()}đ
                      </div>
                    )}

                    <div className="text-[11px] text-gray-500">
                      {rescue.created_at
                        ? new Date(rescue.created_at).toLocaleString("vi-VN")
                        : "N/A"}
                    </div>

                    <div className="flex gap-1 mt-2">
                      <button
                        className={`flex-1 border rounded py-1 ${
                          isClosed
                            ? "hover:bg-gray-50 text-gray-600"
                            : "hover:bg-blue-50 text-blue-600 font-medium"
                        }`}
                        onClick={() => navigate(`/pet/${rescue.id}`)}
                      >
                        {isClosed ? "Xem chi tiết" : "🎯 Quản lý"}
                      </button>
                      <button
                        className="flex-1 border rounded py-1 hover:bg-orange-50"
                        onClick={() => navigate(`/edit-pet/${rescue.id}`)}
                      >
                        Sửa
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
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

      {/* TAB 6: BÁO CỦA TÔI (NGƯỜI TÌM THẤY) */}
      {activeTab === "reports" && (
        <section>
          {/* Info banner */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 mb-3">
            💡 <strong>Mẹo:</strong> Tất cả báo nhìn thấy của bạn hiển thị ở đây. Click "Xem bài đăng" để theo dõi tiến trình và liên hệ với chủ.
          </div>

          {loadingReports && (
            <div className="text-xs text-gray-600">Đang tải danh sách…</div>
          )}

          {!loadingReports && reports.length === 0 && (
            <div className="text-xs text-gray-500 p-4 bg-gray-50 rounded">
              Chưa có báo nào. Bạn có thể báo nhìn thấy mèo bị lạc trên bản đồ.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
            {reports.map((r) => {
              const pet = reportPets[r.pet_id];
              const isVerified = r.metadata?.verified === true;
              const isDelivered = pet?.status === "delivered";
              const bountyAmount = pet?.bounty_amount || 0;

              return (
                <article
                  key={r.id}
                  className={`border rounded-lg overflow-hidden text-xs shadow-sm ${
                    isDelivered && isVerified ? "bg-green-50" : "bg-white"
                  }`}
                >
                  <div className="flex gap-3 p-3">
                    {pet?.image_url && (
                      <img
                        src={pet.image_url}
                        alt={pet.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-sm">
                        {pet?.name || `Pet #${String(r.pet_id).slice(0, 8)}`}
                      </div>
                      <div className="text-gray-600 text-xs mt-1">
                        {new Date(r.created_at).toLocaleString("vi-VN")}
                      </div>
                      <div className="flex gap-2 mt-2">
                        {isVerified && (
                          <span className="inline-block px-2 py-0.5 bg-green-500 text-white rounded-full text-[10px] font-semibold">
                            ✓ Đã xác minh
                          </span>
                        )}
                        {isDelivered && isVerified && bountyAmount > 0 && (
                          <span className="inline-block px-2 py-0.5 bg-yellow-400 text-white rounded-full text-[10px] font-semibold">
                            🎁 {bountyAmount.toLocaleString()}đ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {r.description && (
                    <div className="px-3 pb-2 text-xs text-gray-700">
                      {r.description}
                    </div>
                  )}

                  {r.metadata?.location && (
                    <div className="px-3 pb-2 text-xs text-gray-600">
                      📍 {r.metadata.location}
                    </div>
                  )}

                  <div className="px-3 pb-3">
                    {isDelivered && isVerified ? (
                      <>
                        <div className="p-2 bg-green-100 border border-green-300 rounded-lg text-xs text-green-700 mb-2">
                          ✅ Hoàn thành!{" "}
                          {bountyAmount > 0
                            ? `Bạn đã nhận ${bountyAmount.toLocaleString()}đ thưởng.`
                            : "Cảm ơn bạn đã giúp đỡ!"}
                        </div>
                        <button
                          onClick={() => navigate(`/pet/${r.pet_id}`)}
                          className="w-full px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold"
                        >
                          📄 Xem bài đăng
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => navigate(`/pet/${r.pet_id}`)}
                          className="w-full px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold mb-2"
                        >
                          📄 Xem bài đăng & theo dõi
                        </button>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              window.dispatchEvent(
                                new CustomEvent("open-qr-modal", {
                                  detail: { petId: r.pet_id, mode: "lost" },
                                })
                              );
                            }}
                            className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold"
                          >
                            📱 Hiện QR
                          </button>
                          <button
                            onClick={() => {
                              if (
                                !confirm(
                                  "Bạn chắc chắn muốn Hủy nhận thưởng? Tiền sẽ về ví người đăng (không rút, chỉ đổi voucher)."
                                )
                              )
                                return;
                              window.dispatchEvent(
                                new CustomEvent("lost-cancel-reward", {
                                  detail: { petId: r.pet_id },
                                })
                              );
                            }}
                            className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
                          >
                            Hủy thưởng
                          </button>
                        </div>

                        <div className="text-xs text-gray-600 mt-2">
                          💡 Xem bài đăng để liên hệ chủ, theo dõi trạng thái xác minh và xác nhận giao mèo.
                        </div>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="pt-4 border-t mt-4 text-center text-[11px] text-gray-500">
        Pet Rescue • Trung tâm tài khoản
      </footer>
    </div>
  );
}
