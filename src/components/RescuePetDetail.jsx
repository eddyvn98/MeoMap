import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { closeRescueCase } from "../donation";
import { finalizeBounties } from "../bounty";
import BountyWidget from "./BountyWidget";
import DonorList from "./DonorList";
import ContextualHelpCard from "./ContextualHelpCard";
import RescueActivityPanel from "./RescueActivityPanel";
import RescueUpdatesTimeline from "./RescueUpdatesTimeline";
import RescueAppealsList from "./RescueAppealsList";
import RescuePetDetailView from "./RescuePetDetailView";

/**
 * Chi tiết bài đăng cứu hộ (rescue category)
 * 
 * Hiển thị 2 dòng tiền rõ ràng:
 * 1. BOUNTY WIDGET - Tiền treo thưởng / hỗ trợ ban đầu (để thu hút người cứu)
 * 2. DONATION WIDGET - Tiền hỗ trợ chi phí cứu hộ (để giúp chi phí điều trị)
 * 3. Timeline hoạt động (check-in, báo cáo, ảnh, hóa đơn)
 */
export default function RescuePetDetail({ pet, user, isOwner }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [acceptingRescue, setAcceptingRescue] = useState(false);
  const [editingBankInfo, setEditingBankInfo] = useState(false);
  const [bankInfo, setBankInfo] = useState({
    rescuer_bank_account_number: pet.rescuer_bank_account_number || "",
    rescuer_bank_account_name: pet.rescuer_bank_account_name || "",
    rescuer_bank_name: pet.rescuer_bank_name || "",
    rescuer_bank_qr_code_url: pet.rescuer_bank_qr_code_url || "",
  });
  const [qrFile, setQrFile] = useState(null);
  const [savingBankInfo, setSavingBankInfo] = useState(false);

  const isClosed = pet.status === "delivered";
  const isRescuer = user && pet.rescuer_id && pet.rescuer_id === user.id;

  // Debug logging
  console.log("🚑 RescuePetDetail - isRescuer check:", {
    hasUser: !!user,
    userId: user?.id,
    petRescuerId: pet.rescuer_id,
    isRescuer,
    petId: pet.id,
    isClosed
  });

  const handleAcceptRescue = async () => {
    if (!user) {
      alert("❌ Vui lòng đăng nhập để nhận ca cứu hộ");
      return;
    }

    if (pet.rescuer_id) {
      alert("❌ Ca cứu hộ này đã có người nhận");
      return;
    }

    if (
      !confirm(
        `Bạn có chắc muốn nhận ca cứu hộ thú cưng "${pet.name}" này?\n\nBạn sẽ trở thành người cứu hộ chính và có trách nhiệm hoàn thành ca này.`
      )
    )
      return;

    setAcceptingRescue(true);
    try {
      const { error } = await supabase
        .from("pets")
        .update({ rescuer_id: user.id })
        .eq("id", pet.id);

      if (error) throw error;

      alert("✅ Bạn đã nhận ca cứu hộ! Vui lòng cập nhật thông tin ngân hàng để người đóng góp có thể chuyển tiền.");
      setEditingBankInfo(true);
      window.location.reload();
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setAcceptingRescue(false);
    }
  };

  const handleCloseCase = async () => {
    if (
      !confirm(
        "Bạn có chắc muốn kết thúc ca cứu hộ? Toàn bộ tiền trong ví + tiền thưởng đã nhận sẽ được chuyển cho bạn."
      )
    )
      return;

    setLoading(true);
    try {
      // 1. Finalize bounties (mark accepted as transferred, reject unaccepted)
      const { success: bountySuccess, error: bountyError } = await finalizeBounties(
        pet.id,
        pet.owner_id
      );
      if (!bountySuccess) console.warn("Warning: Could not finalize bounties", bountyError);

      // 2. Close rescue case (transfer wallet balance)
      const { success: caseSuccess, error: caseError } = await closeRescueCase(
        pet.id,
        pet.owner_id
      );
      if (!caseSuccess) throw new Error(caseError);

      alert("✅ Đã kết thúc ca cứu hộ. Toàn bộ tiền đã được chuyển.");
      window.location.reload();
    } catch (err) {
      alert("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBankInfo = async () => {
    setSavingBankInfo(true);
    try {
      let qrUrl = bankInfo.rescuer_bank_qr_code_url;

      // Upload QR file if selected
      if (qrFile) {
        const ext = qrFile.name.split(".").pop();
        const filePath = `bank-qr/${pet.id}_${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("pet-images")
          .upload(filePath, qrFile);

        if (uploadError) {
          console.error(uploadError);
          throw new Error("Upload ảnh QR lỗi: " + uploadError.message);
        }

        const { data: publicData } = supabase.storage
          .from("pet-images")
          .getPublicUrl(filePath);

        qrUrl = publicData?.publicUrl || bankInfo.rescuer_bank_qr_code_url;
      }

      const updateData = {
        ...bankInfo,
        rescuer_bank_qr_code_url: qrUrl,
      };

      const { error } = await supabase
        .from("pets")
        .update(updateData)
        .eq("id", pet.id);

      if (error) throw error;

      alert("✅ Đã cập nhật thông tin ngân hàng!");
      setEditingBankInfo(false);
      setQrFile(null);
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("❌ Lỗi khi lưu thông tin: " + error.message);
    } finally {
      setSavingBankInfo(false);
    }
  };

  const viewScope = { pet, user, isOwner, navigate, loading, setLoading, acceptingRescue, setAcceptingRescue, editingBankInfo, setEditingBankInfo, bankInfo, setBankInfo, qrFile, setQrFile, savingBankInfo, setSavingBankInfo, isClosed, isRescuer, handleAcceptRescue, handleCloseCase, handleSaveBankInfo };
  return <RescuePetDetailView scope={viewScope} />;
}
