import { Link } from "react-router-dom";

export default function HeaderAdminMenu({
  isAdmin,
  adminMenuRef,
  showAdminMenu,
  setShowAdminMenu,
  buttonStyle,
}) {
  return (
    <>
      {/* Admin Menu */}
      {isAdmin && (
      <div style={{ position: "relative" }} ref={adminMenuRef}>
      <button
      onClick={() => setShowAdminMenu(!showAdminMenu)}
      style={{
      ...buttonStyle,
      background: "#dc2626",
      color: "#fff",
      }}
      onMouseOver={(e) =>
      (e.currentTarget.style.background = "#b91c1c")
      }
      onMouseOut={(e) =>
      (e.currentTarget.style.background = "#dc2626")
      }
      >
      👑 Admin
      </button>
      
      {showAdminMenu && (
      <div
      style={{
      position: "absolute",
      top: "calc(100% + 8px)",
      right: 0,
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      minWidth: 220,
      zIndex: 1000,
      }}
      >
      <div style={{ padding: 8 }}>
      <Link
      to="/admin/deposits"
      style={{ textDecoration: "none" }}
      onClick={() => setShowAdminMenu(false)}
      >
      <div
      style={{
      padding: "8px 12px",
      borderRadius: 6,
      cursor: "pointer",
      transition: "background 0.2s",
      }}
      onMouseOver={(e) =>
      (e.currentTarget.style.background = "#f3f4f6")
      }
      onMouseOut={(e) =>
      (e.currentTarget.style.background = "transparent")
      }
      >
      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
      💰 Quản lý cọc
      </div>
      </div>
      </Link>
      
      <Link
      to="/admin/reports"
      style={{ textDecoration: "none" }}
      onClick={() => setShowAdminMenu(false)}
      >
      <div
      style={{
      padding: "8px 12px",
      borderRadius: 6,
      cursor: "pointer",
      transition: "background 0.2s",
      }}
      onMouseOver={(e) =>
      (e.currentTarget.style.background = "#f3f4f6")
      }
      onMouseOut={(e) =>
      (e.currentTarget.style.background = "transparent")
      }
      >
      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
      📊 Quản lý báo cáo
      </div>
      </div>
      </Link>
      
      <Link
      to="/admin/topups"
      style={{ textDecoration: "none" }}
      onClick={() => setShowAdminMenu(false)}
      >
      <div
      style={{
      padding: "8px 12px",
      borderRadius: 6,
      cursor: "pointer",
      transition: "background 0.2s",
      }}
      onMouseOver={(e) =>
      (e.currentTarget.style.background = "#f3f4f6")
      }
      onMouseOut={(e) =>
      (e.currentTarget.style.background = "transparent")
      }
      >
      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
      💵 Duyệt nạp tiền
      </div>
      </div>
      </Link>
      
      <Link
      to="/admin/withdrawals-p2p"
      style={{ textDecoration: "none" }}
      onClick={() => setShowAdminMenu(false)}
      >
      <div
      style={{
      padding: "8px 12px",
      borderRadius: 6,
      cursor: "pointer",
      transition: "background 0.2s",
      }}
      onMouseOver={(e) =>
      (e.currentTarget.style.background = "#f3f4f6")
      }
      onMouseOut={(e) =>
      (e.currentTarget.style.background = "transparent")
      }
      >
      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
      💸 Duyệt rút tiền P2P
      </div>
      </div>
      </Link>
      
      <Link
      to="/admin/shop"
      style={{ textDecoration: "none" }}
      onClick={() => setShowAdminMenu(false)}
      >
      <div
      style={{
      padding: "8px 12px",
      borderRadius: 6,
      cursor: "pointer",
      transition: "background 0.2s",
      }}
      onMouseOver={(e) =>
      (e.currentTarget.style.background = "#f3f4f6")
      }
      onMouseOut={(e) =>
      (e.currentTarget.style.background = "transparent")
      }
      >
      <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
      🛍️ Quản lý cửa hàng
      </div>
      </div>
      </Link>
      </div>
      </div>
      )}
      </div>
      )}
      </div>
      
    </>
  );
}
