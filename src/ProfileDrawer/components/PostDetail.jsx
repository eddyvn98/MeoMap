import React from "react";

export default function PostDetail({ post, onClose, adoptionRequests, onAccept, onReject, onConfirmMeeting, onOwnerCancelRequest, onScanDelivery }) {
  if (!post) return null;
  return (
    <div className="profile-drawer__post-detail" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, minWidth: 320, maxWidth: 480, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 24, fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>{post.title || 'Chi tiết bài đăng'}</div>
        <div style={{ color: '#888', marginBottom: 12 }}>{post.description || 'Không có mô tả.'}</div>
        {/* TODO: Show more post details and actions */}
        <div>Chức năng này đang được phát triển.</div>
      </div>
    </div>
  );
}
