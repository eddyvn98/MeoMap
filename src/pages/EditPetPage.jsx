import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { localApi } from "../localClient";

export default function EditPetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [form, setForm] = useState({ name: "", district: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await localApi.auth.getUser();
      if (!auth?.user) return navigate("/login");
      const { data, error } = await localApi
        .from("pets")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error || !data || data.owner_id !== auth.user.id) return navigate("/");
      setPet(data);
      setForm({ name: data.name || "", district: data.district || "", description: data.description || "" });
    };
    load();
  }, [id, navigate]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await localApi.from("pets").update({
      name: form.name.trim(),
      district: form.district.trim(),
      description: form.description.trim(),
    }).eq("id", id);
    setSaving(false);
    if (error) return alert("Không thể lưu: " + error.message);
    navigate(`/pet/${id}`);
  };

  if (!pet) return <div className="p-6 text-sm">Đang tải...</div>;

  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="mb-1 text-xl font-bold">Sửa case</h1>
      <p className="mb-4 text-sm text-gray-500">Chỉ chỉnh thông tin case. MeoMap không có cọc, thưởng hoặc giao dịch tiền.</p>
      <form onSubmit={save} className="space-y-4">
        <div><label className="mb-1 block text-sm font-semibold">Tiêu đề</label><input className="w-full rounded border p-2" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></div>
        <div><label className="mb-1 block text-sm font-semibold">Khu vực</label><input className="w-full rounded border p-2" value={form.district} onChange={e=>setForm({...form,district:e.target.value})} /></div>
        <div><label className="mb-1 block text-sm font-semibold">Mô tả</label><textarea className="w-full rounded border p-2" rows={6} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} /></div>
        <div className="flex gap-2"><button type="button" onClick={()=>navigate(-1)} className="flex-1 rounded border px-4 py-2">Hủy</button><button disabled={saving} className="flex-1 rounded bg-blue-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving?"Đang lưu...":"Lưu"}</button></div>
      </form>
    </div>
  );
}
