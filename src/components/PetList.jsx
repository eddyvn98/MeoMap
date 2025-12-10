import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function PetList({
  pets,
  selectedPetId,
  setSelectedPetId,
  onFocusPet,
}) {
  const [adoptRequests, setAdoptRequests] = useState({});

  useEffect(() => {
    if (!pets || pets.length === 0) return;
    const adoptPets = pets.filter(p => p.category === 'adopt');
    if (adoptPets.length === 0) return;

    const load = async () => {
      const { data, error } = await supabase
        .from('deposits')
        .select('pet_id, status, confirmed_at')
        .in('pet_id', adoptPets.map(p => p.id || p.pet_id))
        .eq('status', 'confirmed');

      if (error) { console.error(error); return; }
      const map = {};
      (data || []).forEach(r => {
        map[r.pet_id] = r;
      });
      setAdoptRequests(map);
    };
    load();
  }, [pets]);

  const computeBadge = (request) => {
    return null;
  };

  if (!pets || pets.length === 0) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: "#6b7280" }}>
        Không có mèo nào trong khu vực với bộ lọc hiện tại.
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div
        style={{
          padding: "10px 12px",
          fontSize: 12,
          color: "#6b7280",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        Có {pets.length} bé trong khu vực này
      </div>

      {pets.map((pet) => {
        const petId = pet.id || pet.pet_id;
        const isSelected = petId === selectedPetId;

        const categoryLabel =
          pet.category === "lost"
            ? "Mèo thất lạc"
            : pet.category === "adopt"
            ? "Cho nhận nuôi"
            : pet.category === "rescue"
            ? "Cứu hộ"
            : "Khác";

        const req = adoptRequests[petId];
        const badge = req ? computeBadge(req) : null;

        return (
          <div
            key={petId}
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid #f1f5f9",
              cursor: "pointer",
              background: isSelected ? "#e0f2fe" : "transparent",
            }}
            onClick={() => {
              setSelectedPetId?.(petId);
              onFocusPet && onFocusPet(pet);
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
              {pet.name || "Mèo chưa đặt tên"}
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>{categoryLabel}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Trạng thái: {pet.status || "-"}
            </div>
            {badge && (
              <div style={{ marginTop: 6, display: 'inline-flex', padding: '3px 8px', borderRadius: 12, background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 600 }}>
                {badge.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
