import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

export default function RescueActivityPanelView({ scope }) {
  const { caseId, rescuerId, isRescuer, activeTab, onCaseUpdated, activeSection, setActiveSection, caseData, setCaseData, loading, setLoading, error, setError, appealTitle, setAppealTitle, appealContent, setAppealContent, appealBudget, setAppealBudget, submittingAppeal, setSubmittingAppeal, updateTitle, setUpdateTitle, updateContent, setUpdateContent, updateCost, setUpdateCost, updateImages, setUpdateImages, submittingUpdate, setSubmittingUpdate, completionNotes, setCompletionNotes, completionImages, setCompletionImages, submittingCompletion, setSubmittingCompletion, handleCreateAppeal, handleAddUpdate, handleCompleteCase, isCaseClosed } = scope;
  return (
    <div className="space-y-4">
      {/* TIÊU ĐỀ & TRẠNG THÁI */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-lg">
        <h2 className="text-xl font-bold mb-1">🚑 Trung tâm cứu hộ của bạn</h2>
        <p className="text-sm opacity-90">Quản lý ca cứu hộ: {caseData.name}</p>
        <div className="mt-3">
          <div
            className={`inline-block px-3 py-1 rounded-full font-semibold text-sm ${
              isCaseClosed
                ? "bg-green-600 text-white"
                : "bg-yellow-300 text-gray-900"
            }`}
          >
            {isCaseClosed ? "✅ Đã hoàn thành" : "⏳ Đang tiến hành"}
          </div>
        </div>
      </div>

      {/* TABS */}
      {!isCaseClosed && activeTab === "overview" && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveSection("overview")}
            className={`flex-1 min-w-[120px] px-3 py-2 rounded font-semibold text-sm transition ${
              activeSection === "overview"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📊 Tổng quan
          </button>
          <button
            onClick={() => setActiveSection("appeal")}
            className={`flex-1 min-w-[120px] px-3 py-2 rounded font-semibold text-sm transition ${
              activeSection === "appeal"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📢 Kêu gọi
          </button>
          <button
            onClick={() => setActiveSection("updates")}
            className={`flex-1 min-w-[120px] px-3 py-2 rounded font-semibold text-sm transition ${
              activeSection === "updates"
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📸 Cập nhật
          </button>
          <button
            onClick={() => setActiveSection("complete")}
            className={`flex-1 min-w-[120px] px-3 py-2 rounded font-semibold text-sm transition ${
              activeSection === "complete"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            ✅ Hoàn thành
          </button>
        </div>
      )}

      {/* NỘI DUNG TỪNG TAB */}

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
    </div>
  );
}
