import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { localApi } from "../localClient";

const WIDTH_MAP = {
  compact: "clamp(320px, 26vw, 440px)",
  normal: "clamp(360px, 33vw, 560px)",
  wide: "clamp(440px, 38vw, 640px)",
};

export default function ProfileDrawer({
  isOpen,
  onClose,
  widthMode = "normal",
  onChangeWidth,
  inlineWithinMap = false,
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      const { data: auth } = await localApi.auth.getUser();
      const currentUser = auth?.user || null;
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setPosts([]);
        setLoading(false);
        return;
      }

      const [{ data: profileData }, { data: postData }] = await Promise.all([
        localApi.from("profiles").select("id,display_name,email,phone,avatar_url,role").eq("id", currentUser.id).maybeSingle(),
        localApi.from("pets").select("*").eq("owner_id", currentUser.id).order("created_at", { ascending: false }),
      ]);
      setProfile(profileData || null);
      setPosts(postData || []);
      setLoading(false);
    };
    load();
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b flex items-center justify-between gap-2">
        <div>
          <div className="font-bold text-lg">Trang cá nhân</div>
          <div className="text-xs text-gray-500">{profile?.email || user?.email || ""}</div>
        </div>
        <div className="flex gap-1">
          {onChangeWidth && ["compact","normal","wide"].map(mode => (
            <button key={mode} onClick={() => onChangeWidth(mode)} className={`px-2 py-1 text-xs rounded border ${widthMode===mode?"bg-gray-900 text-white":""}`}>
              {mode === "compact" ? "S" : mode === "wide" ? "L" : "M"}
            </button>
          ))}
          <button onClick={onClose} className="px-2 py-1 text-xl leading-none">×</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {loading ? (
          <div className="text-sm text-gray-500">Đang tải...</div>
        ) : !user ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Bạn chưa đăng nhập.</p>
            <button onClick={() => navigate("/login")} className="w-full rounded bg-blue-600 px-4 py-2 font-semibold text-white">Đăng nhập</button>
          </div>
        ) : (
          <>
            <section className="rounded-lg border p-3">
              <div className="flex items-center gap-3">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover" /> : <div className="w-12 h-12 rounded-full bg-gray-200" />}
                <div>
                  <div className="font-semibold">{profile?.display_name || "Người dùng MeoMap"}</div>
                  {profile?.phone && <div className="text-sm text-gray-600">📱 {profile.phone}</div>}
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Bài đăng của tôi</h3>
                <button onClick={() => navigate("/report")} className="text-sm font-semibold text-orange-600">+ Đăng case</button>
              </div>
              {posts.length === 0 ? (
                <div className="rounded bg-gray-50 p-3 text-sm text-gray-500">Bạn chưa đăng case nào.</div>
              ) : (
                <div className="space-y-2">
                  {posts.map(post => (
                    <button key={post.id} onClick={() => navigate(`/pet/${post.id}`)} className="w-full text-left rounded-lg border p-3 hover:bg-gray-50">
                      <div className="font-semibold">{post.name || "Case thú cưng"}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {post.category === "rescue" ? "🚑 Cứu hộ" : post.category === "lost" ? "🔍 Đi lạc" : "🏡 Nhận nuôi"}
                        {" · "}{["closed","delivered","completed"].includes(post.status) ? "Đã đóng" : "Đang mở"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-lg border bg-blue-50 p-3 text-sm text-blue-800">
              MeoMap chỉ quản lý case và thông tin liên hệ. Không có ví, cọc, voucher, cửa hàng hoặc giao dịch tiền.
            </section>

            <button onClick={() => navigate("/account")} className="w-full rounded border px-4 py-2 font-semibold">Mở trang tài khoản đầy đủ</button>
          </>
        )}
      </div>
    </div>
  );

  if (inlineWithinMap) {
    return <aside style={{ width: WIDTH_MAP[widthMode] || WIDTH_MAP.normal, minWidth: 320 }} className="h-full border-l bg-white">{content}</aside>;
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-black/40 flex justify-end" onClick={onClose}>
      <aside style={{ width: WIDTH_MAP[widthMode] || WIDTH_MAP.normal }} className="h-full max-w-full bg-white shadow-xl" onClick={e=>e.stopPropagation()}>
        {content}
      </aside>
    </div>
  );
}
