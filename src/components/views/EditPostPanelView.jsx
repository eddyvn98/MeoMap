/* eslint-disable no-unused-vars */
import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";

export default function EditPostPanelView({ scope }) {
  const {
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
  } = scope;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
        <h2 className="text-lg font-bold">✏️ Chỉnh sửa bài đăng</h2>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Form - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Pet Name */}
          <div>
            <label className="block font-semibold mb-1 text-sm">
              Tiêu đề bài viết *
            </label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Mèo cam mập mờm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block font-semibold mb-1 text-sm">
              Loại bài đăng
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="adopt">Nhận nuôi</option>
              <option value="lost">Đi lạc</option>
              <option value="rescue">Cứu hộ</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold mb-1 text-sm">Mô tả</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả chi tiết về thú cưng..."
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block font-semibold mb-1 text-sm">
              Ảnh thú cưng
            </label>
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
              Chọn ảnh mới để thay đổi
            </p>
          </div>

          {/* Category-specific: Deposit for Adoption */}
          {category === "adopt" && (
            <div className="border-t pt-4 space-y-3">
              <div className="p-3 bg-orange-50 border-2 border-orange-300 rounded-lg">
                <h3 className="font-bold text-orange-900 mb-1 text-sm">
                  💰 Tiền cọc nhận nuôi (Khuyến khích!)
                </h3>
                <p className="text-xs text-orange-800 mb-2 font-medium">
                  Cọc giúp chắc chắn người nhận thật sự nghiêm túc
                </p>

                <div className="mb-3">
                  <label className="block font-semibold mb-1 text-xs">
                    Số tiền cọc tối thiểu (đ)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    min="0"
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={requiredDeposit}
                    onChange={(e) => setRequiredDeposit(e.target.value)}
                    placeholder="Ví dụ: 50000"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    💡 Gợi ý: 50k-200k là tối ưu. Để trống = không yêu cầu cọc
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
                    <span className="text-xs font-medium">
                      Cho phép người nhận tự điều chỉnh số tiền cọc
                    </span>
                  </label>
                  <p className="text-xs text-gray-600 mt-1 ml-6">
                    Nếu tắt: Phải đặt cọc ĐÚNG số tiền quy định
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Category-specific: Bounty for Lost/Rescue */}
          {(category === "lost" || category === "rescue") && (
            <div className="border-t pt-4">
              <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-lg">
                <h3 className="font-bold text-amber-900 mb-1 text-sm">
                  {category === "lost"
                    ? "🎁 Tiền thưởng tìm kiếm (Khuyến khích!)"
                    : "🔥 Hỗ trợ cứu hộ (Quan trọng!)"}
                </h3>
                <p className="text-xs text-amber-800 mb-2 font-medium">
                  {category === "lost"
                    ? "Tiền thưởng sẽ khuyến khích mọi người chủ động tìm kiếm"
                    : "Tiền hỗ trợ tăng động lực cho người cứu hộ"}
                </p>

                <div>
                  <label className="block font-semibold mb-1 text-xs">
                    Số tiền thưởng (đ)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    min="0"
                    className="w-full border rounded px-3 py-2 text-sm"
                    value={bountyAmount}
                    onChange={(e) => setBountyAmount(e.target.value)}
                    placeholder="Ví dụ: 1000000"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    💡 {category === "lost" 
                      ? "Gợi ý: 100k-1M phù hợp. Để trống = không có thưởng" 
                      : "Gợi ý: 200k-1M phù hợp. Để trống = không có hỗ trợ"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bank Account Info for Direct Donations (Rescue only) */}
          {category === "rescue" && (
            <div className="border-t pt-4">
              <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                <h3 className="font-bold text-green-900 mb-1 text-sm">
                  🏦 Thông tin ngân hàng (Để nhận quyên góp trực tiếp)
                </h3>
                <p className="text-xs text-green-800 mb-3 font-medium">
                  Người khác có thể chuyển tiền trực tiếp vào tài khoản của bạn để hỗ trợ ca cứu hộ
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold mb-1 text-xs">
                      Số tài khoản ngân hàng
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2 text-sm"
                      value={bankAccountNumber}
                      onChange={(e) => setBankAccountNumber(e.target.value)}
                      placeholder="Ví dụ: 0123456789"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-xs">
                      Tên chủ tài khoản
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2 text-sm"
                      value={bankAccountName}
                      onChange={(e) => setBankAccountName(e.target.value)}
                      placeholder="Ví dụ: NGUYEN VAN A"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-xs">
                      Tên ngân hàng
                    </label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2 text-sm"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Ví dụ: Vietcombank, TPBank"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-xs">
                      QR Code thanh toán (Tùy chọn)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setBankQrFile(e.target.files?.[0] || null)}
                      className="w-full text-xs"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Upload QR code từ app ngân hàng để người khác quét và chuyển tiền dễ dàng
                    </p>
                    {existingBankQr && !bankQrFile && (
                      <div className="mt-2">
                        <p className="text-xs text-green-700 font-semibold">QR hiện tại:</p>
                        <img 
                          src={existingBankQr} 
                          alt="Bank QR" 
                          className="w-32 h-32 object-contain border rounded mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-red-600 text-sm bg-red-50 border border-red-300 rounded p-2">
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Footer - Action Buttons */}
      <div className="p-4 border-t bg-white sticky bottom-0">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border rounded font-semibold text-sm disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-semibold text-sm disabled:opacity-50"
          >
            {loading ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
