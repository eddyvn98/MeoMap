import React from 'react';

/**
 * SettingsTab - User settings and preferences
 */
export function SettingsTab({ profile }) {
  return (
    <div style={{ padding: "12px 0", color: "#374151", fontSize: 14, display: "grid", gap: 8 }}>
      <div>
        Cập nhật thông tin liên hệ đang phát triển. Vào trang `ProfilePage` nếu cần chỉnh sửa chi tiết.
      </div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        Email hiển thị: {profile?.email || "Chưa cập nhật"}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        Số điện thoại: {profile?.phone || "Chưa cập nhật"}
      </div>
      <div style={{ fontSize: 12, color: "#6b7280" }}>
        Zalo: {profile?.zalo || "Chưa cập nhật"}
      </div>
    </div>
  );
}

