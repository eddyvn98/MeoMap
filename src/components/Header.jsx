import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Header({ setAuthModalOpen, setReportModalOpen, onOpenProfilePanel, onOpenGuide }) {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const profileBtnRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      try {
        sub?.subscription?.unsubscribe?.();
      } catch {
        if (sub?.subscription) sub.subscription.unsubscribe();
      }
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const buttonStyle = {
    padding: "6px 14px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.2s",
  };

  const handleOpenProfile = () => {
    if (!user) {
      setAuthModalOpen?.(true);
      return;
    }
    if (onOpenProfilePanel) {
      onOpenProfilePanel(profileBtnRef);
    } else {
      navigate("/account");
    }
  };

  return (
    <header
      style={{
        padding: "12px 24px",
        background: "#ffffff",
        borderBottom: "1px solid #eee",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {/* Logo */}
      <div style={{ fontSize: 22, fontWeight: "bold" }}>
        <Link to="/" style={{ textDecoration: "none", color: "#2cb6b5" }}>
          Pet Rescue
        </Link>
      </div>

      {/* Right section */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }} >
        {user ? (
          <>
            {/* Navigation buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                ref={profileBtnRef}
                onClick={handleOpenProfile}
                style={{
                  ...buttonStyle,
                  background: "#f0f0f0",
                  color: "#333",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#e0e0e0")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#f0f0f0")
                }
              >
                Trang cá nhân
              </button>
              <Link to="/wallet">
                <button
                  style={{
                    ...buttonStyle,
                    background: "#f0f0f0",
                    color: "#333",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "#e0e0e0")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "#f0f0f0")
                  }
                >
                  💰 Ví của tôi
                </button>
              </Link>
              <Link to="/rescuer">
                <button
                  style={{
                    ...buttonStyle,
                    background: "#f0f0f0",
                    color: "#333",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "#e0e0e0")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "#f0f0f0")
                  }
                >
                  🚑 Cứu hộ
                </button>
              </Link>
              <Link to="/store">
                <button
                  style={{
                    ...buttonStyle,
                    background: "#f0f0f0",
                    color: "#333",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.background = "#e0e0e0")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.background = "#f0f0f0")
                  }
                >
                  🛍️ Cửa hàng
                </button>
              </Link>
            </div>

            {/* Actions buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => onOpenGuide?.()}
                style={{
                  ...buttonStyle,
                  background: "#6366f1",
                  color: "#fff",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#4f46e5")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#6366f1")
                }
              >
                ❓ Hướng dẫn
              </button>
              <button
                onClick={handleLogout}
                style={{
                  ...buttonStyle,
                  background: "#ff4d4f",
                  color: "#fff",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#e03e3f")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#ff4d4f")
                }
              >
                Đăng xuất
              </button>
              <button
                onClick={() => setReportModalOpen(true)}
                style={{
                  ...buttonStyle,
                  background: "#ff7f32",
                  color: "#fff",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#e67329")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#ff7f32")
                }
              >
                + Báo mèo
              </button>
            </div>
          </>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => onOpenGuide?.()}
              style={{
                ...buttonStyle,
                background: "#6366f1",
                color: "#fff",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#4f46e5")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "#6366f1")
              }
            >
              ❓ Hướng dẫn
            </button>
            <button
              onClick={() => setAuthModalOpen(true)}
              style={{
                ...buttonStyle,
                background: "#2cb6b5",
                color: "#fff",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#25a0a0")
              }
              onMouseOut={(e) => (e.currentTarget.style.background = "#2cb6b5")}
            >
              Đăng nhập / Đăng ký
            </button>
            <button
              onClick={() => setReportModalOpen(true)}
              style={{
                ...buttonStyle,
                background: "#ff7f32",
                color: "#fff",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "#e67329")
              }
              onMouseOut={(e) => (e.currentTarget.style.background = "#ff7f32")}
            >
              + Báo mèo
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
