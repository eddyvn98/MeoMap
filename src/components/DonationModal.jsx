import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../supabaseClient";
import { addDonation, uploadReceiptImage } from "../donation";
import DonationModalView from './views/DonationModalView';

/**
 * Modal góp tiền
 * - Form nhập số tiền
 * - Chọn hình thức: chuyển thẳng / qua hệ thống
 * - Upload ảnh biên lai (nếu chuyển thẳng)
 * - Ghi chú
 * - Điều khoản
 */
export default function DonationModal({ caseId, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("direct"); // chỉ dùng 'direct'
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [anonymous, setAnonymous] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [createdToken, setCreatedToken] = useState(null);
  const [createdAmount, setCreatedAmount] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [petBankInfo, setPetBankInfo] = useState({
    bank_account_number: "",
    bank_account_name: "",
    bank_name: "",
    bank_qr_code_url: "",
  });

  // Load user and wallet balance
  useState(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUser(data.user);
        
        // Load wallet balance
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance_thuong")
          .eq("id", data.user.id)
          .single();
        
        setWalletBalance(profile?.balance_thuong || 0);
      }

      // Load pet bank info
      const { data: pet } = await supabase
        .from("pets")
        .select("bank_account_number, bank_account_name, bank_name, bank_qr_code_url")
        .eq("id", caseId)
        .single();
      if (pet) {
        setPetBankInfo({
          bank_account_number: pet.bank_account_number || "",
          bank_account_name: pet.bank_account_name || "",
          bank_name: pet.bank_name || "",
          bank_qr_code_url: pet.bank_qr_code_url || "",
        });
      }
    };
    getUser();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setReceiptPreview(ev.target?.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validation
      // Không bắt buộc số tiền cho chuyển thẳng
      const donationAmount = amount ? parseInt(amount) : null;

      // Không kiểm tra ví vì không qua hệ thống

      if (!agree) {
        throw new Error("Vui lòng đồng ý điều khoản");
      }

      let receiptUrl = null;

      // Upload ảnh biên lai nếu chọn chuyển thẳng
      if (method === "direct" && receiptFile) {
        const { success, url, error: uploadError } = await uploadReceiptImage(
          receiptFile,
          caseId
        );
        if (!success) throw new Error(uploadError);
        receiptUrl = url;
      }

      // Thêm donation (chuyển thẳng)
      const { success, donation, error: donationError } = await addDonation({
        caseId,
        amount: donationAmount,
        method: 'direct',
        note,
        receiptUrl,
        userId,
      });

      if (!success) throw new Error(donationError);

      setCreatedToken(donation?.token || null);
      setCreatedAmount(donationAmount || undefined);
      
      const amountText = donationAmount ? `${(donationAmount).toLocaleString()}đ` : `--`;
      const remainingMsg = method === "system" && donationAmount ? `\nSố dư còn lại: ${(walletBalance - donationAmount).toLocaleString()}đ` : "";
      alert(`✅ Cảm ơn bạn đã góp ${amountText}!\nMã tham chiếu: ${donation?.token || "(đang tạo)"}${remainingMsg}`);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return <DonationModalView scope={{
    caseId,
    onClose,
    onSuccess,
    amount,
    setAmount,
    method,
    setMethod,
    note,
    setNote,
    receiptFile,
    setReceiptFile,
    receiptPreview,
    setReceiptPreview,
    anonymous,
    setAnonymous,
    agree,
    setAgree,
    loading,
    setLoading,
    error,
    setError,
    currentUser,
    setCurrentUser,
    createdToken,
    setCreatedToken,
    createdAmount,
    setCreatedAmount,
    walletBalance,
    setWalletBalance,
    petBankInfo,
    setPetBankInfo,
    handleFileChange,
    handleSubmit,
  }} />;
}
