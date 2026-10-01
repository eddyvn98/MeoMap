import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import AdminWithdrawalsPageP2PView from './views/AdminWithdrawalsPageP2PView';

const QRCodeComponent = lazy(() => 
  import('qrcode.react').then(mod => ({ default: mod.default }))
);
import {
  adminGetPendingWithdrawalsP2P,
  adminApproveWithdrawalP2P,
  adminConfirmPaymentP2P,
  getWithdrawalStatusDisplayP2P,
  formatVND,
  generateVietQRData
} from "../services/walletService";

export default function AdminWithdrawalsPageP2P() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [withdrawals, setWithdrawals] = useState([]);
  const [filterStatus, setFilterStatus] = useState("PENDING");

  // Modal for payment confirmation
  const [paymentModal, setPaymentModal] = useState(null);
  const [traceId, setTraceId] = useState("");
  const [transferContent, setTransferContent] = useState("");
  const [transferTime, setTransferTime] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const bankCodes = {
    "VCB": { name: "Vietcombank", code: "970436" },
    "TCB": { name: "Techcombank", code: "970407" },
    "ACB": { name: "ACB", code: "970416" },
    "CTG": { name: "Agribank", code: "970405" },
    "HDB": { name: "HDBank", code: "970434" },
    "SHB": { name: "SHB", code: "970443" },
    "BIDV": { name: "BIDV", code: "970418" },
    "MBB": { name: "MBBank", code: "970422" },
    "TPB": { name: "TPBank", code: "970423" },
    "EXB": { name: "ExIMBank", code: "970431" },
  };

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

      // Load withdrawals
      const result = await adminGetPendingWithdrawalsP2P(filterStatus || null, 100);
      if (result.success) {
        setWithdrawals(result.requests || []);
      } else {
        setError(result.error);
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

  // Approve withdrawal
  const handleApprove = async (withdrawalId) => {
    if (!user) return;

    try {
      const result = await adminApproveWithdrawalP2P(withdrawalId, user.id);
      if (result.success) {
        alert("✅ Đã duyệt lệnh rút");
        await loadData();
      } else {
        alert("❌ Lỗi: " + (result.error || "Không thể duyệt"));
      }
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    }
  };

  // Confirm payment (open modal)
  const openPaymentModal = (wd) => {
    setPaymentModal(wd);
    setTraceId("");
    setTransferContent(`PAY ${wd.order_code}`);
    setTransferTime(new Date().toISOString().slice(0, 16));
    setAdminNotes("");
    setProofFile(null);
  };

  // Submit payment confirmation
  const handleConfirmPayment = async () => {
    if (!paymentModal) return;
    if (!traceId.trim()) {
      alert("Vui lòng nhập mã giao dịch (Trace ID)");
      return;
    }

    if (!transferContent.trim()) {
      alert("Vui lòng nhập nội dung chuyển khoản");
      return;
    }

    try {
      setSubmitting(true);
      const result = await adminConfirmPaymentP2P(
        paymentModal.id,
        traceId,
        transferContent,
        new Date(transferTime),
        adminNotes
      );

      if (result.success) {
        alert("✅ Đã xác nhận thanh toán. Chờ người dùng xác nhận nhận tiền.");
        setPaymentModal(null);
        await loadData();
      } else {
        alert("❌ Lỗi: " + (result.error || "Không thể xác nhận"));
      }
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setSubmitting(false);
    }
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

  return <AdminWithdrawalsPageP2PView scope={{
    navigate,
    user,
    setUser,
    isAdmin,
    setIsAdmin,
    loading,
    setLoading,
    error,
    setError,
    withdrawals,
    setWithdrawals,
    filterStatus,
    setFilterStatus,
    paymentModal,
    setPaymentModal,
    traceId,
    setTraceId,
    transferContent,
    setTransferContent,
    transferTime,
    setTransferTime,
    adminNotes,
    setAdminNotes,
    proofFile,
    setProofFile,
    submitting,
    setSubmitting,
    bankCodes,
    loadData,
    handleApprove,
    openPaymentModal,
    handleConfirmPayment,
  }} />;
}
