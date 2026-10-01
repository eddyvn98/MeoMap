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
import WalletOverviewTab from "./WalletOverviewTab";
import WalletWithdrawalTab from "./WalletWithdrawalTab";
import WalletHistoryTab from "./WalletHistoryTab";

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

      <WalletOverviewTab
        selectedTab={selectedTab}
        balanceCoc={balanceCoc}
        balanceThuong={balanceThuong}
      />
      <WalletWithdrawalTab
        selectedTab={selectedTab}
        handleCreateWithdrawal={handleCreateWithdrawal}
        formError={formError}
        amount={amount}
        setAmount={setAmount}
        formLoading={formLoading}
        balanceThuong={balanceThuong}
        quickAmounts={quickAmounts}
        bankName={bankName}
        setBankName={setBankName}
        bankAccount={bankAccount}
        setBankAccount={setBankAccount}
        accountHolder={accountHolder}
        setAccountHolder={setAccountHolder}
      />
      <WalletHistoryTab
        selectedTab={selectedTab}
        withdrawals={withdrawals}
        handleConfirmReceipt={handleConfirmReceipt}
        disputeWithdrawalId={disputeWithdrawalId}
        setDisputeWithdrawalId={setDisputeWithdrawalId}
        disputeReason={disputeReason}
        setDisputeReason={setDisputeReason}
        handleOpenDispute={handleOpenDispute}
      />
    </div>
  );
}
