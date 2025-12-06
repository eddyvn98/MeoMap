import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Header() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // get current user (if any)
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));

    // subscribe to auth changes
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      // unsubscribe
      try {
        sub?.subscription?.unsubscribe?.();
      } catch (e) {
        // fallback for different supabase versions
        if (sub?.subscription) sub.subscription.unsubscribe();
      }
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div style={{
      padding: "10px 16px",
      background: "#ffffff",
      borderBottom: "1px solid #eee",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      position: "sticky",
      top: 0,
      zIndex: 10
    }}>
      <div style={{ fontSize: 20, fontWeight: "bold" }}>
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>Pet Rescue</Link>
      </div>

      <div>
        {user ? (
          <>
            <span style={{ marginRight: 8 }}>({user.email})</span>
            <Link to="/adoptions" style={{ marginRight: 8 }}>Mèo đã giao / Đánh giá</Link>
            <Link to="/deposits" style={{ marginLeft: 8 }}>Cọc đang chờ</Link>
            <button onClick={handleLogout} style={{ marginLeft: 8 }}>Đăng xuất</button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ marginRight: 8 }}>Đăng nhập</Link>
            <Link to="/register">Đăng ký</Link>
          </>
        )}
      </div>
    </div>
  );
}
