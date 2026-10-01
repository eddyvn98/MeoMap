import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function RescueOverviewTab({ scope }) {
  const { caseId, rescuerId, isRescuer, activeTab, onCaseUpdated, activeSection, setActiveSection, caseData, setCaseData, loading, setLoading, error, setError, appealTitle, setAppealTitle, appealContent, setAppealContent, appealBudget, setAppealBudget, submittingAppeal, setSubmittingAppeal, updateTitle, setUpdateTitle, updateContent, setUpdateContent, updateCost, setUpdateCost, updateImages, setUpdateImages, submittingUpdate, setSubmittingUpdate, completionNotes, setCompletionNotes, completionImages, setCompletionImages, submittingCompletion, setSubmittingCompletion, handleCreateAppeal, handleAddUpdate, handleCompleteCase, isCaseClosed } = scope;
  return (
    <>
      {/* TAB 1: TỔNG QUAN */}
      {activeSection === "overview" && !isCaseClosed && (
      <div className="space-y-4">
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="font-bold text-blue-900 mb-2">💡 Hướng dẫn</h3>
      <ul className="text-sm text-blue-800 space-y-1">
      <li>✓ Bước 1: Bấm "📢 Kêu gọi" để tạo lời kêu gọi ủng hộ từ cộng đồng</li>
      <li>✓ Bước 2: Bấm "📸 Cập nhật" để thêm ảnh, video, chi phí tạm ứng</li>
      <li>✓ Bước 3: Bấm "✅ Hoàn thành" để kết thúc ca cứu hộ</li>
      </ul>
      </div>
      
      {/* Cảnh báo nếu tự cứu */}
      {caseData.owner_id === rescuerId && (
      <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg">
      <p className="text-sm text-amber-900 font-semibold">⚠️ Bạn đang tự cứu ca của chính mình</p>
      <p className="text-xs text-amber-800 mt-1">
      Bạn có thể nhận ủng hộ từ cộng đồng, nhưng <strong>không nhận được tiền thưởng ban đầu</strong> khi hoàn thành.
      Tiền thưởng chỉ dành cho người khác giúp đỡ.
      </p>
      </div>
      )}
      
      {/* Thống kê nhanh */}
      <div className="grid grid-cols-2 gap-3">
      <div className="p-3 bg-orange-100 rounded-lg border border-orange-300">
      <p className="text-xs text-orange-700 font-semibold">
      Tiền hỗ trợ ban đầu
      {caseData.owner_id === rescuerId && " (không nhận)"}
      </p>
      <p className="text-2xl font-bold text-orange-900">
      {(caseData.bounty_amount || 0).toLocaleString()}đ
      </p>
      {caseData.owner_id === rescuerId && (
      <p className="text-xs text-orange-700 mt-1">Chỉ cho người khác</p>
      )}
      </div>
      <div className="p-3 bg-purple-100 rounded-lg border border-purple-300">
      <p className="text-xs text-purple-700 font-semibold">Tiền quyên góp</p>
      <p className="text-2xl font-bold text-purple-900">
      {(caseData.total_donations || 0).toLocaleString()}đ
      </p>
      </div>
      </div>
      
      {/* Trạng thái hiện tại */}
      <div className="p-4 bg-gray-50 rounded-lg border">
      <h3 className="font-bold text-gray-900 mb-2">📊 Trạng thái hiện tại</h3>
      <div className="space-y-2 text-sm">
      <p className="text-gray-700">
      <strong>Ca cứu hộ:</strong> {caseData.name}
      </p>
      <p className="text-gray-700">
      <strong>Danh mục:</strong> {caseData.category === "rescue" ? "🚑 Cứu hộ" : "Khác"}
      </p>
      <p className="text-gray-700">
      <strong>Ngày tạo:</strong> {new Date(caseData.created_at).toLocaleString("vi-VN")}
      </p>
      {caseData.description && (
      <p className="text-gray-700">
      <strong>Mô tả:</strong> {caseData.description.substring(0, 100)}
      {caseData.description.length > 100 ? "..." : ""}
      </p>
      )}
      </div>
      </div>
      </div>
      )}
      
    </>
  );
}
