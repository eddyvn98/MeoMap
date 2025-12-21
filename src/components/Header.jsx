import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Header({ setAuthModalOpen, setReportModalOpen, onOpenProfilePanel, onOpenGuide }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const navigate = useNavigate();
  const profileBtnRef = useRef(null);
  const adminMenuRef = useRef(null);

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

  // Check if user is admin
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    const checkAdmin = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setIsAdmin(profile?.role === "admin");
    };

    checkAdmin();
  }, [user]);

  // Close admin menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
        setShowAdminMenu(false);
      }
    };

    if (showAdminMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showAdminMenu]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
