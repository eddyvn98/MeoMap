import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
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
  const [method, setMethod] = useState("direct"); // chỉ dùng 'direct'
  const [note, setNote] = useState("");
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [anonymous, setAnonymous] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [createdToken, setCreatedToken] = useState(null);
  const [createdAmount, setCreatedAmount] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [petBankInfo, setPetBankInfo] = useState({
    bank_account_number: "",
    bank_account_name: "",
    bank_name: "",
    bank_qr_code_url: "",
  });

  // Load user and wallet balance
  useState(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUser(data.user);
        
        // Load wallet balance
        const { data: profile } = await supabase
          .from("profiles")
          .select("balance_thuong")
          .eq("id", data.user.id)
          .single();
        
        setWalletBalance(profile?.balance_thuong || 0);
      }

      // Load pet bank info
      const { data: pet } = await supabase
        .from("pets")
        .select("bank_account_number, bank_account_name, bank_name, bank_qr_code_url")
        .eq("id", caseId)
        .single();
      if (pet) {
        setPetBankInfo({
          bank_account_number: pet.bank_account_number || "",
          bank_account_name: pet.bank_account_name || "",
          bank_name: pet.bank_name || "",
          bank_qr_code_url: pet.bank_qr_code_url || "",
        });
      }
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
      // Không bắt buộc số tiền cho chuyển thẳng
      const donationAmount = amount ? parseInt(amount) : null;

      // Không kiểm tra ví vì không qua hệ thống

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

      // Thêm donation (chuyển thẳng)
      const { success, donation, error: donationError } = await addDonation({
        caseId,
        amount: donationAmount,
        method: 'direct',
        note,
        receiptUrl,
        userId,
      });

      if (!success) throw new Error(donationError);

      setCreatedToken(donation?.token || null);
      setCreatedAmount(donationAmount || undefined);
      
      const amountText = donationAmount ? `${(donationAmount).toLocaleString()}đ` : `--`;
      const remainingMsg = method === "system" && donationAmount ? `\nSố dư còn lại: ${(walletBalance - donationAmount).toLocaleString()}đ` : "";
      alert(`✅ Cảm ơn bạn đã góp ${amountText}!\nMã tham chiếu: ${donation?.token || "(đang tạo)"}${remainingMsg}`);
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

        {/* Info box for guest users */}
        {!currentUser && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-300 rounded text-xs">
            <p className="font-semibold text-blue-900 mb-1">👋 Bạn chưa đăng nhập</p>
            <p className="text-blue-800">
              Bạn vẫn có thể góp bằng cách chọn <strong>"Chuyển thẳng cho người cứu"</strong> 
              và chuyển khoản trực tiếp.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-3 p-2 bg-red-100 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          {/* Số tiền - chỉ bắt buộc khi qua hệ thống */}
          <div>
            <label className="block font-semibold mb-1">Số tiền (VND){method === "system" ? " *" : " (tuỳ chọn)"}</label>
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
            <p className="text-xs text-gray-500 mt-1">{method === "system" ? "Góp qua hệ thống cần nhập số tiền" : "Chuyển thẳng có thể không nhập số tiền"}</p>
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
                  disabled={loading || !currentUser}
                />
                <span>✔ Góp qua hệ thống {!currentUser && <span className="text-red-600">(cần đăng nhập)</span>}</span>
              </label>
            </div>
            
            {/* Giải thích cho từng phương thức */}
            {method === "direct" && (
              <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                ℹ️ Chuyển khoản trực tiếp: Không cần đăng nhập, chỉ cần upload ảnh biên lai (tùy chọn)
              </p>
            )}
            
            {method === "system" && !currentUser && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-300 rounded">
                <p className="text-xs text-yellow-800 font-semibold">⚠️ Bạn cần đăng nhập để góp qua hệ thống</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Hoặc chọn "Chuyển thẳng cho người cứu" để góp mà không cần đăng nhập
                </p>
              </div>
            )}
            
            {method === "system" && currentUser && (
              <>
                <p className="text-xs text-blue-600 mt-2">💡 Tiền sẽ được gửi vào ví ca và chuyển toàn bộ cho người cứu khi kết thúc</p>
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs text-blue-700 font-semibold">💰 Số dư ví của bạn:</p>
                  <p className="text-sm font-bold text-blue-800">{walletBalance.toLocaleString()}đ</p>
                </div>
              </>
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
              {/* Bank info guidance */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs text-blue-900 font-semibold mb-1">🏦 Chuyển khoản trực tiếp cho người cứu</p>
                {petBankInfo.bank_account_number ? (
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="bg-white border rounded p-2">
                      <span className="text-gray-600">Ngân hàng:</span>
                      <span className="ml-2 font-semibold">{petBankInfo.bank_name || "--"}</span>
                    </div>
                    <div className="bg-white border rounded p-2">
                      <span className="text-gray-600">Số tài khoản:</span>
                      <span className="ml-2 font-semibold">{petBankInfo.bank_account_number}</span>
                    </div>
                    <div className="bg-white border rounded p-2">
                      <span className="text-gray-600">Tên chủ TK:</span>
                      <span className="ml-2 font-semibold">{petBankInfo.bank_account_name || "--"}</span>
                    </div>
                    {petBankInfo.bank_qr_code_url && (
                      <div className="text-center">
                        <img src={petBankInfo.bank_qr_code_url} alt="QR chuyển khoản" className="w-40 h-40 mx-auto object-contain border rounded" />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-blue-700">Người cứu chưa cập nhật thông tin ngân hàng. Bạn có thể nhắn họ để nhận QR/chuyển khoản.</p>
                )}
              </div>
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

        {createdToken && (
          <div className="mt-4 p-3 border rounded bg-orange-50 text-center space-y-2">
            <p className="text-sm font-semibold text-orange-800">Mã tham chiếu của bạn</p>
            <p className="text-lg font-bold text-orange-700">MEO-{createdToken}</p>
            <p className="text-xs text-gray-600">Dán mã này vào nội dung chuyển khoản để phân luồng đúng ca.</p>
            <div className="flex justify-center">
              <QRCodeCanvas value={`MEO-${createdToken}`} size={140} includeMargin={true} />
            </div>
            {createdAmount && (
              <p className="text-xs text-gray-700">Số tiền: {createdAmount.toLocaleString()}đ</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
