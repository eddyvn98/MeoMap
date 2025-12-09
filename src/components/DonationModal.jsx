import { useState } from "react";
import { supabase } from "../supabaseClient";
import { addDonation, uploadReceiptImage } from "../donation";

/**
 * Modal góp tiền
 * - Form nhập số tiền
 * - Chọn hình thức: chuyển thẳng / qua hệ thống
 * - Upload ảnh biên lai (nếu chuyển thẳng)
 * - Ghi chú
 * - Điều khoản
 */
export default function DonationModal({ caseId, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("direct"); // 'direct' | 'system'
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [anonymous, setAnonymous] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Load user
  useState(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUser(data.user);
    };
    getUser();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setReceiptPreview(ev.target?.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validation
      if (!amount || amount <= 0) {
        throw new Error("Vui lòng nhập số tiền hợp lệ");
      }

      if (!agree) {
        throw new Error("Vui lòng đồng ý điều khoản");
      }

      let receiptUrl = null;

      // Upload ảnh biên lai nếu chọn chuyển thẳng
      if (method === "direct" && receiptFile) {
        const { success, url, error: uploadError } = await uploadReceiptImage(
          receiptFile,
          caseId
        );
        if (!success) throw new Error(uploadError);
        receiptUrl = url;
      }

      // Thêm donation
      const userId = anonymous ? null : currentUser?.id;
      const { success, error: donationError } = await addDonation({
        caseId,
        amount: parseInt(amount),
        method,
        note,
        receiptUrl,
        userId,
      });

      if (!success) throw new Error(donationError);

      alert(`✅ Cảm ơn bạn đã góp ${parseInt(amount).toLocaleString()}đ!`);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 max-h-96 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">💰 Đóng góp cho ca cứu hộ</h2>

        {error && (
          <div className="mb-3 p-2 bg-red-100 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          {/* Số tiền */}
          <div>
            <label className="block font-semibold mb-1">Số tiền (VND) *</label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ví dụ: 100000"
              className="w-full border rounded px-3 py-2 text-sm"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Góp bao nhiêu cũng được, không có mức tối thiểu</p>
          </div>

          {/* Hình thức */}
          <div>
            <label className="block font-semibold mb-2">Hình thức *</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="direct"
                  checked={method === "direct"}
                  onChange={(e) => setMethod(e.target.value)}
                  disabled={loading}
                />
                <span>✔ Chuyển thẳng cho người cứu</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="system"
                  checked={method === "system"}
                  onChange={(e) => setMethod(e.target.value)}
                  disabled={loading}
                />
                <span>✔ Góp qua hệ thống (an toàn hơn)</span>
              </label>
            </div>
            {method === "system" && (
              <p className="text-xs text-blue-600 mt-2">💡 Tiền sẽ được gửi vào ví ca và chuyển toàn bộ cho người cứu khi kết thúc</p>
            )}
          </div>

          {/* Ảnh biên lai (chỉ khi chuyển thẳng) */}
          {method === "direct" && (
            <div>
              <label className="block font-semibold mb-1">Ảnh biên lai (tuỳ chọn)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={loading}
                className="text-xs"
              />
              {receiptPreview && (
                <img
                  src={receiptPreview}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded mt-2"
                />
              )}
            </div>
          )}

          {/* Ghi chú */}
          <div>
            <label className="block font-semibold mb-1">Ghi chú (tuỳ chọn)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Cố lên! 💪"
              rows={2}
              className="w-full border rounded px-3 py-2 text-xs"
              disabled={loading}
            />
          </div>

          {/* Ẩn danh */}
          {currentUser && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={(e) => setAnonymous(e.target.checked)}
                disabled={loading}
              />
              <span className="text-xs">Góp ẩn danh</span>
            </label>
          )}

          {/* Điều khoản */}
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              disabled={loading}
              className="mt-1"
            />
            <span className="text-xs text-gray-600">
              Tôi đồng ý rằng góp tự nguyện, không hoàn lại
            </span>
          </label>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading || !agree}
              className="flex-1 bg-orange-500 text-white py-2 rounded font-semibold text-sm hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "💳 Góp ngay"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 border rounded py-2 text-sm hover:bg-gray-100"
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
