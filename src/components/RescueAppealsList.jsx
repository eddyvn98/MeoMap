import React, { useEffect, useState } from "react";
import { localApi } from "../localClient";

export default function RescueAppealsList({ caseId, refreshKey = 0 }) {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadAppeals = async () => {
      setLoading(true);
      const { data, error } = await localApi
        .from("rescue_appeals")
        .select("id,title,content,status,created_at")
        .eq("case_id", caseId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!active) return;
      setAppeals(error ? [] : data || []);
      setLoading(false);
    };

    if (caseId) loadAppeals();
    return () => {
      active = false;
    };
  }, [caseId, refreshKey]);

  if (loading) {
    return <p className="text-sm text-gray-500">Đang tải lời kêu gọi...</p>;
  }

  if (appeals.length === 0) {
    return (
      <div className="rounded bg-gray-50 p-3 text-sm text-gray-500">
        Chưa có lời kêu gọi nào từ người cứu.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold">📢 Lời kêu gọi từ người cứu</h3>
      {appeals.map((appeal) => (
        <article key={appeal.id} className="rounded-lg border bg-purple-50 p-3">
          <div className="font-semibold">{appeal.title || "Kêu gọi hỗ trợ"}</div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{appeal.content}</p>
          <div className="mt-2 text-xs text-gray-500">
            {new Date(appeal.created_at).toLocaleString("vi-VN")}
          </div>
        </article>
      ))}
      <div className="rounded border bg-blue-50 p-3 text-xs text-blue-800">
        MeoMap không nhận tiền quyên góp. Nếu muốn hỗ trợ, hãy dùng thông tin liên hệ/tài khoản
        mà người cứu tự công khai trên case này.
      </div>
    </div>
  );
}
