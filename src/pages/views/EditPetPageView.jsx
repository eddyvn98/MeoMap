/* eslint-disable no-unused-vars */
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function EditPetPageView({ scope }) {
  const {
    navigate,
    id,
    user,
    setUser,
    pet,
    setPet,
    loading,
    setLoading,
    submitting,
    setSubmitting,
    error,
    setError,
    name,
    setName,
    description,
    setDescription,
    category,
    setCategory,
    status,
    setStatus,
    file,
    setFile,
    existingImageUrl,
    setExistingImageUrl,
    suggestedDeposit,
    setSuggestedDeposit,
    requiredDeposit,
    setRequiredDeposit,
    allowCustomDeposit,
    setAllowCustomDeposit,
    bountyAmount,
    setBountyAmount,
    handleSubmit,
    handleDelete,
  } = scope;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <header className="flex items-center justify-between border-b pb-2 mb-4">
        <h1 className="font-bold text-lg">Chỉnh sửa bài đăng</h1>
        <button
          className="text-sm px-3 py-1 border rounded"
          onClick={() => navigate("/account")}
        >
          Quay lại
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {/* Pet Name */}
        <div>
          <label className="block font-semibold mb-1">Tiêu đề bài viết *</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Mèo cam mập mờm"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block font-semibold mb-1">Loại bài đăng</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="adopt">Nhận nuôi</option>
            <option value="lost">Đi lạc</option>
            <option value="rescue">Cứu hộ</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block font-semibold mb-1">Trạng thái</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="available">available</option>
            <option value="reserved">reserved</option>
            <option value="delivered">delivered</option>
          </select>
          <p className="text-xs text-gray-600 mt-1">
            (Chỉ admin/hệ thống tự động thay đổi. Để mặc định "available" nếu không chắc.)
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block font-semibold mb-1">Mô tả</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả chi tiết về thú cưng, tính cách, yêu cầu nhận nuôi..."
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block font-semibold mb-1">Ảnh thú cưng</label>
          {existingImageUrl && (
            <div className="mb-2">
              <img
                src={existingImageUrl}
                alt="Current"
                className="w-32 h-32 object-cover rounded border"
              />
              <p className="text-xs text-gray-600 mt-1">Ảnh hiện tại</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="text-sm"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-gray-600 mt-1">
            Chọn ảnh mới nếu muốn thay đổi. Để trống nếu giữ ảnh cũ.
          </p>
        </div>

        {/* Category-specific: Deposit for Adoption */}
        {category === "adopt" && (
          <div className="border-t pt-4 space-y-3">
            <div className="p-3 bg-orange-50 border-2 border-orange-200 rounded-lg">
              <h3 className="font-bold text-orange-900 mb-2">💰 Tiền cọc nhận nuôi</h3>
              
              <div className="mb-3">
                <label className="block font-semibold mb-1 text-sm">
                  Số tiền cọc tối thiểu (đ)
                </label>
                <input
                  type="number"
                  step="10000"
                  min="0"
                  className="w-full border rounded px-3 py-2"
                  value={requiredDeposit}
                  onChange={(e) => setRequiredDeposit(e.target.value)}
                  placeholder="Ví dụ: 50000"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Số tiền cọc tối thiểu người nhận nuôi phải đặt. Để trống = không yêu cầu cọc.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCustomDeposit}
                    onChange={(e) => setAllowCustomDeposit(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">
                    Cho phép người nhận tự điều chỉnh số tiền cọc
                  </span>
                </label>
                <p className="text-xs text-gray-600 mt-1 ml-6">
                  Nếu tắt: Người nhận phải đặt cọc ĐÚNG số tiền bạn quy định.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Category-specific: Bounty for Lost/Rescue */}
        {(category === "lost" || category === "rescue") && (
          <div className="border-t pt-4">
            <div className="p-3 bg-amber-50 border-2 border-amber-200 rounded-lg">
              <h3 className="font-bold text-amber-900 mb-2">
                {category === "lost" ? "🎁 Tiền thưởng tìm kiếm" : "🔥 Hỗ trợ cứu hộ"}
              </h3>
              
              <div>
                <label className="block font-semibold mb-1 text-sm">
                  Số tiền thưởng (đ)
                </label>
                <input
                  type="number"
                  step="10000"
                  min="0"
                  className="w-full border rounded px-3 py-2"
                  value={bountyAmount}
                  onChange={(e) => setBountyAmount(e.target.value)}
                  placeholder="Ví dụ: 1000000"
                />
                <p className="text-xs text-gray-600 mt-1">
                  {category === "lost" 
                    ? "Số tiền thưởng cho người tìm thấy và xác nhận thành công."
                    : "Số tiền hỗ trợ cho người cứu hộ khi hoàn thành ca cứu hộ."}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-300 rounded p-2">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
          >
            {submitting ? "Đang lưu..." : "Lưu thay đổi"}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded font-semibold disabled:opacity-50"
          >
            Xóa bài
          </button>
        </div>
      </form>
    </div>
  );
}
