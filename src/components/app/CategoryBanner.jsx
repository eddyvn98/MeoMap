const CONTENT = {
  adopt: {
    title: "🤝 Nhận nuôi miễn phí",
    text: "Liên hệ trực tiếp người đăng để trao đổi việc nhận nuôi. MeoMap không thu tiền cọc.",
    box: "bg-emerald-100 border-emerald-500",
    textClass: "text-emerald-800",
  },
  lost: {
    title: "🔍 Mèo đi lạc – cần báo tin",
    text: "Nếu có thông tin, hãy liên hệ trực tiếp người đăng. MeoMap không giữ hoặc chi trả tiền thưởng.",
    box: "bg-red-100 border-red-500",
    textClass: "text-red-800",
  },
  rescue: {
    title: "🚑 Trường hợp khẩn cấp",
    text: "Người cứu có thể tự đăng lời kêu gọi và thông tin nhận hỗ trợ. Quyên góp chuyển trực tiếp cho người cứu.",
    box: "bg-amber-100 border-amber-300",
    textClass: "text-amber-800",
  },
};

export default function CategoryBanner({ type, onClose }) {
  if (!type) return null;
  const content = CONTENT[type];
  if (!content) return null;

  return (
    <div
      className={`fixed bottom-[120px] left-4 right-4 z-[10000] max-w-[400px] rounded-xl border-2 p-4 shadow-xl ${content.box}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={content.textClass}>
          <h4 className="mb-1.5 mt-0 text-sm font-bold">{content.title}</h4>
          <p className="m-0 text-[13px] leading-[1.4]">{content.text}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`-mt-1 border-none bg-transparent p-0 text-lg ${content.textClass}`}
        >
          ×
        </button>
      </div>
    </div>
  );
}
