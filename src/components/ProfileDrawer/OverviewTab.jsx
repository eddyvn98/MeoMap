import React from 'react';

/**
 * OverviewTab - User profile overview with info, pending tasks, and quick actions
 */
export function OverviewTab({
  profile,
  pendingTasks,
  onSelectTab,
}) {
  if (!profile) {
    return (
      <div style={{ padding: "16px 0", color: "#4b5563", fontSize: 14 }}>
        Vui lòng đăng nhập để xem trang cá nhân.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* Profile Info Section */}
      <div
        style={{
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          background: "#f9fafb",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Thông tin</div>
        <div style={{ fontSize: 13, color: "#374151", display: "grid", gap: 4 }}>
          <div>Tên: {profile?.display_name || "Chưa cập nhật"}</div>
          <div>Email: {profile?.email || "Chưa cập nhật"}</div>
          <div>Điện thoại: {profile?.phone || "Chưa cập nhật"}</div>
          <div>Zalo: {profile?.zalo || "Chưa cập nhật"}</div>
          <div>Vai trò: {profile?.role || "user"}</div>
          <div>Ví hiện tại: {profile?.wallet_credit ?? 0} đ</div>
        </div>
      </div>

      {/* Pending Tasks Section */}
      {pendingTasks && pendingTasks.length > 0 && (
        <div
          style={{
            padding: 12,
            border: "2px solid #fbbf24",
            borderRadius: 10,
            background: "#fffbeb",
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#92400e" }}>
            📌 Nhiệm vụ adopt còn lại ({pendingTasks.length})
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {pendingTasks.map(task => {
              const due = task.checkin_required_at ? new Date(task.checkin_required_at) : null;
              const overdue = due && new Date() > due;
              return (
                <div 
                  key={task.id} 
                  style={{ 
                    padding: 10, 
                    background: overdue ? '#fee2e2' : '#fff', 
                    borderRadius: 6, 
                    border: '1px solid #d1d5db' 
                  }}
                >
                  <div style={{ 
                    fontSize: 13, 
                    fontWeight: 600, 
                    marginBottom: 4, 
                    color: overdue ? '#991b1b' : '#374151' 
                  }}>
                    {task.pets?.name || 'Mèo'} - {overdue ? '🟥 Quá hạn' : '🟧 Chờ xác nhận'}
                  </div>
                  <button
                    onClick={() => onSelectTab('my-adoptions')}
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    ✓ Xác nhận ngay
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions Section */}
      <div
        style={{
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          background: "#fff",
          display: "grid",
          gap: 8,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>Tác vụ nhanh</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
          {[
            { label: "Đăng mèo", action: () => alert("Tính năng đang phát triển") },
            { label: "Báo cáo", action: () => alert("Tính năng đang phát triển") },
            { label: "Bài đăng", action: () => onSelectTab("posts") },
            { label: "Cài đặt", action: () => onSelectTab("settings") },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#f3f4f6",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

