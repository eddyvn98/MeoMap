import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function RescueCompleteTab({ scope }) {
  const { caseId, rescuerId, isRescuer, activeTab, onCaseUpdated, activeSection, setActiveSection, caseData, setCaseData, loading, setLoading, error, setError, appealTitle, setAppealTitle, appealContent, setAppealContent, appealBudget, setAppealBudget, submittingAppeal, setSubmittingAppeal, updateTitle, setUpdateTitle, updateContent, setUpdateContent, updateCost, setUpdateCost, updateImages, setUpdateImages, submittingUpdate, setSubmittingUpdate, completionNotes, setCompletionNotes, completionImages, setCompletionImages, submittingCompletion, setSubmittingCompletion, handleCreateAppeal, handleAddUpdate, handleCompleteCase, isCaseClosed } = scope;
  return (
    <>
      {/* TAB 4: HOÀN THÀNH CA */}
      {activeSection === "complete" && !isCaseClosed && (
      <form onSubmit={handleCompleteCase} className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
      <h3 className="font-bold text-green-900 mb-3">✅ Hoàn thành ca cứu hộ</h3>
      
      {caseData.owner_id === rescuerId ? (
      // Self-rescue warning
      <div className="p-3 bg-amber-100 border border-amber-400 rounded-lg">
      <p className="text-sm text-amber-900 font-semibold">
      ⚠️ <strong>Bạn đang tự cứu ca của chính mình</strong>
      </p>
      <p className="text-xs text-amber-800 mt-2">
      Khi hoàn thành:
      </p>
      <ul className="text-xs text-amber-800 mt-1 space-y-1 ml-4">
      <li>• ❌ <strong>KHÔNG nhận</strong> tiền hỗ trợ ban đầu ({(caseData.bounty_amount || 0).toLocaleString()}đ)</li>
      <li>• ✅ Nhận được tiền quyên góp từ cộng đồng (nếu có)</li>
      <li>• ✅ Ca cứu hộ chuyển sang "Đã hoàn thành"</li>
      </ul>
      <p className="text-xs text-amber-900 font-semibold mt-2">
      💡 Tiền thưởng chỉ dành cho người khác giúp đỡ, không áp dụng khi tự cứu.
      </p>
      </div>
      ) : (
      // Normal rescue
      <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
      <p className="text-sm text-yellow-800">
      ⚠️ <strong>Lưu ý:</strong> Hoàn thành ca cứu hộ sẽ kích hoạt:
      </p>
      <ul className="text-xs text-yellow-800 mt-2 space-y-1 ml-4">
      <li>• ✅ Tiền hỗ trợ ban đầu ({(caseData.bounty_amount || 0).toLocaleString()}đ) được giải ngân cho bạn</li>
      <li>• ✅ Tiền quyên góp được xử lý theo yêu cầu</li>
      <li>• ✅ Ca cứu hộ chuyển sang trạng thái "Đã hoàn thành"</li>
      </ul>
      </div>
      )}
      
      <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
      📝 Báo cáo hoàn thành
      </label>
      <textarea
      placeholder="Tóm tắt kết quả cuối cùng: Mèo/chó đã được cứu như thế nào, tình trạng hiện tại, v.v..."
      value={completionNotes}
      onChange={(e) => setCompletionNotes(e.target.value)}
      rows="5"
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      </div>
      
      <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">
      📷 Ảnh minh chứng (tùy chọn)
      </label>
      <input
      type="text"
      placeholder="URL ảnh, cách nhau bằng dấu phẩy"
      value={completionImages.join(", ")}
      onChange={(e) =>
      setCompletionImages(e.target.value.split(",").map((url) => url.trim()).filter(Boolean))
      }
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
      />
      </div>
      
      <button
      type="submit"
      disabled={submittingCompletion}
      className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition"
      >
      {submittingCompletion ? "⏳ Đang xử lý..." : "✅ Hoàn thành ca cứu hộ"}
      </button>
      
      <p className="text-xs text-green-700 italic">
      💡 Sau khi hoàn thành, bạn có thể xem lịch sử giao dịch trong ví cá nhân.
      </p>
      </form>
      )}
      
      {/* TRẠNG THÁI ĐÃ HOÀN THÀNH */}
      {isCaseClosed && (
      <div className="p-4 bg-green-100 border-2 border-green-500 rounded-lg text-center">
      <h3 className="text-2xl font-bold text-green-900 mb-2">✅ Ca cứu hộ đã hoàn thành!</h3>
      <p className="text-sm text-green-800 mb-3">
      Cảm ơn bạn đã cứu giúp! Tiền hỗ trợ đã được giải ngân.
      </p>
      {caseData.completion_notes && (
      <div className="mt-3 p-3 bg-white rounded border border-green-300">
      <p className="text-xs text-gray-600 font-semibold">Báo cáo hoàn thành:</p>
      <p className="text-sm text-gray-700 mt-1">{caseData.completion_notes}</p>
      </div>
      )}
      </div>
      )}
    </>
  );
}
