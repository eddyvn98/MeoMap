import { useNavigate, useLocation } from "react-router-dom";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { label: "Home", path: "/" },
    { label: "Map", path: "/map" },
    { label: "Report", path: "/report" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        borderTop: "1px solid #ddd",
        background: "#fff",
        display: "flex",
        justifyContent: "space-around",
        padding: "10px",
        boxShadow: "0 -2px 8px rgba(0,0,0,0.05)",
        zIndex: 9999999,
      }}
    >
      {navItems.map((item) => (
        <button
          key={item.path}
          onClick={() => navigate(item.path)}
          style={{
            flex: 1,
            padding: "8px 0",
            border: "none",
            background: "none",
            fontSize: 14,
            fontWeight: isActive(item.path) ? "bold" : "normal",
            color: isActive(item.path) ? "#007bff" : "#555",
            borderRadius: 8,
            backgroundColor: isActive(item.path)
              ? "rgba(0,123,255,0.15)"
              : "transparent",
            transition: "0.2s",
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
