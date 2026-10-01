// src/pages/AdminDepositsPage.tsx
// Nhớ chỉnh lại đường dẫn import supabase cho đúng dự án của bạn

import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient"; // sửa nếu bạn để chỗ khác

// Tính mã số 6 chữ số từ pet_id
function getShortNumericCode(input: string): string {
  let hash = 0;
import AdminDepositsPageView from './views/AdminDepositsPageView';
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0; // 32-bit int
  }
  const num = Math.abs(hash) % 1000000; // 0..999999
  return num.toString().padStart(6, "0"); // luôn 6 số
}

type Profile = {
  id: string;
  role: string | null;
  display_name: string | null;
};

type DepositRow = {
  id: string;
  pet_id: string;
  owner_id: string;
  receiver_id: string;
  amount: number;
  status: string;
  created_at: string;
  reputation?: {
    user_id: string;
    total_trades: number;
    ok_trades: number;
    bad_trades: number;
  } | null;
};

export default function AdminDepositsPage() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lấy user + profile để check role = admin
  useEffect(() => {
    const init = async () => {
      setCheckingAuth(true);
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setProfile(null);
        setCheckingAuth(false);
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, display_name")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        setProfile(null);
        setCheckingAuth(false);
        setLoading(false);
        return;
      }

      setProfile(profileData);
      setCheckingAuth(false);

      if (profileData.role === "admin") {
        await loadDeposits();
      } else {
        setLoading(false);
      }
    };

    init();
  }, []);

  // Load danh sách cọc pending
  const loadDeposits = async () => {
    setLoading(true);
    setErrorMsg(null);

    // 1) Lấy danh sách cọc pending
    const { data, error } = await supabase
      .from("deposits")
      .select(
        "id, pet_id, owner_id, receiver_id, amount, status, created_at"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMsg(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const deposits = (data || []) as DepositRow[];

    // Nếu không có cọc nào thì khỏi query uy tín
    if (deposits.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    // 2) Lấy list receiver_id duy nhất
    const receiverIds = Array.from(
      new Set(deposits.map((d) => d.receiver_id).filter(Boolean))
    );

    // 3) Query user_reputation cho những user này
    const { data: reps, error: repErr } = await supabase
      .from("user_reputation")
      .select("user_id, total_trades, ok_trades, bad_trades")
      .in("user_id", receiverIds);

    // Map user_id -> reputation
    const repMap = new Map<string, any>();
    if (!repErr && reps) {
      for (const r of reps) {
        repMap.set(r.user_id, r);
      }
    }

    // 4) Gắn reputation vào từng deposit
    const withRep: DepositRow[] = deposits.map((d) => ({
      ...d,
      reputation: repMap.get(d.receiver_id) || null,
    }));

    setRows(withRep);
    setLoading(false);
  };

  // Admin bấm Confirm / Cancel
  const handleUpdateStatus = async (
    row: DepositRow,
    newStatus: "confirmed" | "cancelled"
  ) => {
    if (updatingId) return;

    let cancelReason: string | undefined = undefined;

    if (newStatus === "cancelled") {
      const reason = window.prompt(
        "Nhập lý do huỷ cọp (vd: Không thấy tiền, chuyển sai STK, chuyển thiếu tiền, ...):" 
      );
      if (!reason || reason.trim() === "") {
        return;
      }
      cancelReason = reason.trim();
    }

    setUpdatingId(row.id);
    setErrorMsg(null);

    const payload: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "cancelled" && cancelReason) {
      payload.cancel_reason = cancelReason;
    }

    // Tạo delivery_token khi confirm
    if (newStatus === "confirmed") {
      const token = Math.random().toString(36).substring(2, 10).toUpperCase();
      payload.delivery_token = token;
      payload.payment_status = "success";
      payload.payment_provider = "manual";
      payload.paid_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("deposits")
      .update(payload)
      .eq("id", row.id)
      .eq("status", "pending");

    if (error) {
      setErrorMsg(error.message);
      setUpdatingId(null);
      return;
    }

    // Nếu muốn: khi confirm thì khoá bài mèo (reserved)
    if (newStatus === "confirmed") {
      const { error: petError } = await supabase
        .from("pets")
        .update({ status: "reserved" })
        .eq("id", row.pet_id)
        .select()
        .single();
      
      if (petError) {
        // lỗi phụ, bỏ qua
      }
    }

    // Xoá dòng vừa xử lý khỏi danh sách pending
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setUpdatingId(null);
  };

  // ================== RENDER =====================

  if (checkingAuth) {
    return <div className="p-4">Đang kiểm tra đăng nhập...</div>;
  }

  if (!profile) {
    return <div className="p-4 text-red-600">Bạn chưa đăng nhập.</div>;
  }

  if (profile.role !== "admin") {
    return (
      <div className="p-4 text-red-600">
        Bạn không có quyền truy cập trang admin cọc.
      </div>
    );
  }

  return <AdminDepositsPageView scope={{
    hash,
    num,
    checkingAuth,
    setCheckingAuth,
    profile,
    setProfile,
    rows,
    setRows,
    loading,
    setLoading,
    updatingId,
    setUpdatingId,
    errorMsg,
    setErrorMsg,
    loadDeposits,
    handleUpdateStatus,
  }} />;
}
