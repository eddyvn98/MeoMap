import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function Header() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      try {
        sub?.subscription?.unsubscribe?.();
      } catch {}
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const baseLink =
    "mr-3 no-underline text-gray-700 font-medium px-2 py-1 rounded-md transition hover:bg-gray-100";

  return (
    <div className="sticky top-0 z-[9999] bg-white border-b border-gray-200 shadow-sm px-5 py-3 flex items-center justify-between">
      {/* Logo */}
      <div className="text-2xl font-bold text-gray-900">
        <Link to="/" className="no-underline text-inherit">
          Pet Rescue
        </Link>
      </div>

      {/* Right menu */}
      <div className="flex items-center">
        {user ? (
          <>
            <span className="mr-3 text-sm text-gray-500">{user.email}</span>

            <Link to="/adoptions" className={baseLink}>
              Mèo đã giao / Đánh giá
            </Link>

            <Link to="/deposits" className={baseLink}>
              Cọc đang chờ
            </Link>

            <button
              onClick={handleLogout}
              className="ml-2 px-3 py-1.5 bg-red-500 text-white rounded-md font-semibold transition hover:bg-red-600"
            >
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={baseLink}>
              Đăng nhập
            </Link>

            <Link to="/register" className={baseLink}>
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
