import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { localApi } from "../localClient";

export default function ProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data: p }, { data: ps }] = await Promise.all([
        localApi.from("profiles").select("id,display_name,email,phone,avatar_url").eq("id", userId).maybeSingle(),
        localApi.from("pets").select("id,name,category,status,image_url").eq("owner_id", userId).order("created_at", { ascending:false }),
      ]);
      setProfile(p || null);
      setPosts(ps || []);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading) return <div className="p-6 text-sm">Đang tải...</div>;
  if (!profile) return <div className="p-6 text-sm text-red-600">Không tìm thấy người dùng.</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-5">
      <section className="border rounded-lg p-4 bg-white flex items-center gap-3">
        {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" /> : <div className="w-16 h-16 rounded-full bg-gray-200" />}
        <div>
          <h1 className="text-xl font-bold">{profile.display_name || "Người dùng MeoMap"}</h1>
          {profile.phone && <div className="text-sm text-gray-600">📱 {profile.phone}</div>}
          {profile.email && <div className="text-sm text-gray-600">✉️ {profile.email}</div>}
        </div>
      </section>

      <section>
        <h2 className="font-bold mb-3">Case đã đăng</h2>
        {posts.length === 0 ? <div className="text-sm text-gray-500">Chưa có case nào.</div> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {posts.map(post => (
              <Link key={post.id} to={`/pet/${post.id}`} className="border rounded-lg overflow-hidden bg-white">
                {post.image_url && <img src={post.image_url} alt={post.name} className="h-32 w-full object-cover" />}
                <div className="p-3">
                  <div className="font-semibold">{post.name || "Case thú cưng"}</div>
                  <div className="text-xs text-gray-500 mt-1">{post.category === "rescue" ? "🚑 Cứu hộ" : post.category === "lost" ? "🔍 Đi lạc" : "🏡 Nhận nuôi"}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
