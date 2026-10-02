import React from 'react';

const TYPE_LABEL = {
  adopt: 'Cho nhận',
  lost: 'Thất lạc',
  rescue: 'Giải cứu',
};

const TYPE_COLOR = {
  adopt: 'bg-green-100 text-green-800',
  lost: 'bg-red-100 text-red-800',
  rescue: 'bg-orange-100 text-orange-800',
};

const TYPE_BORDER = {
  adopt: 'border-l-4 border-green-400',
  lost: 'border-l-4 border-red-400',
  rescue: 'border-l-4 border-orange-400',
};


export default function PostCard({
  post,
  onEdit,
  onDelete,
  onShowQR,
  onEnterToken,
  onViewDetail,
}) {
  // Infer type from category field (can be 'adopt', 'lost', 'rescue', etc.)
  const postType = post.category?.toLowerCase() || 'adopt';
  const typeLabel = TYPE_LABEL[postType] || 'Khác';
  const colorClass = TYPE_COLOR[postType] || 'bg-gray-100 text-gray-700';
  const borderClass = TYPE_BORDER[postType] || 'border-l-4 border-gray-300';

  return (
    <article className={`flex gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${borderClass}`}>
      {/* Image */}
      <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-md flex items-center justify-center overflow-hidden">
        {post.image_url ? (
          <img
            src={post.image_url}
            alt={post.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-xs text-gray-500">No img</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header: Name + Status Badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="text-base font-semibold text-gray-900">{post.name || 'Mèo'}</h4>
            <div className="text-sm text-gray-500">{typeLabel}</div>
          </div>
          <div className={`px-2 py-1 text-xs rounded font-medium whitespace-nowrap flex-shrink-0 ${colorClass}`}>
            {post.status || 'unknown'}
          </div>
        </div>

        {/* Details based on type */}
        <div className="mt-2 text-sm text-gray-600 space-y-1">
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

        {/* Action Row - Separated with border-top and icons */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex flex-wrap gap-3 items-center text-sm">
            <button
              onClick={() => onViewDetail?.(post)}
              className="text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
            >
              🔍 Xem chi tiết
            </button>
            <button
              onClick={() => onEdit?.(post)}
              className="text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
            >
              ✏️ Chỉnh
            </button>
            <button
              onClick={() => onDelete?.(post)}
              className="text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
            >
              🗑 Xóa
            </button>
            <button
              onClick={() => {
                const link = `${window.location.origin}/pet/${post.id}`;
                const emoji = post.category === 'adopt' ? '💚' : post.category === 'lost' ? '🆘' : '🔥';
                const action = post.category === 'adopt' ? 'MÈO CẦN NHÀ MỚI!' : post.category === 'lost' ? 'GIÚP TÌM MÈO!' : 'CẦN CỨU HỘ!';
                const message = `${emoji} ${action}\n\n🐱 ${post.name}\n${post.description ? `📝 ${post.description.substring(0, 80)}...\n` : ''}\n\n📍 ${link}`;
                
                if (navigator.share) {
                  navigator.share({ 
                    title: `${emoji} ${post.category === 'adopt' ? 'Nhận nuôi' : post.category === 'lost' ? 'Tìm mèo' : 'Cứu hộ'}: ${post.name}`,
                    text: message,
                    url: link 
                  });
                } else {
                  navigator.clipboard.writeText(message);
                  alert("✅ Đã copy nội dung chia sẻ!");
                }
              }}
              className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              🔗 Share
            </button>
            {postType === 'adopt' && (
              <button
                onClick={() => onShowQR?.(post)}
                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                🔐 Hiện QR
              </button>
            )}
            {postType === 'rescue' && (
              <button
                onClick={() => onEnterToken?.(post)}
                className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                🔑 Nhập token
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
