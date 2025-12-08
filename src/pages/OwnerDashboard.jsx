import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function OwnerDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState("");

  // 1) Lấy user hiện tại
  useEffect(() => {
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        // chưa đăng nhập → đá về trang login
        navigate("/login");
        return;
      }
      setUser(data.user);
      setLoadingUser(false);
    };
    loadUser();
  }, [navigate]);

  // 2) Lấy danh sách bài đăng của user từ bảng pets
  useEffect(() => {
    if (!user) return;

    const loadPosts = async () => {
      setLoadingPosts(true);
      setError("");

      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Lỗi load posts:", error);
        setError("Không tải được danh sách bài đăng.");
        setPosts([]);
      } else {
        setPosts(data || []);
      }

      setLoadingPosts(false);
    };

    loadPosts();
  }, [user]);

  if (loadingUser) {
    return <div className="p-4 text-sm">Đang kiểm tra đăng nhập…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      {/* HEADER */}
      <header className="flex items-center justify-between border-b pb-2 mb-2">
        <div>
          <div className="font-bold text-lg">Bảng điều khiển người đăng</div>
          <div className="text-xs text-gray-600">
            Tài khoản: {user?.email}
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <button
            className="px-3 py-1 border rounded"
            onClick={() => navigate("/")}
          >
            Về trang chủ
          </button>
          <button
            className="px-3 py-1 border rounded"
            onClick={() => navigate("/report")}
          >
            Đăng bài mới
          </button>
        </div>
      </header>

      {/* NAV TABS GIẢ LẬP (sau này sẽ thêm nội dung các tab khác) */}
      <div className="flex gap-2 text-xs mb-2">
        <button className="px-3 py-1 rounded bg-orange-500 text-white">
          Bài đăng của tôi
        </button>
        <button className="px-3 py-1 rounded border">Cọc & giao dịch</button>
        <button className="px-3 py-1 rounded border">Giao mèo</button>
        <button className="px-3 py-1 rounded border">Đánh giá người nhận</button>
        <button className="px-3 py-1 rounded border">Check-in</button>
      </div>

      {/* KHỐI 1: BÀI ĐĂNG CỦA TÔI */}
      <section>
        <h2 className="font-semibold text-sm mb-2">Bài đăng của tôi</h2>

        {loadingPosts && (
          <div className="text-xs text-gray-600">Đang tải danh sách…</div>
        )}

        {error && (
          <div className="text-xs text-red-600 mb-2">
            {error}
          </div>
        )}

        {!loadingPosts && posts.length === 0 && (
          <div className="text-xs text-gray-500">
            Bạn chưa có bài đăng nào. Hãy bấm “Đăng bài mới”.
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {posts.map((pet) => (
            <article
              key={pet.id}
              className="border rounded-lg overflow-hidden text-xs bg-white shadow-sm"
            >
              {pet.image_url && (
                <img
                  src={pet.image_url}
                  alt={pet.name || "pet"}
                  className="w-full h-32 object-cover"
                />
              )}

              <div className="p-2 space-y-1">
                <div className="font-semibold text-sm truncate">
                  {pet.name || "Không đặt tên"}
                </div>

                <div className="text-gray-600">
                  Loại:{" "}
                  {pet.category === "lost"
                    ? "Mèo đi lạc"
                    : pet.category === "adopt"
                    ? "Nhận nuôi"
                    : pet.category === "rescue"
                    ? "Cứu hộ"
                    : "Khác"}
                </div>

                <div className="text-gray-600">
                  Trạng thái: {pet.status || "unknown"}
                </div>

                <div className="text-[11px] text-gray-500">
                  Đăng lúc:{" "}
                  {pet.created_at
                    ? new Date(pet.created_at).toLocaleString("vi-VN")
                    : "N/A"}
                </div>

                <div className="flex gap-1 mt-2">
                  <button
                    className="flex-1 border rounded py-1"
                    onClick={() => navigate(`/pet/${pet.id}`)}
                  >
                    Xem chi tiết
                  </button>
                  <button
                    className="flex-1 border rounded py-1"
                    onClick={() => navigate(`/edit-pet/${pet.id}`)}
                  >
                    Sửa
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* FOOTER ĐIỀU HƯỚNG ĐƠN GIẢN */}
      <footer className="pt-4 border-t mt-4 text-center text-[11px] text-gray-500">
        Pet Rescue Dashboard · Người đăng
      </footer>
    </div>
  );
}
