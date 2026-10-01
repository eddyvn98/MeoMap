import { formatVND } from "../services/walletService";

export default function CheckoutStepContent({
  step,
  cartItems,
  totalPrice,
  shippingInfo,
  handleShippingChange,
  wallet,
  needMoreMoney,
  totalAvailable,
  vouchers,
  selectedVoucherId,
  setSelectedVoucherId,
  setShowVoucherConversion,
  voucherAmount,
  finalAmount,
  setShowTopUp,
}) {
  return (
    <>
      {/* Step 1: Review Cart */}
      {step === 1 && (
      <div className="space-y-4">
      <h3 className="font-bold text-lg">Xem lại giỏ hàng</h3>
      {cartItems.map((item) => (
      <div
      key={item.product.id}
      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
      >
      <div>
      <p className="font-semibold">{item.product.name}</p>
      <p className="text-sm text-gray-600">
      {formatVND(item.product.price)} x {item.quantity}
      </p>
      </div>
      <p className="font-bold text-indigo-600">
      {formatVND(item.product.price * item.quantity)}
      </p>
      </div>
      ))}
      <div className="border-t pt-3 flex justify-between text-lg font-bold">
      <span>Tổng:</span>
      <span className="text-indigo-600">{formatVND(totalPrice)}</span>
      </div>
      </div>
      )}
      
      {/* Step 2: Shipping Info */}
      {step === 2 && (
      <div className="space-y-4">
      <h3 className="font-bold text-lg">Thông tin giao hàng</h3>
      <div>
      <label className="block text-sm font-semibold mb-1">
      Họ và tên <span className="text-red-500">*</span>
      </label>
      <input
      type="text"
      value={shippingInfo.fullName}
      onChange={(e) => handleShippingChange('fullName', e.target.value)}
      placeholder="Nguyễn Văn A"
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
      />
      </div>
      <div>
      <label className="block text-sm font-semibold mb-1">
      Số điện thoại <span className="text-red-500">*</span>
      </label>
      <input
      type="tel"
      value={shippingInfo.phone}
      onChange={(e) => handleShippingChange('phone', e.target.value)}
      placeholder="0901234567"
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
      />
      </div>
      <div>
      <label className="block text-sm font-semibold mb-1">
      Địa chỉ giao hàng <span className="text-red-500">*</span>
      </label>
      <textarea
      value={shippingInfo.address}
      onChange={(e) => handleShippingChange('address', e.target.value)}
      placeholder="123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
      rows={3}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
      />
      </div>
      <div>
      <label className="block text-sm font-semibold mb-1">
      Ghi chú (tùy chọn)
      </label>
      <textarea
      value={shippingInfo.notes}
      onChange={(e) => handleShippingChange('notes', e.target.value)}
      placeholder="Giao giờ hành chính, gọi trước 15 phút..."
      rows={2}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
      />
      </div>
      </div>
      )}
      
      {/* Step 3: Payment & Voucher */}
      {step === 3 && (
      <div className="space-y-4">
      <h3 className="font-bold text-lg">Phương thức thanh toán</h3>
      
      {/* Wallet Balance */}
      <div className="p-4 bg-gray-50 rounded-lg space-y-2">
      <p className="text-sm font-semibold">Số dư ví:</p>
      <div className="flex justify-between text-sm">
      <span>💳 Ví Chính:</span>
      <span className="font-semibold">{formatVND(wallet.balance_main)}</span>
      </div>
      <div className="flex justify-between text-sm">
      <span>🎁 Ví Thưởng:</span>
      <span className="font-semibold">{formatVND(wallet.balance_thuong)}</span>
      </div>
      <div className="flex justify-between text-sm text-gray-500">
      <span>🔒 Ví Cọc:</span>
      <span className="font-semibold">{formatVND(wallet.balance_coc)} (không dùng)</span>
      </div>
      <div className="border-t pt-2 flex justify-between font-bold">
      <span>Có thể dùng:</span>
      <span className={needMoreMoney ? 'text-red-600' : 'text-green-600'}>
      {formatVND(totalAvailable)}
      </span>
      </div>
      </div>
      
      {/* Voucher Selection */}
      {vouchers.length > 0 && (
      <div className="space-y-2">
      <label className="text-sm font-semibold">
      💳 Chọn voucher (tùy chọn)
      </label>
      <div className="max-h-40 overflow-y-auto space-y-2">
      <label className="flex items-center gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50">
      <input
      type="radio"
      name="voucher"
      checked={!selectedVoucherId}
      onChange={() => setSelectedVoucherId(null)}
      />
      <span className="text-sm">Không dùng voucher</span>
      </label>
      {vouchers.map((v) => (
      <label
      key={v.id}
      className="flex items-center gap-2 p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
      >
      <input
      type="radio"
      name="voucher"
      checked={selectedVoucherId === v.id}
      onChange={() => setSelectedVoucherId(v.id)}
      />
      <span className="text-sm">
      {v.code} - {formatVND(v.amount)}
      </span>
      </label>
      ))}
      </div>
      </div>
      )}
      
      {/* Inline voucher conversion */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
      <div className="flex items-start justify-between gap-3">
      <div>
      <p className="font-semibold text-amber-800">Chưa đủ voucher?</p>
      <p className="text-sm text-amber-700">
      Quy đổi từ Ví cọc hoặc Ví thưởng sang voucher ngay tại đây.
      </p>
      <p className="text-xs text-amber-700 mt-1">
      Ví cọc: {formatVND(wallet.balance_coc)} · Ví thưởng: {formatVND(wallet.balance_thuong)}
      </p>
      </div>
      <button
      onClick={() => setShowVoucherConversion(true)}
      className="px-3 py-2 bg-amber-600 text-white rounded font-semibold hover:bg-amber-700"
      >
      🎫 Đổi voucher ngay
      </button>
      </div>
      <p className="text-xs text-amber-700">
      Voucher mới tạo sẽ xuất hiện trong danh sách và được chọn tự động nếu trùng mã.
      </p>
      </div>
      
      {/* Price Summary */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
      <div className="flex justify-between text-sm">
      <span>Tổng giá:</span>
      <span className="font-semibold">{formatVND(totalPrice)}</span>
      </div>
      {voucherAmount > 0 && (
      <div className="flex justify-between text-sm text-green-700">
      <span>Giảm giá:</span>
      <span className="font-semibold">-{formatVND(voucherAmount)}</span>
      </div>
      )}
      <div className="border-t border-blue-200 pt-2 flex justify-between font-bold">
      <span>Cần thanh toán:</span>
      <span className={`text-xl ${needMoreMoney ? 'text-red-600' : 'text-green-600'}`}>
      {formatVND(finalAmount)}
      </span>
      </div>
      </div>
      
      {/* Warning if not enough money */}
      {needMoreMoney && (
      <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded text-sm">
      ⚠️ Số dư không đủ! Thiếu {formatVND(finalAmount - totalAvailable)}
      <br />
      <button
      onClick={() => setShowTopUp(true)}
      className="mt-2 px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
      >
      💰 Nạp Tiền Ngay
      </button>
      </div>
      )}
      </div>
      )}
      
      {/* Step 4: Confirm */}
      {step === 4 && (
      <div className="space-y-4">
      <h3 className="font-bold text-lg">Xác nhận đơn hàng</h3>
      
      {/* Shipping Info Summary */}
      <div className="p-4 bg-gray-50 rounded-lg">
      <p className="font-semibold mb-2">Thông tin giao hàng:</p>
      <p className="text-sm">👤 {shippingInfo.fullName}</p>
      <p className="text-sm">📞 {shippingInfo.phone}</p>
      <p className="text-sm">📍 {shippingInfo.address}</p>
      {shippingInfo.notes && (
      <p className="text-sm text-gray-600 mt-1">📝 {shippingInfo.notes}</p>
      )}
      </div>
      
      {/* Order Summary */}
      <div className="p-4 bg-blue-50 rounded-lg space-y-2">
      <p className="font-semibold mb-2">Chi tiết đơn hàng:</p>
      {cartItems.map((item) => (
      <div key={item.product.id} className="flex justify-between text-sm">
      <span>{item.product.name} x{item.quantity}</span>
      <span>{formatVND(item.product.price * item.quantity)}</span>
      </div>
      ))}
      {voucherAmount > 0 && (
      <div className="flex justify-between text-sm text-green-700">
      <span>Giảm giá voucher:</span>
      <span>-{formatVND(voucherAmount)}</span>
      </div>
      )}
      <div className="border-t pt-2 flex justify-between font-bold text-lg">
      <span>Tổng thanh toán:</span>
      <span className="text-indigo-600">{formatVND(finalAmount)}</span>
      </div>
      </div>
      </div>
      )}
      
    </>
  );
}
