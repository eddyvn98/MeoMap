import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import  {
  adminListWithdrawals,
  adminApproveWithdrawal,
  adminRejectWithdrawal,
  adminCompleteWithdrawal,
  formatVND,
  getWithdrawalStatusDisplay,
} from '../services/walletService';

export default function AdminWithdrawalsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfiles, setUserProfiles] = useState({});

  const loadData = async () => {
    setLoading(true);
    setError('');

    // Optional: check admin role here if you have roles
    const { data: authData } = await supabase.auth.getUser();
    if (!authData?.user) {
      setError('Bạn cần đăng nhập bằng tài khoản admin');
      setLoading(false);
      return;
    }

    // Check role (requires profiles.role to be 'admin')
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profile?.role !== 'admin') {
      setIsAdmin(false);
      setError('Bạn không có quyền truy cập trang này');
      setLoading(false);
      return;
    } else {
      setIsAdmin(true);
    }

    const result = await adminListWithdrawals(filterStatus);
    if (!result.success) {
      setError(result.error);
      setRequests([]);
      setLoading(false);
      return;
    }

    setRequests(result.requests);

    // Load user profiles for display
    const userIds = result.requests.map(r => r.user_id);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', userIds);
      const profileMap = {};
      profiles?.forEach(p => { profileMap[p.id] = p; });
      setUserProfiles(profileMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const handleApprove = async (req) => {
    const note = prompt('Ghi chú admin (tùy chọn):', 'Đã chuyển khoản');
    const result = await adminApproveWithdrawal(req.id, note || null);
    if (!result.success) {
      alert('Lỗi duyệt: ' + result.error);
      return;
    }
    await loadData();
  };

  const handleReject = async (req) => {
    const note = prompt('Lý do từ chối:', 'Thông tin không hợp lệ');
    const result = await adminRejectWithdrawal(req.id, note || null);
    if (!result.success) {
      alert('Lỗi từ chối: ' + result.error);
      return;
    }
    await loadData();
  };

  const handleComplete = async (req) => {
    const transactionId = prompt('Nhập mã giao dịch (Reference/TxID):', '');
    if (!transactionId || !transactionId.trim()) {
      alert('Vui lòng nhập mã giao dịch để xác thực');
      return;
    }
    const note = `TxID: ${transactionId.trim()}`;
    const result = await adminCompleteWithdrawal(req.id, note);
    if (!result.success) {
      alert('Lỗi hoàn tất: ' + result.error);
      return;
    }
    alert('✅ Đã đánh dấu hoàn tất. Mã giao dịch đã lưu.');
    await loadData();
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý rút tiền</h1>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
          >
            🔄 Làm mới
          </button>
          <button
            onClick={() => navigate('/admin/reports')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            ← Admin Reports
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">Lọc theo trạng thái:</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        >
          <option value="pending">Đang chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="completed">Hoàn tất</option>
          <option value="rejected">Từ chối</option>
          <option value="">Tất cả</option>
        </select>
      </div>

      {!isAdmin ? (
        <div className="text-red-600">{error || 'Bạn không có quyền truy cập'}</div>
      ) : loading ? (
        <div>Đang tải...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : requests.length === 0 ? (
        <div className="text-gray-600">Không có yêu cầu.</div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const statusDisplay = getWithdrawalStatusDisplay(req.status);
            return (
              <div key={req.id} className="p-4 border rounded-lg bg-white">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-bold text-lg">{formatVND(req.amount)}</div>
                    
                    {/* User Info */}
                    <div className="mt-2 p-3 bg-blue-50 rounded text-sm">
                      <div className="font-medium">👤 Thông tin người yêu cầu:</div>
                      <div className="text-xs text-gray-700 mt-1">
                        <div>Tên: <strong>{userProfiles[req.user_id]?.display_name || req.user_id.slice(0, 8)}</strong></div>
                        <div>Email: <strong>{userProfiles[req.user_id]?.email || 'N/A'}</strong></div>
                        <div>STK: <strong>{req.bank_account}</strong></div>
                        <div>Ngân hàng: <strong>{req.bank_name}</strong></div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 mt-2">
                      Yêu cầu lúc: {new Date(req.requested_at || req.created_at).toLocaleString('vi-VN')}
                    </div>
                    {req.admin_note && (
                      <div className="mt-2 text-xs text-gray-700">
                        <span className="font-medium">Ghi chú:</span> {req.admin_note}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium ${statusDisplay.color}`}>
                      {statusDisplay.icon} {statusDisplay.text}
                    </span>
                    {req.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(req)}
                          className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          Duyệt
                        </button>
                        <button
                          onClick={() => handleReject(req)}
                          className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                    {req.status === 'approved' && (
                      <button
                        onClick={() => handleComplete(req)}
                        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Đánh dấu hoàn tất
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
