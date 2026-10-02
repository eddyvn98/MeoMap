const CARDS = [
  {
    title: "MeoMap dùng để làm gì?",
    bullets: [
      "Đăng và tìm thú cưng đi lạc",
      "Đăng tin nhận nuôi chó/mèo",
      "Báo tin cứu hộ, cập nhật tình trạng",
      "Đăng, chỉnh sửa và đóng các case của bạn",
    ],
  },
  {
    title: "MeoMap không quản lý tiền",
    bullets: [
      "Nhận nuôi và đi lạc chỉ đăng, liên hệ trực tiếp và đóng case",
      "Cứu hộ: người cứu tự đăng lời kêu gọi và thông tin nhận hỗ trợ",
      "Mọi khoản hỗ trợ chuyển trực tiếp cho người cứu ngoài MeoMap",
    ],
  },
];

export const onboardingCardCount = CARDS.length;

export default function OnboardingModal({ open, step, onClose, onNext }) {
  if (!open) return null;
  const card = CARDS[step];

  return (
    <div className="fixed inset-0 z-[120000] flex items-center justify-center bg-black/55 p-4">
      <div className="w-full max-w-[420px] rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="m-0 text-lg font-bold">{card.title}</h3>
          <button
            type="button"
            onClick={() => onClose(true)}
            className="border-none bg-transparent text-lg text-gray-500"
          >
            ×
          </button>
        </div>

        <ul className="mb-4 list-disc pl-[18px] text-sm leading-[1.6] text-gray-700">
          {card.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        <div className="mb-2.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onClose(true)}
            className="border-none bg-transparent text-[13px] text-gray-500 underline"
          >
            Đừng hiện lại
          </button>
          <div className="text-xs text-gray-500">
            Bước {step + 1}/{CARDS.length}
          </div>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="w-full rounded-[10px] border-none bg-emerald-500 p-3 text-[15px] font-bold text-white"
        >
          {step >= CARDS.length - 1 ? "Bắt đầu thôi" : "Tiếp tục"}
        </button>
      </div>
    </div>
  );
}
