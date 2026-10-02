import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { localApi } from "../localClient";
import { useAuth } from "../AuthContext";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [rescues, setRescues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [{ data: myPosts }, { data: myRescues }] = await Promise.all([
        localApi.from("pets").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
        localApi.from("pets").select("*").eq("rescuer_id", user.id).eq("category", "rescue").order("created_at", { ascending: false }),
      ]);
      setPosts(myPosts || []);
      setRescues(myRescues || []);
      setLoading(false);
    };
    load();
  }, [user]);

  if (authLoading) return <div className="p-4 text-sm">Đang kiểm tra đăng nhập...</div>;
  if (!user) {
    navigate("/login");
    return null;
  }

  const Card = ({ pet, rescue = false }) => (
    <article className="overflow-hidden rounded-lg border bg-white shadow-sm">
      {pet.image_url && <img src={pet.image_url} alt={pet.name} className="h-32 w-full object-cover" />}
      <div className="space-y-2 p-3 text-sm">
        <div className="font-bold">{pet.name || "Case thú cưng"}</div>
        <div className="text-gray-600">
          {pet.category === "rescue" ? "🚑 Cứu hộ" : pet.category === "lost" ? "🔍 Đi lạc" : "🏡 Nhận nuôi"}
          {" · "}{["closed","delivered","completed"].includes(pet.status) ? "Đã đóng" : "Đang mở"}
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate(`/pet/${pet.id}`)} className="flex-1 rounded border px-3 py-2">Xem</button>
          {!rescue && !["closed","delivered","completed"].includes(pet.status) && (
            <button onClick={() => navigate(`/edit-pet/${pet.id}`)} className="flex-1 rounded border px-3 py-2">Sửa</button>
          )}
        </div>
      </div>
    </article>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <header className="flex items-center justify-between border-b pb-3">
        <div>
          <h1 className="text-xl font-bold">Trang cá nhân</h1>
          <p className="text-xs text-gray-500">{user.email}</p>
        </div>
        <button onClick={() => navigate("/report")} className="rounded bg-orange-500 px-4 py-2 text-sm font-semibold text-white">+ Đăng case</button>
      </header>

      <section>
        <h2 className="mb-3 font-bold">📝 Bài tôi đăng</h2>
        {loading ? <p className="text-sm text-gray-500">Đang tải...</p> : posts.length === 0 ? <p className="rounded bg-gray-50 p-4 text-sm text-gray-500">Bạn chưa đăng case nào.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{posts.map(p => <Card key={p.id} pet={p} />)}</div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">🚑 Ca cứu hộ tôi nhận</h2>
          <button onClick={() => navigate("/rescuer")} className="text-sm font-semibold text-orange-600">Tìm ca cứu hộ →</button>
        </div>
        {rescues.length === 0 ? <p className="rounded bg-gray-50 p-4 text-sm text-gray-500">Bạn chưa nhận ca cứu hộ nào.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rescues.map(p => <Card key={p.id} pet={p} rescue />)}</div>
        )}
      </section>

      <div className="rounded border bg-blue-50 p-3 text-sm text-blue-800">
        MeoMap không có ví, voucher hay cửa hàng và không giữ tiền của người dùng. Các bên tự liên hệ; quyên góp cứu hộ chuyển trực tiếp cho người cứu.
      </div>
    </div>
  );
}
