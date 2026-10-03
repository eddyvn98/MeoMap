import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { localApi } from "../localClient";

export default function Header({ setAuthModalOpen, setReportModalOpen, onOpenProfilePanel, onOpenGuide }) {
  const [user, setUser] = useState(null);
  const profileBtnRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    localApi.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: sub } = localApi.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => sub?.subscription?.unsubscribe?.();
  }, []);

  const handleLogout = async () => {
    await localApi.auth.signOut();
    navigate("/");
  };

  const openProfile = () => {
    if (!user) return setAuthModalOpen?.(true);
    if (onOpenProfilePanel) onOpenProfilePanel(profileBtnRef);
    else navigate("/account");
  };

  const buttonStyle = {
    padding: "7px 12px",
    borderRadius: 7,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  };

  return (
    <header style={{ padding:"10px 18px", background:"#fff", borderBottom:"1px solid #eee", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:10 }}>
      <Link to="/" style={{ textDecoration:"none", color:"#2cb6b5", fontSize:22, fontWeight:800 }}>MeoMap</Link>
      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
        <Link
          to="/rescuer"
          style={{ ...buttonStyle, background: "#fff7ed", color: "#c2410c", textDecoration: "none" }}
        >
          🚑 Cứu hộ
        </Link>
        <button
          onClick={() => (onOpenGuide ? onOpenGuide() : navigate("/how-it-works"))}
          style={{ ...buttonStyle, background: "#eef2ff", color: "#4338ca" }}
        >
          ❓ Hướng dẫn
        </button>
        {user ? (
          <>
            <button ref={profileBtnRef} onClick={openProfile} style={{...buttonStyle, background:"#f3f4f6", color:"#374151"}}>Trang cá nhân</button>
            <button onClick={handleLogout} style={{...buttonStyle, background:"#fee2e2", color:"#b91c1c"}}>Đăng xuất</button>
          </>
        ) : (
          <button
            onClick={() =>
              setAuthModalOpen ? setAuthModalOpen(true) : navigate("/login")
            }
            style={{ ...buttonStyle, background: "#2cb6b5", color: "#fff" }}
          >
            Đăng nhập
          </button>
        )}
        <button
          onClick={() =>
            setReportModalOpen ? setReportModalOpen(true) : navigate("/report")
          }
          style={{ ...buttonStyle, background: "#ff7f32", color: "#fff" }}
        >
          + Đăng case
        </button>
      </div>
    </header>
  );
}
