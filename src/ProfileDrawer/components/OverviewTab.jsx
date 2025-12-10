import React from "react";
export default function OverviewTab({ profile, isLoading, error }) {
  if (isLoading) return <div>Đang tải hồ sơ...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!profile) return <div>Không tìm thấy hồ sơ.</div>;
  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <img src={profile.avatar_url} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #eee' }} />
        <div>
          <div style={{ fontWeight: 600, fontSize: 20 }}>{profile.display_name}</div>
          <div style={{ color: '#888', fontSize: 14 }}>{profile.email}</div>
          <div style={{ color: '#888', fontSize: 14 }}>{profile.phone || profile.zalo}</div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div>Vai trò: <b>{profile.role || 'Người dùng'}</b></div>
        <div>Ngày tham gia: {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : ''}</div>
        <div>Số dư ví: <b>{profile.wallet_credit || 0}đ</b></div>
      </div>
    </div>
  );
}
