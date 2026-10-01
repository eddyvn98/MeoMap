import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { formatVND } from "../services/walletService";
import AdminTopupsPageView from './views/AdminTopupsPageView';

export default function AdminTopupsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [topups, setTopups] = useState([]);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [submitting, setSubmitting] = useState(null);

  // Load data
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

      // Check admin role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profile?.role !== "admin") {
        setError("Bạn không có quyền truy cập trang này");
        setIsAdmin(false);
        return;
      }

      setIsAdmin(true);

      // Load topup requests with user info (using RPC to bypass RLS)
      const statusParam = filterStatus === "all" ? null : filterStatus;
      
      const { data, error: topupError } = await supabase.rpc("admin_get_all_topup_requests", {
        p_status: statusParam,
        p_limit: 100,
        p_offset: 0,
      });

      if (topupError) {
        setError(topupError.message);
        setTopups([]);
      } else {
        // Transform data to match expected format
        const transformedData = (data || []).map(item => ({
          ...item,
          user: {
            id: item.user_id,
            display_name: item.user_display_name,
            email: item.user_email,
          }
        }));
        setTopups(transformedData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  // Accept topup (confirm payment)
  const handleAccept = async (topup) => {
    if (!user) return;

    const confirmMsg = `Xác nhận nạp tiền cho user ${topup.user?.display_name || topup.user?.email}?\n\nSố tiền: ${formatVND(topup.amount)}\nMã giao dịch: ${topup.order_code}`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      setSubmitting(topup.id);

      // Call RPC to confirm topup
      const { data, error } = await supabase.rpc("confirm_topup_payment", {
        p_order_code: topup.order_code,
        p_user_id: topup.user_id,
        p_transaction_id: `ADMIN_CONFIRM_${Date.now()}`,
        p_payment_description: `Admin xác nhận nạp tiền - ${topup.order_code}`,
      });

      if (error) {
        alert("❌ Lỗi: " + error.message);
      } else if (data && data.success === false) {
        alert("❌ Lỗi: " + (data.error || "Không thể xác nhận"));
      } else {
        alert("✅ Đã xác nhận nạp tiền thành công!");
        await loadData();
      }
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setSubmitting(null);
    }
  };

  // Reject topup
  const handleReject = async (topup) => {
    const reason = window.prompt("Lý do từ chối:");
    if (!reason) return;

    try {
      setSubmitting(topup.id);

      const { error } = await supabase
        .from("topup_requests")
        .update({
          status: "failed",
          notes: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", topup.id);

      if (error) {
        alert("❌ Lỗi: " + error.message);
      } else {
        alert("✅ Đã từ chối yêu cầu nạp tiền");
        await loadData();
      }
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setSubmitting(null);
    }
  };

  const getStatusDisplay = (status) => {
    const statusMap = {
      pending: { text: "Chờ xác nhận", color: "bg-yellow-100 text-yellow-800", icon: "⏳" },
      processing: { text: "Đang xử lý", color: "bg-blue-100 text-blue-800", icon: "🔄" },
      success: { text: "Thành công", color: "bg-green-100 text-green-800", icon: "✅" },
      failed: { text: "Thất bại", color: "bg-red-100 text-red-800", icon: "❌" },
      cancelled: { text: "Đã hủy", color: "bg-gray-100 text-gray-800", icon: "🚫" },
    };
    return statusMap[status] || { text: status, color: "bg-gray-100 text-gray-800", icon: "❓" };
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        {error && <div className="p-4 bg-red-100 text-red-800 rounded">{error}</div>}
      </div>
    );
  }

  if (loading) return <div className="p-4 text-center">Đang tải...</div>;

  return <AdminTopupsPageView scope={{
    navigate,
    user,
    setUser,
    isAdmin,
    setIsAdmin,
    loading,
    setLoading,
    error,
    setError,
    topups,
    setTopups,
    filterStatus,
    setFilterStatus,
    submitting,
    setSubmitting,
    loadData,
    handleAccept,
    handleReject,
    getStatusDisplay,
  }} />;
}
