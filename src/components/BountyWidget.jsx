import { useState, useEffect } from "react";
import { getBountyStats, acceptBounties, rejectBounty } from "../bounty";
import BountyModal from "./BountyModal";
import { supabase } from "../supabaseClient";

/**
 * Widget hiển thị tiền TREO THƯỞNG / HỖ TRỢ BAN ĐẦU
 * Mục đích: Thu hút người cứu
 * 
 * - Tổng tiền đang treo
 * - Số người treo thưởng
 * - Nút treo thưởng (chỉ cho user khác, không cho owner)
 * - (Nếu là người cứu) Nút nhận hoặc từ chối
 */
export default function BountyWidget({ caseId, caseOwnerId, isRescuer = false, onBountiesAccepted }) {
  const [stats, setStats] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedBountyIds, setSelectedBountyIds] = useState([]); // Bounties to accept
  const [currentUserId, setCurrentUserId] = useState(null);

  // Load stats and current user
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { stats: s } = await getBountyStats(caseId);
      setStats(s || { totalAvailable: 0, availableCount: 0, totalAccepted: 0, allBounties: [] });
      
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      
      setLoading(false);
    };
    load();
  }, [caseId]);

  const handleAddBounty = () => {
    setShowModal(true);
  };

  const handleRefresh = async () => {
    const { stats: s } = await getBountyStats(caseId);
    setStats(s || { totalAvailable: 0, availableCount: 0, totalAccepted: 0, allBounties: [] });
  };

  const handleAcceptSelected = async () => {
    if (selectedBountyIds.length === 0) {
      alert("Vui lòng chọn thưởng để nhận");
      return;
    }

    const { success, error } = await acceptBounties(selectedBountyIds);
    if (!success) {
      alert("Lỗi: " + error);
      return;
    }

    alert(`✅ Bạn đã nhận ${selectedBountyIds.length} khoản thưởng!`);
    setSelectedBountyIds([]);
    onBountiesAccepted?.();
    await handleRefresh();
  };

  const handleReject = async (bountyId) => {
    if (!confirm("Bạn có chắc muốn từ chối khoản thưởng này?")) return;

    const { success, error } = await rejectBounty(bountyId, "Từ chối");
    if (!success) {
      alert("Lỗi: " + error);
      return;
    }

    alert("✅ Đã từ chối. Tiền sẽ hoàn lại cho người treo.");
    await handleRefresh();
  };

  if (loading) return <div className="text-xs text-gray-500">Đang tải...</div>;

  const availableBounties = stats?.allBounties?.filter((b) => b.status === "available") || [];

  return (
    <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
      {/* Header */}
      <div className="space-y-3 mb-4">
        {/* Title */}
        <h3 className="font-bold text-blue-900 text-lg">🎁 Tiền treo thưởng & hỗ trợ ban đầu</h3>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 bg-blue-100 rounded">
            <p className="text-xs text-blue-700 font-semibold">Đang treo</p>
            <p className="text-2xl font-bold text-blue-600">
              {(stats?.totalAvailable || 0).toLocaleString()}đ
            </p>
          </div>
          <div className="text-center p-2 bg-blue-100 rounded">
            <p className="text-xs text-blue-700 font-semibold">Người treo</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats?.availableCount || 0}
            </p>
          </div>
        </div>

        {/* Nếu là rescuer, hiển thị bounties chưa nhận */}
        {isRescuer && availableBounties.length > 0 && (
          <div className="p-3 bg-green-50 border border-green-300 rounded text-xs space-y-2">
            <p className="font-semibold text-green-900">
              📌 {availableBounties.length} khoản thưởng đang chờ bạn:
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {availableBounties.map((bounty) => (
                <div
                  key={bounty.id}
                  className="flex items-center justify-between p-2 bg-white border border-green-200 rounded"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBountyIds.includes(bounty.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBountyIds([...selectedBountyIds, bounty.id]);
                        } else {
                          setSelectedBountyIds(selectedBountyIds.filter((id) => id !== bounty.id));
                        }
                      }}
                    />
                    <span className="font-bold text-green-700">
                      {bounty.amount.toLocaleString()}đ
                    </span>
                  </div>
                  <button
                    onClick={() => handleReject(bounty.id)}
                    className="px-2 py-1 bg-red-400 text-white text-xs rounded hover:bg-red-500"
                  >
                    Từ chối
                  </button>
                </div>
              ))}
            </div>

            {selectedBountyIds.length > 0 && (
              <button
                onClick={handleAcceptSelected}
                className="w-full px-3 py-2 bg-green-500 text-white rounded font-semibold text-sm hover:bg-green-600"
              >
                ✔ Nhận {selectedBountyIds.length} khoản ({selectedBountyIds.reduce((sum, id) => {
                  const bounty = availableBounties.find((b) => b.id === id);
                  return sum + (bounty?.amount || 0);
                }, 0).toLocaleString()}đ)
              </button>
            )}
          </div>
        )}

        {/* Nếu rescuer nhưng không có bounty, show message */}
        {isRescuer && availableBounties.length === 0 && (
          <div className="p-2 bg-gray-100 text-gray-700 text-xs rounded text-center">
            Hiện chưa có khoản thưởng nào. Cộng đồng sẽ treo thưởng để hỗ trợ bạn! 💪
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        {currentUserId && currentUserId === caseOwnerId ? (
          <div className="flex-1 px-4 py-2 bg-gray-200 text-gray-600 rounded font-semibold text-sm text-center">
            ℹ️ Chủ bài không thể treo thưởng thêm
          </div>
        ) : (
          <button
            onClick={handleAddBounty}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded font-semibold text-sm hover:bg-blue-600"
          >
            🎁 Treo thưởng
          </button>
        )}
        <button
          onClick={handleRefresh}
          className="px-3 py-2 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
          title="Làm mới"
        >
          🔄
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <BountyModal
          caseId={caseId}
          caseOwnerId={caseOwnerId}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
