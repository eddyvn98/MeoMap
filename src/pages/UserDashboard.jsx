import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { getUserWallet, formatVND } from "../services/walletService";
import UserDashboardView from "./UserDashboardView";

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

  const viewScope = { navigate, user, loadingUser, searchParams, urlTab, initialTab, activeTab, setActiveTab, posts, setPosts, loadingPosts, setLoadingPosts, deposits, setDeposits, loadingDeposits, setLoadingDeposits, rescues, setRescues, loadingRescues, setLoadingRescues, walletCredit, setWalletCredit, walletTransactions, setWalletTransactions, loadingWallet, setLoadingWallet, reputation, setReputation, loadingReputation, setLoadingReputation, reports, setReports, reportPets, setReportPets, loadingReports, setLoadingReports, error, setError, mapPetStatus, groupedDeposits };
  return <UserDashboardView scope={viewScope} />;
}
