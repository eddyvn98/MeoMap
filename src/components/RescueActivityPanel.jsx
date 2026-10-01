import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import RescueActivityPanelView from "./RescueActivityPanelView";

/**
 * Giao diện quản lý ca cứu hộ cho người nhận ca (rescuer)
 * 
 * Các chức năng:
 * 1. Kêu gọi ủng hộ - tạo lời kêu gọi để nhận tiền hỗ trợ
 * 2. Cập nhật tình hình - thêm ảnh, video, mô tả, chi phí tạm ứng
 * 3. Hoàn thành ca - quét QR/bấm nút xác nhận để kết thúc
 */
export default function RescueActivityPanel({ caseId, rescuerId, isRescuer, activeTab = "overview", onCaseUpdated }) {
  const [activeSection, setActiveSection] = useState(activeTab); // overview | appeal | updates | complete

  // Trạng thái ca
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  console.log("🏥 RescueActivityPanel mounted with:", { caseId, rescuerId, isRescuer });

  // Kêu gọi ủng hộ
  const [appealTitle, setAppealTitle] = useState("");
  const [appealContent, setAppealContent] = useState("");
  const [appealBudget, setAppealBudget] = useState("");
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // Cập nhật tình hình
  const [updateTitle, setUpdateTitle] = useState("");
  const [updateContent, setUpdateContent] = useState("");
  const [updateCost, setUpdateCost] = useState("");
  const [updateImages, setUpdateImages] = useState([]);
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  // Hoàn thành ca
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionImages, setCompletionImages] = useState([]);
  const [submittingCompletion, setSubmittingCompletion] = useState(false);

  // Load case data
  useEffect(() => {
    const loadCase = async () => {
      setLoading(true);
      setError("");

      console.log("🏥 Loading case data for:", caseId);

      const { data, error: caseError } = await supabase
        .from("pets")
        .select("*")
        .eq("id", caseId)
        .single();

      console.log("🏥 Case load result:", { data, error: caseError });

      if (caseError) {
        setError("Không tải được thông tin ca cứu hộ");
        setCaseData(null);
      } else {
        setCaseData(data);
      }
      setLoading(false);
    };

    if (caseId) loadCase();
  }, [caseId]);

  // Hàm tạo lời kêu gọi ủng hộ
  const handleCreateAppeal = async (e) => {
    e.preventDefault();
    if (!appealTitle.trim() || !appealContent.trim()) {
      alert("⚠️ Vui lòng điền đầy đủ thông tin");
      return;
    }

    setSubmittingAppeal(true);
    try {
      const { error: insertError } = await supabase
        .from("rescue_appeals")
        .insert([
          {
            case_id: caseId,
            rescuer_id: rescuerId,
            title: appealTitle,
            content: appealContent,
            requested_budget: appealBudget ? parseInt(appealBudget) : 0,
            status: "active",
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) throw insertError;

      alert("✅ Đã tạo lời kêu gọi ủng hộ!");
      setAppealTitle("");
      setAppealContent("");
      setAppealBudget("");
      setActiveSection("overview");
      onCaseUpdated?.();
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setSubmittingAppeal(false);
    }
  };

  // Hàm thêm cập nhật tình hình
  const handleAddUpdate = async (e) => {
    e.preventDefault();
    if (!updateTitle.trim() || !updateContent.trim()) {
      alert("⚠️ Vui lòng điền đầy đủ thông tin");
      return;
    }

    setSubmittingUpdate(true);
    try {
      const { error: insertError } = await supabase
        .from("rescue_updates")
        .insert([
          {
            case_id: caseId,
            rescuer_id: rescuerId,
            title: updateTitle,
            content: updateContent,
            spent_cost: updateCost ? parseInt(updateCost) : 0,
            image_urls: updateImages.length > 0 ? updateImages : null,
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) throw insertError;

      alert("✅ Đã cập nhật tình hình ca cứu hộ!");
      setUpdateTitle("");
      setUpdateContent("");
      setUpdateCost("");
      setUpdateImages([]);
      setActiveSection("overview");
      onCaseUpdated?.();
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // Hàm hoàn thành ca
  const handleCompleteCase = async (e) => {
    e.preventDefault();

    if (
      !confirm(
        "Bạn có chắc muốn hoàn thành ca cứu hộ này? Hành động này không thể hoàn tác."
      )
    )
      return;

    setSubmittingCompletion(true);
    try {
      // Update case status
      const { error: updateError } = await supabase
        .from("pets")
        .update({
          status: "delivered",
          completed_at: new Date().toISOString(),
          completion_notes: completionNotes,
          completion_images: completionImages.length > 0 ? completionImages : null,
        })
        .eq("id", caseId);

      if (updateError) throw updateError;

      // Check if rescuer is also the owner (self-rescue)
      const isSelfRescue = caseData.owner_id === rescuerId;

      if (isSelfRescue) {
        // Self-rescue: No bounty payment
        alert(
          "✅ Ca cứu hộ đã hoàn thành!\n\n" +
          "⚠️ Lưu ý: Vì bạn tự cứu ca của chính mình, bạn KHÔNG nhận được tiền thưởng.\n" +
          "Tiền thưởng chỉ dành cho người khác giúp đỡ."
        );
      } else {
        // Normal rescue: Bounty will be paid via backend trigger/function
        alert(
          "✅ Ca cứu hộ đã hoàn thành!\n\n" +
          "💰 Tiền hỗ trợ sẽ được giải ngân vào ví của bạn.\n" +
          "Kiểm tra trong mục 'Ví của tôi'."
        );
      }

      setCompletionNotes("");
      setCompletionImages([]);
      setActiveSection("overview");
      onCaseUpdated?.();
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setSubmittingCompletion(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600">Đang tải...</p>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-700">
        {error || "Không tìm thấy ca cứu hộ"}
      </div>
    );
  }

  const isCaseClosed = caseData.status === "delivered";

  const viewScope = { caseId, rescuerId, isRescuer, activeTab, onCaseUpdated, activeSection, setActiveSection, caseData, setCaseData, loading, setLoading, error, setError, appealTitle, setAppealTitle, appealContent, setAppealContent, appealBudget, setAppealBudget, submittingAppeal, setSubmittingAppeal, updateTitle, setUpdateTitle, updateContent, setUpdateContent, updateCost, setUpdateCost, updateImages, setUpdateImages, submittingUpdate, setSubmittingUpdate, completionNotes, setCompletionNotes, completionImages, setCompletionImages, submittingCompletion, setSubmittingCompletion, handleCreateAppeal, handleAddUpdate, handleCompleteCase, isCaseClosed };
  return <RescueActivityPanelView scope={viewScope} />;
}
