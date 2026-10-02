import AdoptPetDetail from "../AdoptPetDetail";
import LostPetDetail from "../LostPetDetail";
import RescuePetDetail from "../RescuePetDetail";

export default function PetDetailPanel({
  pet,
  user,
  onClose,
  onDelete,
  onEdit,
  onViewFull,
}) {
  if (!pet) return null;
  const isOwner = pet.owner_id === user?.id;

  return (
    <>
      <div className="absolute inset-0 z-[1999] bg-black/20" onClick={onClose} />
      <div className="absolute left-0 top-0 z-[2000] flex h-full w-[clamp(320px,33vw,560px)] flex-col overflow-hidden bg-white shadow-[2px_4px_16px_rgba(0,0,0,0.15)]">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="m-0 text-base font-bold">Chi tiết</h3>
          <button
            type="button"
            onClick={onClose}
            className="border-none bg-transparent px-2 text-2xl hover:text-gray-600"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {pet.category === "rescue" ? (
            <RescuePetDetail pet={pet} user={user} isOwner={isOwner} />
          ) : pet.category === "adopt" ? (
            <AdoptPetDetail pet={pet} user={user} isOwner={isOwner} />
          ) : pet.category === "lost" ? (
            <LostPetDetail
              pet={pet}
              user={user}
              isOwner={isOwner}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ) : (
            <>
              {pet.image_url && (
                <img
                  src={pet.image_url}
                  alt={pet.name}
                  className="mb-4 h-[200px] w-full rounded-xl object-cover"
                />
              )}
              <h2 className="mb-2 mt-0 text-xl font-bold">
                {pet.name || "Chưa đặt tên"}
              </h2>
              <div className="mb-3 inline-block rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                {pet.status || "Unknown"}
              </div>
              {pet.description && (
                <div className="mb-3">
                  <div className="mb-1 text-xs font-semibold text-gray-500">
                    📝 Mô tả
                  </div>
                  <div className="text-sm leading-relaxed text-gray-700">
                    {pet.description}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={onViewFull}
                className="w-full rounded-lg border-none bg-blue-500 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-600"
              >
                Xem đầy đủ
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
