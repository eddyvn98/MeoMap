import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

/**
 * Hiển thị danh sách lời kêu gọi ủng hộ từ người cứu
 * Đọc từ rescue_appeals table
 */
export default function RescueAppealsList({ caseId }) {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAppeals = async () => {
      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("rescue_appeals")
        .select("*")
        .eq("case_id", caseId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError("Không tải được lời kêu gọi");
        setAppeals([]);
      } else {
        setAppeals(data || []);
      }
      setLoading(false);
    };

    if (caseId) loadAppeals();
  }, [caseId]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600 text-sm">⏳ Đang tải lời kêu gọi...</p>
      </div>
    );
  }

  if (appeals.length === 0) {
    return (
      <div className="p-4 bg-blue-50 rounded border text-center">
        <p className="text-blue-700 text-sm">💬 Chưa có lời kêu gọi ủng hộ nào từ người cứu hộ</p>
        <p className="text-xs text-blue-600 mt-2">Người cứu sẽ tạo lời kêu gọi trong quá trình cứu hộ</p>
      </div>
    );
  }

  // Tính tổng tiền quyên góp so với yêu cầu
  const totalRequested = appeals.reduce((sum, a) => sum + (a.requested_budget || 0), 0);

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-900 flex items-center gap-2">
        📢 Lời Kêu Gọi Ủng Hộ
        <span className="text-xs font-normal text-gray-600">({appeals.length} kêu gọi)</span>
      </h3>

      {totalRequested > 0 && (
        <div className="p-3 bg-orange-50 border border-orange-200 rounded">
          <p className="text-xs text-orange-700">
            <strong>💰 Tổng yêu cầu:</strong> {totalRequested.toLocaleString()}đ
          </p>
        </div>
      )}

      <div className="space-y-3">
        {appeals.map((appeal) => (
          <div
            key={appeal.id}
            className="border-l-4 border-red-500 pl-4 py-3 bg-red-50 rounded hover:shadow-md transition"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">📢 {appeal.title}</h4>
                <p className="text-xs text-gray-600 mt-1">
                  {new Date(appeal.created_at).toLocaleString("vi-VN")}
                </p>
              </div>
              <span className="px-2 py-1 bg-red-200 text-red-800 text-xs font-semibold rounded">
                {appeal.status === "active" ? "Đang kêu gọi" : "Đã đóng"}
              </span>
            </div>

            {/* Content */}
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
              {appeal.content}
            </p>

            {/* Budget */}
            {appeal.requested_budget > 0 && (
              <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                💰 Cần hỗ trợ: {appeal.requested_budget.toLocaleString()}đ
              </div>
            )}

            {/* Action */}
            <div className="mt-3">
              <button className="px-4 py-2 bg-orange-500 text-white rounded font-semibold text-xs hover:bg-orange-600 transition">
                💜 Quyên góp để hỗ trợ
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Donation info card */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
        <p className="font-semibold mb-1">💡 Cách quyên góp:</p>
        <ul className="space-y-1 text-[12px]">
          <li>✓ Nhập số tiền bạn muốn quyên góp ở ô "Quyên góp"</li>
          <li>✓ Tiền sẽ được ghi nhận là "Quyên góp" vào ví ca cứu hộ</li>
          <li>✓ Tất cả quyên góp được công khai, minh bạch</li>
          <li>✓ Hỗ trợ chuyển trực tiếp cho người cứu theo thông tin họ cung cấp</li>
        </ul>
      </div>
    </div>
  );
}
