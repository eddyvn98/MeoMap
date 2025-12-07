import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";
import PetMap from "./components/PetMap";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";

export default function App() {
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPets = async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Lỗi load pets:", error);
        setPets([]);
      } else {
        setPets(data || []);
      }
      setLoading(false);
    };

    fetchPets();
  }, []);

  return (
    <div style={{ paddingBottom: 80 }}>
      <Header />

      <div style={{ padding: 20 }}>
        <button
          style={{
            width: "100%",
            padding: "15px 0",
            background: "#ff7f32",
            border: "none",
            color: "#fff",
            borderRadius: 10,
            fontSize: 18,
            fontWeight: "bold",
            marginBottom: 20,
          }}
          onClick={() => navigate("/map")}
        >
          REPORT A PET
        </button>

        <h2>Lost & Found Map</h2>
        {/* Map dùng dữ liệu từ Supabase */}
        <PetMap pets={pets} />

        <button
          onClick={() => navigate("/map")}
          style={{
            margin: "10px 0 20px",
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        >
          Mở bản đồ toàn màn hình
        </button>

        <h2>Pets needing help</h2>

        {loading && <div>Đang tải...</div>}

        {!loading &&
          pets.map((p) => {
            const petId = p.id || p.pet_id;
            console.log("Pet item:", { name: p.name, id: p.id, pet_id: p.pet_id, petId });
            
            return (
            <div
              key={petId}
              style={{
                border: "1px solid #eee",
                borderRadius: 10,
                padding: 10,
                marginBottom: 10,
                display: "flex",
                gap: 10,
                cursor: "pointer",
              }}
              onClick={() => navigate(`/pet/${petId}`)}
            >
              {p.image_url && (
                <img
                  src={p.image_url}
                  alt={p.name}
                  style={{
                    width: 60,
                    height: 60,
                    objectFit: "cover",
                    borderRadius: 12,
                  }}
                />
              )}
              <div>
                <strong>{p.name}</strong>
                <br />
                <span>{p.status}</span>
                <br />
                <small>{p.district}</small>
              </div>
            </div>
            );
          })}
      </div>

      <BottomNav />
    </div>
  );
}
