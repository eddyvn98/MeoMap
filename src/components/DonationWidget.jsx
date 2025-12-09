import { useState, useEffect } from "react";
import { getDonationStats, getCaseWalletBalance } from "../donation";
import DonationModal from "./DonationModal";

/**
 * Widget hiển thị:
 * - Tình trạng ca
 * - Tổng tiền đã góp
 * - Số người đã góp
 * - Nút "Đóng góp ngay"
 */
export default function DonationWidget({ caseId, isOwner, onCaseClosed }) {
  const [stats, setStats] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load stats
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { stats: s } = await getDonationStats(caseId);
      const { balance } = await getCaseWalletBalance(caseId);
      setStats(s || { totalDonated: 0, donorCount: 0 });
      setWalletBalance(balance || 0);
      setLoading(false);
    };
    load();
  }, [caseId]);

  // Refresh sau khi có donation mới
  const handleDonationSuccess = () => {
    // Reload stats
    const load = async () => {
      const { stats: s } = await getDonationStats(caseId);
      const { balance } = await getCaseWalletBalance(caseId);
      setStats(s || { totalDonated: 0, donorCount: 0 });
      setWalletBalance(balance || 0);
    };
    load();
  };

  if (loading) return <div className="text-xs text-gray-500">Đang tải...</div>;

  return (
    <div className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
      {/* Header */}
      <div className="space-y-3 mb-4">
        {/* Status */}
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
          <span className="font-semibold text-orange-900">Đang cứu hộ</span>
        </div>

        {/* Total donated */}
        <div className="text-center">
          <p className="text-xs text-orange-700 font-semibold">Tổng số tiền đã góp</p>
          <p className="text-3xl font-bold text-orange-600">
            {(stats?.totalDonated || 0).toLocaleString()}đ
          </p>
        </div>

        {/* Donor count */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-orange-700">👥 {stats?.donorCount || 0} người đã góp</span>
        </div>

        {/* Wallet info (if owner or system donations exist) */}
        {(isOwner || stats?.systemCount > 0) && (
          <div className="p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
            💰 Trong ví hệ thống: <span className="font-bold">{walletBalance.toLocaleString()}đ</span>
            {isOwner && <span className="ml-2 text-[11px] text-yellow-700">(Bạn có thể rút hoặc nhận khi kết thúc ca)</span>}
          </div>
        )}
      </div>

      {/* Nút góp & kết thúc (nếu owner) */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowModal(true)}
          className="flex-1 px-4 py-2 bg-orange-500 text-white rounded font-semibold text-sm hover:bg-orange-600"
        >
          🔘 Đóng góp ngay
        </button>

        {isOwner && (
          <button
            onClick={onCaseClosed}
            className="px-4 py-2 bg-red-500 text-white rounded font-semibold text-sm hover:bg-red-600"
            title="Kết thúc ca cứu hộ"
          >
            ⏹ Kết thúc
          </button>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <DonationModal
          caseId={caseId}
          onClose={() => setShowModal(false)}
          onSuccess={handleDonationSuccess}
        />
      )}
    </div>
  );
}
