import React, { useState } from "react";

const QuickGuideModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);

  const guides = [
    {
      title: "Nuôi",
      icon: "🤝",
      content: [
        "1. Xem danh sách mèo/chó cần nhận nuôi trên bản đồ",
        "2. Nhấn vào bài đăng để xem chi tiết",
        "3. Đặt cọc(nếu có) để nhận nuôi thú cưng",
        "4. Gửi lời nhắn với chủ nuôi để thảo luận",
        "5. Xác nhận giao mèo bằng mã QR khi gặp mặt",
        "6. Nhận hoàn cọc khi người cho đánh giá tốt",
      ],
    },
    {
      title: "Mất",
      icon: "🔍",
      content: [
        "1. Thấy một chú mèo đi lạc trên bản đồ?",
        "2. Nhấn vào bài 🔍 Đi lạc để xem chi tiết",
        "3. Kiểm tra thông tin chủ mèo",
        "4. Báo tin nơi bạn nhìn thấy mèo (vị trí, ảnh, mô tả)",
        "5. Chủ mèo sẽ xem xét báo cáo của bạn",
        "6. Nếu xác minh đúng, bạn nhận thưởng từ chủ",
        "💡 Thưởng giúp khuyến khích cộng đồng tìm kiếm chủ động.",
      ],
    },
    {
      title: "Cứu",
      icon: "🚑",
      content: [
        "1. Xem bài cứu hộ 🚑 trên bản đồ (case khẩn cấp)",
        "2. Vào chi tiết để xem thú cưng gặp nạn cần hỗ trợ",
        "3. Bạn có thể:",
        "   • Quyên góp tiền hỗ trợ chi phí cứu hộ/điều trị",
        "   • Chia sẻ bài để tìm người cứu",
        "   • Báo tin nếu thấy thú cưng ở đâu",
        "4. Hệ thống ví quản lý toàn bộ tiền minh bạch",
        "💡 Tiền hỗ trợ tăng động lực người cứu trong tình huống nguy cấp.",
      ],
    },
    {
      title: "Cứu hộ + nhận thưởng",
      icon: "💰",
      content: [
        "1. Là người có lòng nhân ái muốn cứu thú cưng lạc, bị tổn thương?",
        "2. Tìm bài cứu hộ 🚑 trên MeoMap",
        "3. Liên hệ chủ bài để điều phối cứu hộ",
        "4. Thực hiện cứu hộ: tìm, vận chuyển, cấp cứu y tế",
        "5. Upload báo cáo chi tiết (ảnh, video, vị trí, tình trạng)",
        "6. Hệ thống xét duyệt và trả thưởng bằng tiền ủng hộ của cộng đồng cho bạn",
        "💡 Thưởng bù đắp chi phí xăng, thức ăn, y tế của bạn.",
      ],
    },
    {
      title: "Ví – Cọc – Thưởng – Voucher",
      icon: "💳",
      content: [
        "MeoMap dùng hệ thống ví minh bạch:",
        "",
        "💰 TIỀN CỌC (Adoption):",
        "• Người nhận đặt cọc khi nhận mèo",
        "• Nếu chăm tốt → hoàn cọc bằng voucher mua hàng",
        "• Nếu người nhận bị đánh giá xấu → chủ mèo nhận cọc( bằng voucher để tránh việc mua bán trá hình",
        "",
        "🎁 THƯỞNG (Lost):",
        "• Chủ mèo treo thưởng để khuyến khích tìm kiếm",
        "• Người tìm được nhận thưởng bằng tiền sau xác minh",
        "",
        "🔥 HỖ TRỢ (Rescue):",
        "• Tiền quyên góp hỗ trợ trực tiếp từ cộng đồng đến người cứu trong quá trình cứu (chi phí cứu hộ/điều trị)",
        "• Người cứu nhận thưởng do cộng đồng treo thưởngsau khi hoàn thành",
        "",
        "✨ Tất cả giao dịch lưu trữ, có uy tín, không ẩn danh.",
      ],
    },
  ];

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 119999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 540,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 16,
            background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            ❓ Hướng dẫn nhanh MeoMap
          </h2>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "white",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 12,
            background: "#f3f4f6",
            overflowX: "auto",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          {guides.map((g, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              style={{
                flex: "0 0 auto",
                padding: "8px 14px",
                background: activeTab === idx ? "#6366f1" : "#e5e7eb",
                color: activeTab === idx ? "white" : "#374151",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: activeTab === idx ? 600 : 500,
                whiteSpace: "nowrap",
              }}
            >
              {g.icon} {g.title.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            padding: 20,
            overflowY: "auto",
            fontSize: 14,
            lineHeight: 1.7,
            color: "#374151",
          }}
        >
          <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "#1f2937" }}>
            {guides[activeTab].icon} {guides[activeTab].title}
          </h3>

          <div style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
            {guides[activeTab].content.map((line, idx) => (
              <div key={idx} style={{ marginBottom: 4 }}>
                {line}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: 12,
            background: "#f9fafb",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            {activeTab + 1} / {guides.length}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickGuideModal;
