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
import VoucherConversionModal from "../components/VoucherConversionModal";
import MyVouchersTab from "../components/MyVouchersTab";
import TopUpModal from "../components/TopUpModal";
import MyWalletPageView from "./MyWalletPageView";

export default function MyWalletPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [balanceMain, setBalanceMain] = useState(0);
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
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [userId, setUserId] = useState(null);

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

    const currentUserId = authData.user.id;
    setUserId(currentUserId);

    // Load wallet balances
    const walletResult = await getUserWallet(currentUserId);
    if (!walletResult.success) {
      setError(walletResult.error);
      setLoading(false);
      return;
    }

    setBalanceMain(walletResult.wallet.balance_main || 0);
    setBalanceCoc(walletResult.wallet.balance_coc || 0);
    setBalanceThuong(walletResult.wallet.balance_thuong || 0);

    // Load transactions
    const txResult = await getWalletTransactions(currentUserId);
    if (txResult.success) {
      setTransactions(txResult.transactions);
    }

    // Load withdrawal requests
    const wrResult = await getWithdrawalRequests(currentUserId);
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
    if (!amount || amount < 50000) {
      setWithdrawalError("Số tiền rút tối thiểu là 50.000đ");
      setWithdrawalLoading(false);
      return;
    }

    const availableWithdraw = balanceMain + balanceThuong;
    if (amount > availableWithdraw) {
      setWithdrawalError("Số dư rút không đủ (Ví chính + Ví thưởng)");
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

  const viewScope = { navigate, loading, setLoading, error, setError, balanceMain, setBalanceMain, balanceCoc, setBalanceCoc, balanceThuong, setBalanceThuong, transactions, setTransactions, withdrawalRequests, setWithdrawalRequests, selectedTab, setSelectedTab, withdrawalAmount, setWithdrawalAmount, bankAccount, setBankAccount, bankName, setBankName, withdrawalNote, setWithdrawalNote, withdrawalLoading, setWithdrawalLoading, withdrawalError, setWithdrawalError, showVoucherModal, setShowVoucherModal, showTopUpModal, setShowTopUpModal, userId, setUserId, getTransactionTypeLabel, getTransactionColor, getTransactionSign, loadData, handleWithdrawalRequest };
  return <MyWalletPageView scope={viewScope} />;
}
