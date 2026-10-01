import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function RescueUpdatesTab({ scope }) {
  const { caseId, rescuerId, isRescuer, activeTab, onCaseUpdated, activeSection, setActiveSection, caseData, setCaseData, loading, setLoading, error, setError, appealTitle, setAppealTitle, appealContent, setAppealContent, appealBudget, setAppealBudget, submittingAppeal, setSubmittingAppeal, updateTitle, setUpdateTitle, updateContent, setUpdateContent, updateCost, setUpdateCost, updateImages, setUpdateImages, submittingUpdate, setSubmittingUpdate, completionNotes, setCompletionNotes, completionImages, setCompletionImages, submittingCompletion, setSubmittingCompletion, handleCreateAppeal, handleAddUpdate, handleCompleteCase, isCaseClosed } = scope;
  return (
    <>
      {/* TAB 3: CẬP NHẬT TÌNH HÌNH */}
      {activeSection === "updates" && !isCaseClosed && (
      <form onSubmit={handleAddUpdate} className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="font-bold text-blue-900 mb-3">📸 Cập nhật tình hình ca cứu hộ</h3>
      
      <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
      📌 Tiêu đề cập nhật
      </label>
      <input
      type="text"
      placeholder="VD: Đã tìm thấy mèo, đang đưa tới bệnh viện"
      value={updateTitle}
      onChange={(e) => setUpdateTitle(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      </div>
      
      <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
      📝 Mô tả chi tiết
      </label>
      <textarea
      placeholder="Mô tả tình trạng mèo/chó, địa điểm hiện tại, bước tiếp theo, v.v..."
      value={updateContent}
      onChange={(e) => setUpdateContent(e.target.value)}
      rows="5"
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      </div>
      
      <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
      💸 Chi phí tạm ứng (tùy chọn)
      </label>
      <input
      type="number"
      placeholder="VD: 200000 đ"
      value={updateCost}
      onChange={(e) => setUpdateCost(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <p className="text-xs text-gray-600 mt-1">
      Nhập chi phí bạn đã bỏ ra (ăn, xăng, điều trị tạm...). Sẽ được hoàn lại từ tiền ủng hộ.
      </p>
      </div>
      
      <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
      📷 Ảnh/Video (tùy chọn)
      </label>
      <input
      type="text"
      placeholder="URL ảnh, cách nhau bằng dấu phẩy"
      value={updateImages.join(", ")}
      onChange={(e) =>
      setUpdateImages(e.target.value.split(",").map((url) => url.trim()).filter(Boolean))
      }
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      </div>
      
      <button
      type="submit"
      disabled={submittingUpdate}
      className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 transition"
      >
      {submittingUpdate ? "⏳ Đang gửi..." : "📸 Thêm cập nhật"}
      </button>
      
      <p className="text-xs text-blue-700 italic">
      💡 Cộng đồng sẽ theo dõi tiến độ cứu hộ thông qua những cập nhật này. Hãy chia sẻ thường xuyên!
      </p>
      </form>
      )}
      
    </>
  );
}
