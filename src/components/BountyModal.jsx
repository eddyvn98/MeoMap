import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../supabaseClient";
import { createBounty } from "../bounty";

/**
 * Modal treo thưởng
 * - Nhập số tiền
 * - Tuỳ chọn ẩn danh
 * - Xác nhận
 */
export default function BountyModal({ caseId, caseOwnerId, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [createdToken, setCreatedToken] = useState(null);
  const [createdAmount, setCreatedAmount] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // Load user and wallet balance
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        // Check if user is the case owner
        if (caseOwnerId && data.user.id === caseOwnerId) {
          setError("❌ Chủ bài không thể treo thưởng cho bài của chính mình");
          return;
        }
        
        setCurrentUser(data.user);
        
        // Load wallet balance
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance_thuong")
          .eq("id", data.user.id)
          .single();
        
        setWalletBalance(profile?.balance_thuong || 0);
      } else {
        setError("Bạn cần đăng nhập để treo thưởng");
      }
    };
    getUser();
  }, [caseOwnerId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validation
      if (!currentUser) {
        throw new Error("Bạn phải đăng nhập để treo thưởng");
      }

      if (!amount || amount <= 0) {
        throw new Error("Vui lòng nhập số tiền hợp lệ");
      }

      const bountyAmount = parseInt(amount);
      if (bountyAmount > walletBalance) {
        throw new Error(`Số dư ví không đủ. Số dư hiện tại: ${walletBalance.toLocaleString()}đ. Vui lòng nạp tiền vào ví trước.`);
      }

      if (!agree) {
        throw new Error("Vui lòng đồng ý điều khoản");
      }

      // Create bounty - userId will be set by createBounty function
      const userId = anonymous ? null : currentUser?.id;
      const { success, bounty, error: bountyError } = await createBounty({
        caseId,
        amount: bountyAmount,
        userId,
        caseOwnerId,
      });

      if (!success) throw new Error(bountyError);

      setCreatedToken(bounty?.token || null);
      setCreatedAmount(bountyAmount);
      
      // Update local wallet balance
      setWalletBalance(walletBalance - bountyAmount);
      
      alert(`✅ Bạn đã treo thưởng ${bountyAmount.toLocaleString()}đ!\nMã tham chiếu: ${bounty?.token || "(đang tạo)"}\nSố dư còn lại: ${(walletBalance - bountyAmount).toLocaleString()}đ`);
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

        {!currentUser ? (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            <p className="font-semibold">⚠️ Bạn cần đăng nhập để treo thưởng</p>
            <p className="text-sm mt-2">Vui lòng đăng nhập trước khi sử dụng tính năng này.</p>
            <button
              onClick={onClose}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-600 mb-2">
              Treo thưởng để thu hút người cứu hộ. Nếu người cứu từ chối hoặc không ai nhận cứu, tiền sẽ hoàn lại.
            </p>

            {/* Wallet Balance Display */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-xs text-blue-700 font-semibold">💰 Số dư ví thưởng của bạn:</p>
              <p className="text-lg font-bold text-blue-800">{walletBalance.toLocaleString()}đ</p>
              <p className="text-xs text-blue-600 mt-1">Tiền treo thưởng sẽ được trừ từ số dư này</p>
            </div>

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
                  max={walletBalance}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tối đa: {walletBalance.toLocaleString()}đ
                </p>
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

              {createdToken && (
                <div className="mt-4 rounded border border-dashed border-orange-300 bg-orange-50 p-4 text-center">
                  <h4 className="text-orange-700 font-semibold">Mã tham chiếu: {createdToken}</h4>
                  <p className="text-sm text-orange-600 mt-1">
                    Chia sẻ mã này cho người cứu hộ để xác nhận thưởng.
                  </p>
                  <div className="mt-3 flex justify-center">
                    <div className="bg-white p-2 rounded shadow">
                      <QRCodeCanvas
                        value={JSON.stringify({ type: "bounty", token: createdToken, amount: createdAmount })}
                        size={150}
                        level="M"
                        includeMargin
                      />
                    </div>
                  </div>
                  {createdAmount ? (
                    <p className="mt-2 text-sm text-orange-700">
                      Giá trị treo thưởng: {createdAmount.toLocaleString()}đ
                    </p>
                  ) : null}
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
}
