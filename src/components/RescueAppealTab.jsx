import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function RescueAppealTab({ scope }) {
  const { caseId, rescuerId, isRescuer, activeTab, onCaseUpdated, activeSection, setActiveSection, caseData, setCaseData, loading, setLoading, error, setError, appealTitle, setAppealTitle, appealContent, setAppealContent, appealBudget, setAppealBudget, submittingAppeal, setSubmittingAppeal, updateTitle, setUpdateTitle, updateContent, setUpdateContent, updateCost, setUpdateCost, updateImages, setUpdateImages, submittingUpdate, setSubmittingUpdate, completionNotes, setCompletionNotes, completionImages, setCompletionImages, submittingCompletion, setSubmittingCompletion, handleCreateAppeal, handleAddUpdate, handleCompleteCase, isCaseClosed } = scope;
  return (
    <>
      {/* TAB 2: KÊU GỌI ỦNG HỘ */}
      {activeSection === "appeal" && !isCaseClosed && (
      <form onSubmit={handleCreateAppeal} className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
      <h3 className="font-bold text-orange-900 mb-3">📢 Tạo lời kêu gọi ủng hộ</h3>
      
      <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
      📌 Tiêu đề kêu gọi
      </label>
      <input
      type="text"
      placeholder="VD: Mèo gặp tai nạn cần phẫu thuật khẩn cấp"
      value={appealTitle}
      onChange={(e) => setAppealTitle(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      </div>
      
      <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
      📝 Nội dung kêu gọi
      </label>
      <textarea
      placeholder="Mô tả chi tiết tình huống, cần giúp gì, dự kiến chi phí, v.v..."
      value={appealContent}
      onChange={(e) => setAppealContent(e.target.value)}
      rows="5"
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      </div>
      
      <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
      💰 Dự kiến chi phí (tùy chọn)
      </label>
      <input
      type="number"
      placeholder="VD: 500000 đ"
      value={appealBudget}
      onChange={(e) => setAppealBudget(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      </div>
      
      <button
      type="submit"
      disabled={submittingAppeal}
      className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 transition"
      >
      {submittingAppeal ? "⏳ Đang gửi..." : "📢 Gửi kêu gọi"}
      </button>
      
      <p className="text-xs text-orange-700 italic">
      💡 Lời kêu gọi sẽ được chia sẻ với cộng đồng để huy động ủng hộ. Tiền ủng hộ sẽ được quản lý minh bạch trong ví ca cứu hộ.
      </p>
      </form>
      )}
      
    </>
  );
}
