import React from "react";
const TABS = [
  { key: "overview", label: "Tổng quan" },
  { key: "posts", label: "Bài đăng" },
  { key: "my-adoptions", label: "Nhận nuôi" },
  { key: "settings", label: "Cài đặt" },
];

export default function Tabs({ active, onChange }) {
  return (
    <nav className="profile-drawer__tabs" style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
      {TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          style={{
            flex: 1,
            padding: 10,
            background: active === tab.key ? '#f0f0f0' : 'transparent',
            border: 'none',
            borderBottom: active === tab.key ? '2px solid #2cb6b5' : '2px solid transparent',
            fontWeight: active === tab.key ? 600 : 400,
            cursor: 'pointer',
            fontSize: 15,
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
