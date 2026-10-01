import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import EditPostPanelView from './views/EditPostPanelView';

export default function EditPostPanel({ post, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [name, setName] = useState(post.name || "");
  const [description, setDescription] = useState(post.description || "");
  const [category, setCategory] = useState(post.category || "adopt");
  const [file, setFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(post.image_url || "");

  // Deposit/Bounty fields
  const [requiredDeposit, setRequiredDeposit] = useState(
    post.required_deposit ? String(post.required_deposit) : ""
  );
  const [allowCustomDeposit, setAllowCustomDeposit] = useState(
    post.allow_custom_deposit !== false
  );
  const [bountyAmount, setBountyAmount] = useState(
    post.bounty_amount ? String(post.bounty_amount) : ""
  );

  // Bank account fields for direct donations
  const [bankAccountNumber, setBankAccountNumber] = useState(post.bank_account_number || "");
  const [bankAccountName, setBankAccountName] = useState(post.bank_account_name || "");
  const [bankName, setBankName] = useState(post.bank_name || "");
  const [bankQrFile, setBankQrFile] = useState(null);
  const [existingBankQr, setExistingBankQr] = useState(post.bank_qr_code_url || "");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Tiêu đề bài viết không được để trống.");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = existingImageUrl;

      // Upload new image if selected
      if (file) {
        const ext = file.name.split(".").pop();
        const filePath = `pets/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("pet-images")
          .upload(filePath, file);

        if (uploadError) {
          console.error(uploadError);
          setError("Upload ảnh lỗi.");
          setLoading(false);
          return;
        }

        const { data: publicData } = supabase.storage
          .from("pet-images")
          .getPublicUrl(filePath);

        imageUrl = publicData?.publicUrl || existingImageUrl;
      }

      // Upload bank QR code if selected
      let bankQrUrl = existingBankQr;
      if (bankQrFile) {
        const ext = bankQrFile.name.split(".").pop();
        const qrPath = `bank-qr/${Date.now()}.${ext}`;

        const { error: qrUploadError } = await supabase.storage
          .from("pet-images")
          .upload(qrPath, bankQrFile);

        if (qrUploadError) {
          console.error(qrUploadError);
          setError("Upload QR code lỗi.");
          setLoading(false);
          return;
        }

        const { data: qrPublicData } = supabase.storage
          .from("pet-images")
          .getPublicUrl(qrPath);

        bankQrUrl = qrPublicData?.publicUrl || existingBankQr;
      }

      // Update pet
      const updateData = {
        name,
        description,
        category,
        image_url: imageUrl,
        required_deposit: requiredDeposit ? Number(requiredDeposit) : null,
        allow_custom_deposit: allowCustomDeposit,
        bounty_amount: bountyAmount ? Number(bountyAmount) : null,
        bank_account_number: bankAccountNumber || null,
        bank_account_name: bankAccountName || null,
        bank_name: bankName || null,
        bank_qr_code_url: bankQrUrl || null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("pets")
        .update(updateData)
        .eq("id", post.id);

      if (updateError) {
        console.error("Update error:", updateError);
        setError("Cập nhật bài đăng lỗi: " + updateError.message);
        setLoading(false);
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      setError("Có lỗi bất ngờ.");
      setLoading(false);
    }
  };

  return <EditPostPanelView scope={{
    post,
    onClose,
    onSuccess,
    loading,
    setLoading,
    error,
    setError,
    name,
    setName,
    description,
    setDescription,
    category,
    setCategory,
    file,
    setFile,
    existingImageUrl,
    setExistingImageUrl,
    requiredDeposit,
    setRequiredDeposit,
    allowCustomDeposit,
    setAllowCustomDeposit,
    bountyAmount,
    setBountyAmount,
    bankAccountNumber,
    setBankAccountNumber,
    bankAccountName,
    setBankAccountName,
    bankName,
    setBankName,
    bankQrFile,
    setBankQrFile,
    existingBankQr,
    setExistingBankQr,
    handleSubmit,
  }} />;
}
