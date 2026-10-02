import { useEffect, useState } from "react";
import { localApi } from "../localClient";
import {
  AvailableRescueCard,
  MyRescueCard,
} from "./rescue/RescueCaseCards";

export default function RescuerDashboard() {
  const [activeTab, setActiveTab] = useState("available");
  const [availableCases, setAvailableCases] = useState([]);
  const [myCases, setMyCases] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [loadingMy, setLoadingMy] = useState(false);
  const [error, setError] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    localApi.auth.getUser().then(({ data }) => setSelectedUser(data?.user));
  }, []);

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

  const handleAcceptCase = async (caseId) => {
    if (!selectedUser) {
      alert("⚠️ Vui lòng đăng nhập trước");
      return;
    }

    if (
      !confirm(
        "Bạn xác nhận nhận ca cứu hộ này? Bạn sẽ trở thành người cứu chính cho ca này.",
      )
    ) {
      return;
    }

    try {
      const { error: updateError } = await localApi
        .from("pets")
        .update({ rescuer_id: selectedUser.id })
        .eq("id", caseId);

      if (updateError) throw updateError;

      const acceptedCase = availableCases.find((item) => item.id === caseId);
      setAvailableCases((items) =>
        items.filter((item) => item.id !== caseId),
      );
      if (acceptedCase) {
        setMyCases((items) => [...items, acceptedCase]);
      }

      alert(
        "✅ Bạn đã nhận ca cứu hộ! Bạn có thể cập nhật tình hình và tự đăng lời kêu gọi quyên góp trực tiếp.",
      );
    } catch (acceptError) {
      alert("❌ Lỗi: " + acceptError.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
        <h1 className="text-2xl font-bold">🚑 Bảng điều khiển cứu hộ</h1>
        <p className="mt-1 text-sm opacity-90">
          Tìm và quản lý các ca cứu hộ thú cưng khẩn cấp
        </p>
      </div>

      <div className="flex gap-2">
        <TabButton
          active={activeTab === "available"}
          onClick={() => setActiveTab("available")}
        >
          📍 Ca cứu hộ khẩn cấp ({availableCases.length})
        </TabButton>
        <TabButton
          active={activeTab === "myrescues"}
          onClick={() => setActiveTab("myrescues")}
        >
          🎯 Ca của tôi ({myCases.length})
        </TabButton>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeTab === "available" && (
        <div className="space-y-4">
          {loadingAvailable ? (
            <EmptyState>⏳ Đang tải danh sách ca cứu hộ...</EmptyState>
          ) : availableCases.length === 0 ? (
            <EmptyState>
              ✨ Không có ca cứu hộ khẩn cấp nào
            </EmptyState>
          ) : (
            availableCases.map((caseItem) => (
              <AvailableRescueCard
                key={caseItem.id}
                caseItem={caseItem}
                onAccept={handleAcceptCase}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "myrescues" && (
        <div className="space-y-4">
          {loadingMy ? (
            <EmptyState>⏳ Đang tải ca của bạn...</EmptyState>
          ) : myCases.length === 0 ? (
            <EmptyState>📭 Bạn chưa nhận ca cứu hộ nào</EmptyState>
          ) : (
            myCases.map((caseItem) => (
              <MyRescueCard key={caseItem.id} caseItem={caseItem} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded px-4 py-2 font-semibold transition ${
        active
          ? "bg-orange-600 text-white"
          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ children }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-gray-50 p-4 text-center text-gray-700">
      {children}
    </div>
  );
}
