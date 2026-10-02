export default function PetDeck({ pets, selectedPetId, onSelect }) {
  if (!pets.length) return null;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-0 right-0 z-[1500] px-4">
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
        {pets.map((pet) => {
          const petId = pet.id || pet.pet_id;
          const active = petId === selectedPetId;

          return (
            <button
              key={petId}
              type="button"
              onClick={() => onSelect(petId)}
              className={[
                "z-[100] w-[140px] shrink-0 overflow-hidden rounded-xl bg-white text-left transition-all",
                active
                  ? "border-2 border-blue-500 shadow-[0_4px_16px_rgba(59,130,246,0.4)]"
                  : "border-2 border-transparent shadow-[0_2px_12px_rgba(0,0,0,0.15)]",
              ].join(" ")}
            >
              {pet.image_url && (
                <img
                  src={pet.image_url}
                  alt={pet.name || "Thú cưng"}
                  className="h-[100px] w-full object-cover"
                />
              )}
              <div className="p-2">
                <div className="mb-0.5 truncate text-[13px] font-semibold">
                  {pet.name || "Mèo"}
                </div>
                <div className="text-[11px] capitalize text-gray-500">
                  {pet.status}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
