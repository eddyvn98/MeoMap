// src/pages/AdoptionListPage.jsx
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AdoptionListPage() {
  const [adoptions, setAdoptions] = useState([]);
  const [petsById, setPetsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [ratingLoadingId, setRatingLoadingId] = useState(null);
  const navigate = useNavigate();
  const [reputationByUser, setReputationByUser] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg("");

      // 1. Lấy user hiện tại (người đăng)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMsg("Bạn cần đăng nhập bằng tài khoản người đăng.");
        setLoading(false);
        return;
      }

      const ownerId = user.id;

      // 2. Lấy danh sách adoption mà bạn là owner
      const { data: adoptionRows, error: adoptionErr } = await supabase
        .from("adoptions")
        .select("*")
        .eq("owner_id", ownerId)
        .order("adopted_at", { ascending: false });

      if (adoptionErr) {
        console.error(adoptionErr);
        setErrorMsg("Không tải được danh sách mèo đã giao.");
        setLoading(false);
        return;
      }

      const list = adoptionRows || [];
      setAdoptions(list);

      // 3. Lấy info pet tương ứng để hiện tên mèo
      const petIds = [...new Set(list.map((a) => a.pet_id))].filter(Boolean);

      if (petIds.length > 0) {
        const { data: pets, error: petsErr } = await supabase
          .from("pets")
          .select("id, name, district, status")
          .in("id", petIds);

        if (petsErr) {
          console.error(petsErr);
        } else {
          const map = {};
          for (const p of pets) {
            map[p.id] = p;
          }
          setPetsById(map);

          // 4. Lấy uy tín của người nhận (seeker)
          const seekerIds = [...new Set(list.map((a) => a.receiver_id))].filter(
            Boolean
          );

          if (seekerIds.length > 0) {
            const { data: reps, error: repErr } = await supabase
              .from("user_reputation")
              .select("user_id, good_count, bad_count")
              .in("user_id", seekerIds);

            if (repErr) {
              console.error(repErr);
            } else {
              const repMap = {};
              for (const r of reps) {
                repMap[r.user_id] = r;
              }
              setReputationByUser(repMap);
            }
          }
        }
      }

      setLoading(false);
    };

    load();
  }, []);

  const handleRate = async (adoption, rating) => {
    setErrorMsg("");
    setRatingLoadingId(adoption.id);

    try {
      // 1. Lấy user hiện tại = owner
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Bạn cần đăng nhập lại.");
      }

      const ownerId = user.id;
      const seekerId = adoption.receiver_id;

      // 2. Ghi feedback (good/bad)
      const { error: fbErr } = await supabase.from("adoption_feedback").insert({
        adoption_id: adoption.id,
        owner_id: ownerId,
        receiver_id: seekerId,
        rating, // 'good' hoặc 'bad'
      });

      if (fbErr) {
        console.error(fbErr);
        throw new Error("Không lưu được đánh giá.");
      }

      // 3. Cập nhật bảng user_reputation
      const { data: repRow, error: repErr } = await supabase
        .from("user_reputation")
        .select("*")
        .eq("user_id", seekerId)
        .single();

      if (repErr && repErr.code !== "PGRST116") {
        // PGRST116 = no rows
        console.error(repErr);
        // không fail cả quy trình vì lỗi này, nhưng log lại
      }

      if (!repRow) {
        // chưa có, insert mới
        const { error: insertRepErr } = await supabase
          .from("user_reputation")
          .insert({
            user_id: seekerId,
            good_count: rating === "good" ? 1 : 0,
            bad_count: rating === "bad" ? 1 : 0,
          });

        if (insertRepErr) {
          console.error(insertRepErr);
        }
      } else {
        // đã có, update
        const newGood =
          repRow.good_count + (rating === "good" ? 1 : 0);
        const newBad =
          repRow.bad_count + (rating === "bad" ? 1 : 0);

        const { error: updateRepErr } = await supabase
          .from("user_reputation")
          .update({
            good_count: newGood,
            bad_count: newBad,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", seekerId);

        if (updateRepErr) {
          console.error(updateRepErr);
        }
      }

      alert("Đã lưu đánh giá.");

      // 4. (đơn giản) ẩn adoption khỏi list sau khi đánh giá xong
      setAdoptions((prev) => prev.filter((a) => a.id !== adoption.id));
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Có lỗi khi đánh giá.");
    } finally {
      setRatingLoadingId(null);
    }
  };

  if (loading) {
    return <div style={{ padding: 16 }}>Đang tải danh sách...</div>;
  }

  if (errorMsg) {
    return <div style={{ padding: 16, color: "red" }}>{errorMsg}</div>;
  }

  if (!adoptions.length) {
    return (
      <div style={{ padding: 16 }}>
        Chưa có ca giao mèo nào hoặc tất cả đã đánh giá xong.
        <br />
        <button onClick={() => navigate("/")}>Về trang chủ</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Đánh giá người nhận mèo</h2>
      <p style={{ fontSize: 14, color: "#555" }}>
        Mỗi dòng là một lần bạn đã giao mèo. Hãy đánh giá người nhận là{" "}
        <strong>OK</strong> hoặc <strong>KHÔNG OK</strong> để ghi nhận uy tín.
      </p>

      {errorMsg && (
        <p style={{ color: "red", marginBottom: 8 }}>{errorMsg}</p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {adoptions.map((a) => {
          const pet = petsById[a.pet_id];
            const rep = reputationByUser[a.receiver_id];

          return (
            <li
              key={a.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <p style={{ margin: "4px 0" }}>
                <strong>Mèo:</strong> {pet ? pet.name : a.pet_id}
              </p>
              {pet && pet.district && (
                <p style={{ margin: "4px 0" }}>
                  <strong>Khu vực:</strong> {pet.district}
                </p>
              )}
              <p style={{ margin: "4px 0", fontSize: 12, color: "#555" }}>
                Nhận mèo lúc:{" "}
                {a.adopted_at
                  ? new Date(a.adopted_at).toLocaleString()
                  : "Không rõ"}

                        {rep && (
                          <p style={{ margin: "4px 0", fontSize: 12, color: "#333" }}>
                            Uy tín người nhận: {rep.good_count} OK / {rep.bad_count} KHÔNG OK
                          </p>
                        )}
              </p>

              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => handleRate(a, "good")}
                  disabled={ratingLoadingId === a.id}
                  style={{ marginRight: 8 }}
                >
                  {ratingLoadingId === a.id ? "Đang lưu..." : "OK (Nuôi tốt)"}
                </button>
                <button
                  onClick={() => handleRate(a, "bad")}
                  disabled={ratingLoadingId === a.id}
                >
                  {ratingLoadingId === a.id ? "Đang lưu..." : "KHÔNG OK"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <button onClick={() => navigate("/")} style={{ marginTop: 12 }}>
        Về trang chủ
      </button>
    </div>
  );
}
