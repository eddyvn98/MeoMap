// src/components/PetList.jsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function PetList() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const loadPets = async () => {
      setErrorMsg("");
      setLoading(true);

      const { data, error } = await supabase
        .from("pets")
        .select(
          "id, name, status, district, lat, lng, description, image_url, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Load pets error:", error);
        setErrorMsg("Không tải được danh sách mèo.");
        setPets([]);
      } else {
        setPets(data || []);
      }

      setLoading(false);
    };

    loadPets();
  }, []);

  if (loading) {
    return <div style={{ padding: 16 }}>Đang tải danh sách mèo...</div>;
  }

  if (errorMsg) {
    return <div style={{ padding: 16, color: "red" }}>{errorMsg}</div>;
  }

  if (!pets.length) {
    return <div style={{ padding: 16 }}>Chưa có báo mèo nào.</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Danh sách mèo mới nhất</h2>

      <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
        {pets.map((pet) => (
          <li
            key={pet.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              marginBottom: 8,
              display: "flex",
              gap: 12,
            }}
          >
            {pet.image_url && (
              <img
                src={pet.image_url}
                alt={pet.name}
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 8,
                }}
              />
            )}

            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0 }}>
                <Link to={`/pet/${pet.id}`}>{pet.name}</Link>
              </h3>
              <p style={{ margin: "4px 0" }}>
                <strong>Trạng thái:</strong> {pet.status}
              </p>
              {pet.district && (
                <p style={{ margin: "4px 0" }}>
                  <strong>Khu vực:</strong> {pet.district}
                </p>
              )}
              {pet.description && (
                <p style={{ margin: "4px 0", fontSize: 12, color: "#555" }}>
                  {pet.description}
                </p>
              )}
            </div>

            <div style={{ alignSelf: "center" }}>
              <Link to={`/pet/${pet.id}`}>Xem chi tiết</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
