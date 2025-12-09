import { useState } from "react";
import { supabase } from "../supabaseClient";
import { createBounty } from "../bounty";

/**
 * Modal treo thưởng
 * - Nhập số tiền
 * - Tuỳ chọn ẩn danh
 * - Xác nhận
 */
export default function BountyModal({ caseId, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
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

      // Create bounty
      const userId = anonymous ? null : currentUser?.id;
      const { success, error: bountyError } = await createBounty({
        caseId,
        amount: parseInt(amount),
        userId,
      });

      if (!success) throw new Error(bountyError);

      alert(`✅ Bạn đã treo thưởng ${parseInt(amount).toLocaleString()}đ!`);
      onSuccess?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h2 className="text-lg font-bold mb-4">🎁 Treo thưởng</h2>

        <p className="text-xs text-gray-600 mb-4">
          Treo thưởng để thu hút người cứu hộ. Nếu người cứu từ chối hoặc không ai nhận cứu, tiền sẽ hoàn lại.
        </p>

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
              min="10000"
              step="10000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ví dụ: 500000"
              className="w-full border rounded px-3 py-2 text-sm"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">Treo bao nhiêu cũng được</p>
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
              <span className="text-xs">Treo ẩn danh</span>
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
              Tôi đồng ý: Nếu người cứu từ chối hoặc không ai nhận cứu, tiền sẽ hoàn lại. Treo thưởng tự nguyện, không hoàn lại nếu bị chấp nhận.
            </span>
          </label>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading || !agree}
              className="flex-1 bg-blue-500 text-white py-2 rounded font-semibold text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Đang xử lý..." : "🎁 Treo thưởng"}
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
