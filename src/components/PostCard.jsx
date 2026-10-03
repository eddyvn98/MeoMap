const TYPE_LABEL = {
  adopt: "Cho nhận",
  lost: "Thất lạc",
  rescue: "Giải cứu",
};

const TYPE_COLOR = {
  adopt: "bg-green-100 text-green-800",
  lost: "bg-red-100 text-red-800",
  rescue: "bg-orange-100 text-orange-800",
};

const TYPE_BORDER = {
  adopt: "border-l-4 border-green-400",
  lost: "border-l-4 border-red-400",
  rescue: "border-l-4 border-orange-400",
};

async function sharePost(post) {
  const link = `${window.location.origin}/pet/${post.id}`;
  const emoji =
    post.category === "adopt" ? "💚" : post.category === "lost" ? "🆘" : "🔥";
  const action =
    post.category === "adopt"
      ? "THÚ CƯNG CẦN NHÀ MỚI!"
      : post.category === "lost"
        ? "GIÚP TÌM THÚ CƯNG!"
        : "CẦN CỨU HỘ!";
  const message = `${emoji} ${action}\n\n🐾 ${post.name || "Case thú cưng"}\n${
    post.description ? `📝 ${post.description.substring(0, 80)}...\n` : ""
  }\n📍 ${link}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: `${emoji} ${post.name || "MeoMap"}`,
        text: message,
        url: link,
      });
      return;
    }
    await navigator.clipboard.writeText(message);
    alert("✅ Đã sao chép nội dung chia sẻ.");
  } catch (error) {
    if (error?.name !== "AbortError") {
      console.error("Share failed:", error);
      alert("Không thể chia sẻ lúc này.");
    }
  }
}

export default function PostCard({
  post,
  onEdit,
  onDelete,
  onViewDetail,
}) {
  const postType = post.category?.toLowerCase() || "adopt";
  const typeLabel = TYPE_LABEL[postType] || "Khác";
  const colorClass = TYPE_COLOR[postType] || "bg-gray-100 text-gray-700";
  const borderClass = TYPE_BORDER[postType] || "border-l-4 border-gray-300";

  return (
    <article
      className={`flex gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${borderClass}`}
    >
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100">
        {post.image_url ? (
          <img
            src={post.image_url}
            alt={post.name || "Thú cưng"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-xs text-gray-500">Không ảnh</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div>
            <h4 className="text-base font-semibold text-gray-900">
              {post.name || "Case thú cưng"}
            </h4>
            <div className="text-sm text-gray-500">{typeLabel}</div>
          </div>
          <div
            className={`shrink-0 whitespace-nowrap rounded px-2 py-1 text-xs font-medium ${colorClass}`}
          >
            {post.status || "unknown"}
          </div>
        </div>

        <div className="mt-2 space-y-1 text-sm text-gray-600">
          {post.district && (
            <div>
              <span className="font-medium">Khu vực:</span> {post.district}
            </div>
          )}
          {post.description && (
            <div className="line-clamp-2">
              <span className="font-medium">Mô tả:</span> {post.description}
            </div>
          )}
        </div>

        <div className="mt-3 border-t border-gray-200 pt-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {onViewDetail && (
              <button
                type="button"
                onClick={() => onViewDetail(post)}
                className="font-medium text-sky-600 hover:text-sky-700"
              >
                🔍 Xem chi tiết
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(post)}
                className="font-medium text-sky-600 hover:text-sky-700"
              >
                ✏️ Chỉnh
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(post)}
                className="font-medium text-red-600 hover:text-red-700"
              >
                🗑 Xóa
              </button>
            )}
            <button
              type="button"
              onClick={() => sharePost(post)}
              className="font-medium text-purple-600 hover:text-purple-700"
            >
              🔗 Chia sẻ
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
