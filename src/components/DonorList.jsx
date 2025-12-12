import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { getDonationsForCase } from "../donation";
import { getSupportMessages, saveSupportMessage } from "../services/supportMessages";

/**
 * Danh sách người đã góp (feed format)
 * Hiển thị:
 * - Tên người góp (hoặc "Ẩn danh")
 * - Số tiền
 * - Thời gian
 * - Badge: "Chuyển thẳng" / "Qua hệ thống"
 * - Ảnh biên lai (nếu có)
 */
export default function DonorList({ caseId }) {
  const [donations, setDonations] = useState([]);
  const [donorProfiles, setDonorProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [supportMessage, setSupportMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [supportMessages, setSupportMessages] = useState([]);
  const [supportProfiles, setSupportProfiles] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  // Load current user
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    load();
  }, []);

  // Load donations (chỉ lấy quyên góp qua hệ thống)
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { donations: d } = await getDonationsForCase(caseId);
      
      // Lọc chỉ lấy donations qua hệ thống (method='system')
      const systemDonations = d ? d.filter(x => x.method === 'system') : [];
      setDonations(systemDonations);

      // Load donor profiles (if not anonymous)
      if (systemDonations && systemDonations.length > 0) {
        const uniqueUserIds = [...new Set(systemDonations.map((x) => x.user_id).filter(Boolean))];
        if (uniqueUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, display_name, avatar_url")
            .in("id", uniqueUserIds);

          const profileMap = {};
          profiles?.forEach((p) => {
            profileMap[p.id] = p;
          });
          setDonorProfiles(profileMap);
        }
      }

      setLoading(false);
    };
    load();
  }, [caseId]);

  // Load support messages
  useEffect(() => {
    const loadMessages = async () => {
      const { messages, profiles, error } = await getSupportMessages(caseId);
      if (!error) {
        setSupportMessages(messages || []);
        setSupportProfiles(profiles || {});
      }
    };
    loadMessages();
  }, [caseId]);

  if (loading) return <div className="text-xs text-gray-500">Đang tải...</div>;

  if (donations.length === 0) {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
          <p className="text-center font-semibold text-orange-900">🙏 Bảng cảm ơn những người đóng góp</p>
          <p className="text-center text-sm text-orange-700">Chưa có ai đóng góp qua hệ thống. Bạn sẽ là người đầu tiên?</p>
        </div>
        <details className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
          <summary className="cursor-pointer font-semibold text-gray-700">❓ "Bảng cảm ơn" là gì?</summary>
          <div className="space-y-2 mt-2 text-gray-600 leading-relaxed">
            <p><strong>= Danh sách những người đóng góp tiền qua hệ thống MeoMap</strong></p>
            <p>Hiển thị:</p>
            <ul className="ml-3 space-y-1">
              <li>• Tên người đóng góp (hoặc "Ẩn danh" nếu không muốn hiển thị)</li>
              <li>• Số tiền đóng góp</li>
              <li>• Thời gian đóng góp</li>
            </ul>
            <p className="mt-2"><strong>💡 Lưu ý:</strong> Chỉ những đóng góp <strong>qua hệ thống</strong> mới được thống kê ở đây (không bao gồm chuyển khoản trực tiếp).</p>
            <p className="mt-2">Nếu không có người nhận ca cứu, tiền sẽ được <strong>hoàn về ví</strong> của bạn.</p>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Title & explanation */}
      <div className="space-y-2">
        <h3 className="font-bold text-orange-900 text-sm">🙏 Bảng cảm ơn những người đóng góp</h3>
        <p className="text-xs text-gray-600">Danh sách những người đóng góp qua hệ thống MeoMap</p>
      </div>

      {/* Donations feed */}
      <div className="space-y-2">
        {donations.map((donation) => {
        const donor = donation.user_id && !donation.anonymous ? donorProfiles[donation.user_id] : null;
        const displayName = donation.anonymous 
          ? "Ẩn danh" 
          : (donor?.display_name || (donation.user_id ? "Người dùng" : "Ẩn danh"));

        const timeAgo = (() => {
          const now = new Date();
          const created = new Date(donation.created_at);
          const diffMs = now - created;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMins / 60);
          const diffDays = Math.floor(diffHours / 24);

          if (diffMins < 1) return "Vừa xong";
          if (diffMins < 60) return `${diffMins} phút trước`;
          if (diffHours < 24) return `${diffHours} giờ trước`;
          return `${diffDays} ngày trước`;
        })();

        return (
          <div
            key={donation.id}
            className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm space-y-2"
          >
            {/* Header: Name + Amount + Time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {donor?.avatar_url && !donation.anonymous && (
                  <img
                    src={donor.avatar_url}
                    alt={displayName}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                )}
                {donation.anonymous && (
                  <span className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-700 font-bold">?</span>
                )}
                <span className="font-semibold text-gray-900">{displayName}</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-orange-600 text-base">
                  {donation.amount.toLocaleString()}đ
                </span>
                <span className="text-xs text-gray-500 whitespace-nowrap">{timeAgo}</span>
              </div>
            </div>

            {/* Badge: System donation */}
            <div className="flex gap-2">
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                ✔ Qua hệ thống
              </span>
            </div>

            {/* Receipt image (if direct) - KHÔNG HIỂN THỊ vì chỉ lấy system donations */}
            
            {/* Note */}
            {donation.note && (
              <p className="text-gray-700 italic text-xs">"{donation.note}"</p>
            )}
          </div>
        );
      })}
      </div>

      {/* Help section at bottom */}
      <details className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
        <summary className="cursor-pointer font-semibold text-gray-700">❓ Bảng cảm ơn là gì?</summary>
        <div className="space-y-1 mt-2 text-gray-600 text-xs">
          <div><strong>Tên:</strong> Người đóng góp (hoặc "Ẩn danh" nếu họ chọn không hiển thị tên)</div>
          <div><strong>Số tiền:</strong> Số tiền họ đóng góp qua hệ thống</div>
          <div><strong>Thời gian:</strong> Khi nào họ đóng góp (vừa xong, X phút trước, X giờ trước...)</div>
          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded">
            <strong>💡 Chỉ hiển thị quyên góp "qua hệ thống":</strong> Các đóng góp qua chuyển khoản trực tiếp không hiển thị ở đây.
          </div>
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
            <strong>🔄 Hoàn tiền:</strong> Nếu không có người nhận ca cứu, tiền sẽ được hoàn về ví của bạn.
          </div>
        </div>
      </details>

      {/* Input để gửi lời cảm ơn/động viên */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
        <label className="block font-semibold text-blue-900 text-sm">
          💬 Gửi lời cảm ơn / động viên
        </label>
        <textarea
          placeholder="Viết lời cảm ơn, khích lệ, động viên... (tùy chọn)"
          value={supportMessage}
          onChange={(e) => setSupportMessage(e.target.value)}
          className="w-full p-2 border border-blue-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
          rows="3"
        />
        <button
          onClick={async () => {
            if (supportMessage.trim() && currentUser) {
              setSendingMessage(true);
              const { success, error } = await saveSupportMessage(
                caseId,
                currentUser.id,
                supportMessage,
                false
              );
              if (success) {
                setSupportMessage("");
                // Reload support messages
                const { messages, profiles, error: loadError } = await getSupportMessages(caseId);
                if (!loadError) {
                  setSupportMessages(messages || []);
                  setSupportProfiles(profiles || {});
                }
              } else {
                alert("Lỗi khi gửi lời cảm ơn: " + error);
              }
              setSendingMessage(false);
            }
          }}
          disabled={sendingMessage || !supportMessage.trim() || !currentUser}
          className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm font-semibold hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {sendingMessage ? "Đang gửi..." : "✉️ Gửi lời cảm ơn"}
        </button>
        <p className="text-xs text-blue-700 italic">
          💡 Lời cảm ơn của bạn sẽ giúp động viên người cứu hộ!
        </p>
      </div>

      {/* Hiển thị lời cảm ơn/động viên */}
      {supportMessages && supportMessages.length > 0 && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
          <h4 className="font-semibold text-purple-900 text-sm">💖 Lời cảm ơn & động viên</h4>
          <div className="space-y-2">
            {supportMessages.map((msg) => {
              const sender = msg.user_id && !msg.anonymous ? supportProfiles[msg.user_id] : null;
              const senderName = msg.anonymous ? "Ẩn danh" : (sender?.display_name || "Người dùng");
              
              const timeAgo = (() => {
                const now = new Date();
                const created = new Date(msg.created_at);
                const diffMs = now - created;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);

                if (diffMins < 1) return "Vừa xong";
                if (diffMins < 60) return `${diffMins} phút trước`;
                if (diffHours < 24) return `${diffHours} giờ trước`;
                return `${diffDays} ngày trước`;
              })();

              return (
                <div key={msg.id} className="p-2 bg-white border border-purple-100 rounded text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {sender?.avatar_url && !msg.anonymous && (
                        <img
                          src={sender.avatar_url}
                          alt={senderName}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      )}
                      {msg.anonymous && (
                        <span className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs text-gray-700 font-bold">?</span>
                      )}
                      <span className="font-semibold text-gray-900">{senderName}</span>
                    </div>
                    <span className="text-gray-500 text-xs">{timeAgo}</span>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{msg.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
