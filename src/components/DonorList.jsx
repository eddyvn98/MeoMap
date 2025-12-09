import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { getDonationsForCase } from "../donation";

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

  // Load donations
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { donations: d } = await getDonationsForCase(caseId);
      setDonations(d || []);

      // Load donor profiles (if not anonymous)
      if (d && d.length > 0) {
        const uniqueUserIds = [...new Set(d.map((x) => x.user_id).filter(Boolean))];
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

  if (loading) return <div className="text-xs text-gray-500">Đang tải...</div>;

  if (donations.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 text-sm">
        Chưa có ai góp. Bạn sẽ là người đầu tiên? 💪
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {donations.map((donation) => {
        const donor = donation.user_id ? donorProfiles[donation.user_id] : null;
        const name = donation.user_id
          ? donor?.display_name || "Người dùng"
          : "Ẩn danh";

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
            className="p-3 bg-gray-50 border rounded-lg text-sm space-y-2"
          >
            {/* Header: Name + Amount + Time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {donor?.avatar_url && (
                  <img
                    src={donor.avatar_url}
                    alt={name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                )}
                <span className="font-semibold text-gray-900">{name}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold text-orange-600">
                  {donation.amount.toLocaleString()}đ
                </span>
                <span className="text-xs text-gray-500">{timeAgo}</span>
              </div>
            </div>

            {/* Badge: Method */}
            <div className="flex gap-2">
              {donation.method === "direct" ? (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                  ✔ Chuyển thẳng
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                  ✔ Qua hệ thống
                </span>
              )}
            </div>

            {/* Receipt image (if direct) */}
            {donation.receipt_url && (
              <div>
                <a
                  href={donation.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block"
                >
                  <img
                    src={donation.receipt_url}
                    alt="Receipt"
                    className="w-24 h-24 object-cover rounded border border-gray-300 hover:opacity-80"
                    title="Bấm để xem ảnh lớn"
                  />
                </a>
              </div>
            )}

            {/* Note */}
            {donation.note && (
              <p className="text-gray-700 italic text-xs">"{donation.note}"</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
