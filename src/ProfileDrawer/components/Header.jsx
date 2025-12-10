import React from "react";
export default function ProfileDrawerHeader({ onClose, widthMode, onChangeWidth }) {
  return (
    <header className="profile-drawer__header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottom: '1px solid #eee' }}>
      <div style={{ fontWeight: 600, fontSize: 18 }}>Trang cá nhân</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {onChangeWidth && (
          <button onClick={() => onChangeWidth(widthMode === 'normal' ? 'wide' : 'normal')} style={{ fontSize: 16 }}>
            {widthMode === 'normal' ? '⤢' : '⤡'}
          </button>
        )}
        <button onClick={onClose} style={{ fontSize: 18, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
      </div>
    </header>
  );
}
