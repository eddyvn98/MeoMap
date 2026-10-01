import React, { useState, useEffect } from "react";
import AvailableRescueCases from "./rescue/AvailableRescueCases";
import MyRescueCases from "./rescue/MyRescueCases";
import { supabase } from "../supabaseClient";

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
      const { data } = await supabase.auth.getUser();
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

      const { data, error: fetchError } = await supabase
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

      const { data, error: fetchError } = await supabase
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
      const { error: updateError } = await supabase
        .from("pets")
        .update({ rescuer_id: selectedUser.id })
        .eq("id", caseId);

      if (updateError) throw updateError;

      alert("✅ Bạn đã nhận ca cứu hộ! Hãy bước vào Trung tâm cứu hộ để quản lý.");
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

      {/* TAB: CA CỨU HỘ KHẨN CẤP */}
      {activeTab === "available" && (
        <AvailableRescueCases loading={loadingAvailable} cases={availableCases} onAccept={handleAcceptCase} />
      )}
      {/* TAB: CA CỨU HỘ CỦA TÔI */}
      {activeTab === "myrescues" && <MyRescueCases loading={loadingMy} cases={myCases} />}
    </div>
  );
}
