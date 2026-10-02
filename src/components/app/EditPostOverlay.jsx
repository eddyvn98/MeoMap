import EditPostPanel from "../EditPostPanel";

export default function EditPostOverlay({ post, onClose, onSuccess }) {
  if (!post) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-[90%] max-w-[600px] flex-col rounded-lg bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <EditPostPanel post={post} onClose={onClose} onSuccess={onSuccess} />
      </div>
    </div>
  );
}
