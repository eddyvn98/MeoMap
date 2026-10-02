import React, { useState, useEffect } from "react";
import { localApi } from "../localClient";

/**
 * Component cho người cứu hộ (rescuer) quản lý các ca cứu hộ
 * 
 * Hiển thị:
 * 1. Danh sách các ca cứu hộ chưa nhận
 * 2. Nút "Nhận ca cứu" để đăng ký
 * 3. Danh sách ca cứu đã nhận của tôi
 */
export default function RescuerDashboard() {
  const [activeTab, setActiveTab] = useState("available"); // available | myrescues
  const [availableCases, setAvailableCases] = useState([]);
  const [myCases, setMyCases] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [loadingMy, setLoadingMy] = useState(false);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  // Load user từ localStorage hoặc auth
  useEffect(() => {
    const getUser = async () => {
      const { data } = await localApi.auth.getUser();
      setSelectedUser(data?.user);
    };
    getUser();
  }, []);

  // Load ca cứu hộ chưa nhận
  useEffect(() => {
    if (activeTab !== "available") return;

    const loadAvailable = async () => {
      setLoadingAvailable(true);
      setError("");

      const { data, error: fetchError } = await localApi
        .from("pets")
        .select("*, profiles(name, avatar_url)")
        .eq("category", "rescue")
        .neq("status", "delivered")
        .is("rescuer_id", null)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError("Không tải được danh sách ca cứu hộ");
        setAvailableCases([]);
      } else {
        setAvailableCases(data || []);
      }
      setLoadingAvailable(false);
    };

    loadAvailable();
  }, [activeTab]);

  // Load ca cứu hộ của tôi
  useEffect(() => {
    if (!selectedUser || activeTab !== "myrescues") return;

    const loadMy = async () => {
      setLoadingMy(true);
      setError("");

      const { data, error: fetchError } = await localApi
        .from("pets")
        .select("*")
        .eq("category", "rescue")
        .eq("rescuer_id", selectedUser.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError("Không tải được danh sách ca của bạn");
        setMyCases([]);
      } else {
        setMyCases(data || []);
      }
      setLoadingMy(false);
    };

    loadMy();
  }, [activeTab, selectedUser]);

  // Hàm nhận ca cứu hộ
  const handleAcceptCase = async (caseId) => {
    if (!selectedUser) {
      alert("⚠️ Vui lòng đăng nhập trước");
      return;
    }

    if (
      !confirm(
        "Bạn xác nhận nhận ca cứu hộ này? Bạn sẽ trở thành người cứu chính cho ca này."
      )
    )
      return;

    try {
      const { error: updateError } = await localApi
        .from("pets")
        .update({ rescuer_id: selectedUser.id })
        .eq("id", caseId);

      if (updateError) throw updateError;

      alert("✅ Bạn đã nhận ca cứu hộ! Bạn có thể cập nhật tình hình và tự đăng lời kêu gọi quyên góp trực tiếp.");
      setAvailableCases(availableCases.filter((c) => c.id !== caseId));
      setMyCases([
        ...myCases,
        availableCases.find((c) => c.id === caseId),
      ]);
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* TIÊU ĐỀ */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-lg">
        <h1 className="text-2xl font-bold">🚑 Bảng điều khiển cứu hộ</h1>
        <p className="text-sm opacity-90 mt-1">
          Tìm và quản lý các ca cứu hộ thú cưng khẩn cấp
        </p>
      </div>

      {/* TABS */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("available")}
          className={`flex-1 px-4 py-2 rounded font-semibold transition ${
            activeTab === "available"
              ? "bg-orange-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          📍 Ca cứu hộ khẩn cấp ({availableCases.length})
        </button>
        <button
          onClick={() => setActiveTab("myrescues")}
          className={`flex-1 px-4 py-2 rounded font-semibold transition ${
            activeTab === "myrescues"
              ? "bg-orange-600 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          🎯 Ca của tôi ({myCases.length})
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* TAB: CA CỨUU HỘ KHẨN CẤP */}
      {activeTab === "available" && (
        <div className="space-y-4">
          {loadingAvailable ? (
            <div className="p-4 text-center text-gray-600">
              <p>⏳ Đang tải danh sách ca cứu hộ...</p>
            </div>
          ) : availableCases.length === 0 ? (
            <div className="p-4 bg-blue-50 border border-blue-300 rounded-lg text-center">
              <p className="text-blue-900 font-semibold">✨ Không có ca cứu hộ khẩn cấp nào</p>
              <p className="text-sm text-blue-800 mt-2">
                Kiểm tra lại sau hoặc liên hệ với chủ mèo/chó qua các ca khác
              </p>
            </div>
          ) : (
            availableCases.map((caseItem) => (
              <div
                key={caseItem.id}
                className="p-4 border border-gray-300 rounded-lg hover:shadow-lg transition"
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  {caseItem.image_url && (
                    <img
                      src={caseItem.image_url}
                      alt={caseItem.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      🚑 {caseItem.name}
                    </h3>
                    <p className="text-xs text-orange-600 font-semibold mt-1">
                      🆘 KHẨN CẤP - Cần cứu ngay!
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      📍 {caseItem.district || "Chưa xác định"}
                    </p>
                  </div>
                </div>

                {/* Mô tả */}
                {caseItem.description && (
                  <div className="mb-3 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                    <p className="text-sm text-gray-700 line-clamp-3">
                      {caseItem.description}
                    </p>
                  </div>
                )}

                {/* Thông tin chủ bài */}
                {caseItem.profiles && (
                  <div className="mb-3 p-2 bg-gray-100 rounded text-sm">
                    <p className="text-gray-700">
                      <strong>👤 Người đăng:</strong> {caseItem.profiles.name || "Ẩn danh"}
                    </p>
                  </div>
                )}

                {/* Nút hành động */}
                <button
                  onClick={() => handleAcceptCase(caseItem.id)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-bold hover:shadow-lg transition text-center"
                >
                  ✋ Nhận ca cứu hộ này
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB: CA CỨU HỘ CỦA TÔI */}
      {activeTab === "myrescues" && (
        <div className="space-y-4">
          {loadingMy ? (
            <div className="p-4 text-center text-gray-600">
              <p>⏳ Đang tải ca của bạn...</p>
            </div>
          ) : myCases.length === 0 ? (
            <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg text-center">
              <p className="text-gray-900 font-semibold">📭 Bạn chưa nhận ca cứu hộ nào</p>
              <p className="text-sm text-gray-600 mt-2">
                Hãy quay lại tab "Ca cứu hộ khẩn cấp" để tìm và nhận ca!
              </p>
            </div>
          ) : (
            myCases.map((caseItem) => {
              const isClosed = caseItem.status === "delivered";
              return (
                <div
                  key={caseItem.id}
                  className={`p-4 border rounded-lg transition ${
                    isClosed
                      ? "border-green-300 bg-green-50"
                      : "border-orange-300 bg-orange-50 shadow-md"
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">
                        🚑 {caseItem.name}
                      </h3>
                      <div className="mt-2">
                        {isClosed ? (
                          <span className="inline-block px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
                            ✅ Đã hoàn thành
                          </span>
                        ) : (
                          <span className="inline-block px-3 py-1 bg-orange-600 text-white rounded-full text-xs font-semibold animate-pulse">
                            ⏳ Đang tiến hành
                          </span>
                        )}
                      </div>
                    </div>
                    {caseItem.image_url && (
                      <img
                        src={caseItem.image_url}
                        alt={caseItem.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                  </div>

                  {/* Mô tả */}
                  {caseItem.description && (
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                      {caseItem.description}
                    </p>
                  )}

                  <div className="mb-3 rounded border bg-blue-50 p-2 text-xs text-blue-800">MeoMap không quản lý tiền. Bạn có thể tự đăng lời kêu gọi và thông tin chuyển khoản của mình trong ca cứu hộ.</div>

                  {/* Nút hành động */}
                  <button
                    onClick={() =>
                      window.location.href = `/pet-detail/${caseItem.id}`
                    }
                    className={`w-full px-4 py-2 rounded-lg font-semibold transition text-white ${
                      isClosed
                        ? "bg-gray-500 hover:bg-gray-600"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {isClosed ? "📋 Xem chi tiết" : "🎯 Vào Trung tâm cứu hộ"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
