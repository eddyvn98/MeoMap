import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { localApi } from "../localClient";
import AdoptPetDetail from "../components/AdoptPetDetail";
import LostPetDetail from "../components/LostPetDetail";
import RescuePetDetail from "../components/RescuePetDetail";

export default function PetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      const [{ data: auth }, { data: petData, error: petError }] =
        await Promise.all([
          localApi.auth.getUser(),
          localApi.from("pets").select("*").eq("id", id).maybeSingle(),
        ]);

      if (!active) return;
      setUser(auth?.user || null);
      if (petError || !petData) {
        setPet(null);
        setError("Không tìm thấy case.");
      } else {
        setPet(petData);
      }
      setLoading(false);
    };

    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) return <div className="p-6 text-sm">Đang tải...</div>;
  if (error || !pet) {
    return (
      <div className="p-6 text-sm text-red-600">
        {error || "Không tìm thấy case."}
      </div>
    );
  }

  const isOwner = !!user && pet.owner_id === user.id;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 pb-20">
      <button
        onClick={() => navigate(-1)}
        className="rounded border bg-white px-3 py-2 text-sm"
      >
        ← Quay lại
      </button>
      {pet.category === "rescue" ? (
        <RescuePetDetail pet={pet} user={user} isOwner={isOwner} />
      ) : pet.category === "adopt" ? (
        <AdoptPetDetail pet={pet} user={user} isOwner={isOwner} />
      ) : (
        <LostPetDetail pet={pet} user={user} isOwner={isOwner} />
      )}
    </div>
  );
}
