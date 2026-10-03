export default function PetList({
  pets,
  selectedPetId,
  setSelectedPetId,
  onFocusPet,
}) {
  if (!pets || pets.length === 0) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: "#6b7280" }}>
        Không có thú cưng nào trong khu vực với bộ lọc hiện tại.
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
        Có {pets.length} thú cưng trong khu vực này
      </div>

      {pets.map((pet) => {
        const petId = pet.id || pet.pet_id;
        const isSelected = petId === selectedPetId;

        const categoryLabel =
          pet.category === "lost"
            ? "Thú cưng thất lạc"
            : pet.category === "adopt"
            ? "Cho nhận nuôi"
            : pet.category === "rescue"
            ? "Cứu hộ"
            : "Khác";


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
              {pet.name || "Thú cưng chưa đặt tên"}
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>{categoryLabel}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Trạng thái: {pet.status || "-"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
