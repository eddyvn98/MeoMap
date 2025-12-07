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

  // PAGINATION
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [totalPets, setTotalPets] = useState(0);

  const fetchPets = async () => {
    setLoading(true);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { count } = await supabase
      .from("pets")
      .select("*", { count: "exact", head: true });

    setTotalPets(count || 0);

    const { data, error } = await supabase
      .from("pets")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Lỗi load pets:", error);
      setPets([]);
    } else {
      setPets(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPets();
  }, [page]);

  return (
    <div className="pb-20 bg-[#f5f5f7] min-h-screen">
      {/* <Header /> */}

      <div className="px-5 py-4">
        {/* HERO BUTTON */}
        <div className="text-center mb-6">
          <button
            onClick={() => navigate("/map")}
            className="bg-[#ff7f32] text-white px-7 py-4 rounded-2xl text-lg font-bold inline-flex items-center gap-2 shadow-[0_4px_14px_rgba(255,127,50,0.35)]"
          >
            🐾 REPORT A PET
          </button>
        </div>

        {/* MAP PREVIEW */}
        <div className="lg:px-24 py-4">
          <div className="rounded-xl overflow-hidden shadow-md bg-white p-6">
            <PetMap pets={pets} />
          </div>
        </div>

        <button
          onClick={() => navigate("/map")}
          className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 block mx-auto mb-7"
        >
          Xem bản đồ toàn màn hình
        </button>

        {/* TITLE */}
        <div className="bg-white rounded-2xl p-5 pb-7 shadow-[0_4px_15px_rgba(0,0,0,0.07)] mb-8">
          <h2 className="text-[22px] font-extrabold mb-4 text-[#222]">
            Thú cưng cần giúp đỡ 🐶🐱
          </h2>

          {loading && (
            <div className="text-center py-6 text-gray-500 text-sm">
              Đang tải dữ liệu...
            </div>
          )}

          {/* PET LIST */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-[18px]">
            {!loading &&
              pets.map((p) => {
                const petId = p.id || p.pet_id;
                const image = p.image_url || "https://placehold.co/600x400";

                return (
                  <div
                    key={petId}
                    onClick={() => navigate(`/pet/${petId}`)}
                    className="bg-white rounded-xl overflow-hidden cursor-pointer shadow-[0_3px_10px_rgba(0,0,0,0.07)] transition-transform hover:-translate-y-1"
                  >
                    {/* IMAGE */}
                    <div className="w-full h-[140px] bg-gray-200">
                      <img
                        src={image}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* INFO */}
                    <div className="px-3 py-2">
                      <div className="text-[15px] font-bold mb-1 text-[#222]">
                        {p.name || "Chưa rõ tên"}
                      </div>

                      <span
                        className={`
                          inline-block text-[12px] font-semibold px-2 py-1 rounded mb-1
                          ${
                            p.status === "lost"
                              ? "bg-red-100 text-red-500"
                              : p.status === "found"
                              ? "bg-green-100 text-green-600"
                              : "bg-orange-100 text-orange-500"
                          }
                        `}
                      >
                        {p.status}
                      </span>

                      <div className="text-[13px] text-gray-600">
                        📍 {p.district}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* PAGINATION */}
          <div className="mt-6 text-center">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className={`px-4 py-2 mr-2 rounded-lg border ${
                page === 1
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-white"
              }`}
            >
              ◀ Prev
            </button>

            <span className="font-bold">
              Page {page} / {Math.ceil(totalPets / pageSize)}
            </span>

            <button
              disabled={page >= Math.ceil(totalPets / pageSize)}
              onClick={() => setPage((p) => p + 1)}
              className={`px-4 py-2 ml-2 rounded-lg border ${
                page >= Math.ceil(totalPets / pageSize)
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-white"
              }`}
            >
              Next ▶
            </button>
          </div>
        </div>
      </div>

      {/* <BottomNav /> */}
    </div>
  );
}
