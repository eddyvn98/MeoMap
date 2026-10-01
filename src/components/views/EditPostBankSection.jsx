export default function EditPostBankSection({ scope }) {
  const {
    category,
    bankAccountNumber,
    setBankAccountNumber,
    bankAccountName,
    setBankAccountName,
    bankName,
    setBankName,
    setBankQrFile,
    existingBankQr,
    bankQrFile,
  } = scope;

  return (
    <>
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
      
    </>
  );
}
