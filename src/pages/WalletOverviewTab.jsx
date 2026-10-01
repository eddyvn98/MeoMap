import { formatVND } from "../services/walletService";

export default function WalletOverviewTab({ selectedTab, balanceCoc, balanceThuong }) {
  return (
    <>
      {/* Overview Tab */}
      {selectedTab === "overview" && (
      <div className="space-y-4">
      <div className="p-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg">
      <div className="text-sm opacity-90">Số dư COC (Cọc)</div>
      <div className="text-3xl font-bold">{formatVND(balanceCoc)}</div>
      <div className="text-xs opacity-75 mt-2">Tiền cọc (không rút được)</div>
      </div>
      
      <div className="p-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg">
      <div className="text-sm opacity-90">Số dư THƯỞNG (Rút được)</div>
      <div className="text-3xl font-bold">{formatVND(balanceThuong)}</div>
      <div className="text-xs opacity-75 mt-2">Tiền thưởng (có thể rút)</div>
      </div>
      
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
      <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Cách hoạt động</h3>
      <ul className="text-sm text-blue-800 space-y-1">
      <li>• <strong>Balance COC:</strong> Tiền cọc khi nhận nuôi mèo. Không thể rút.</li>
      <li>• <strong>Balance THƯỞNG:</strong> Tiền thưởng từ hệ thống. Có thể rút.</li>
      <li>• Tạo lệnh rút → Admin chuyển tiền → Bạn xác nhận nhận tiền → Hoàn thành</li>
      </ul>
      </div>
      </div>
      )}
      
    </>
  );
}
