import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

/**
 * Timeline hiển thị tất cả cập nhật từ người cứu
 * Đọc từ rescue_updates table
 */
export default function RescueUpdatesTimeline({ caseId }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadUpdates = async () => {
      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("rescue_updates")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError("Không tải được cập nhật");
        setUpdates([]);
      } else {
        setUpdates(data || []);
      }
      setLoading(false);
    };

    if (caseId) loadUpdates();
  }, [caseId]);

  if (loading) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-600 text-sm">⏳ Đang tải cập nhật...</p>
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded border text-center">
        <p className="text-gray-600 text-sm">📭 Chưa có cập nhật nào từ người cứu hộ</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-gray-900 flex items-center gap-2">
        📋 Timeline Cập Nhật Tình Hình
        <span className="text-xs font-normal text-gray-600">({updates.length} cập nhật)</span>
      </h3>

      <div className="space-y-3">
        {updates.map((update, idx) => (
          <div
            key={update.id}
            className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-blue-50 rounded transition"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <h4 className="font-semibold text-gray-900">{update.title}</h4>
                <p className="text-xs text-gray-600 mt-1">
                  📅 {new Date(update.created_at).toLocaleString("vi-VN")}
                </p>
              </div>
              {idx === 0 && (
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                  Mới nhất
                </span>
              )}
            </div>

            {/* Content */}
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
              {update.content}
            </p>

            {/* Cost spent */}
            {update.spent_cost > 0 && (
              <div className="inline-block px-3 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium mb-2">
                💸 Chi phí: {update.spent_cost.toLocaleString()}đ
              </div>
            )}

            {/* Images */}
            {update.image_urls && update.image_urls.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {update.image_urls.map((imageUrl, i) => (
                  <a
                    key={i}
                    href={imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded overflow-hidden border hover:shadow-lg transition"
                  >
                    <img
                      src={imageUrl}
                      alt={`Update ${i + 1}`}
                      className="w-full h-32 object-cover"
                    />
                  </a>
                ))}
              </div>
            )}

            {/* Videos */}
            {update.video_urls && update.video_urls.length > 0 && (
              <div className="mt-3 space-y-2">
                {update.video_urls.map((videoUrl, i) => (
                  <div key={i} className="bg-gray-100 rounded p-2">
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      🎥 Video {i + 1}: {videoUrl.substring(0, 50)}...
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
