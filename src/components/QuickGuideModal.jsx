import React, { useState } from "react";

const QuickGuideModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);

  const guides = [
    {
      title: "Tổng quan vai trò",
      icon: "🧭",
      content: [
        "👤 Người đăng: tạo bài (Nuôi/Đi lạc/Cứu hộ), quản lý, kết thúc",
        "🤝 Người nhận nuôi: đặt cọc (nếu có), hẹn giao, quét QR nhận mèo",
        "🛰️ Người báo tìm thấy: gửi báo tin (Đi lạc), nhận/hoặc từ chối thưởng",
        "🚑 Người cứu: nhận ca, kêu gọi, cập nhật, hoàn thành ca cứu hộ",
        "👀 Người đọc/ủng hộ: xem bài, chia sẻ, quyên góp, theo dõi tiến độ",
        "💡 Mọi luồng đều xem được ở panel phải, không cần rời trang.",
      ],
    },
    {
      title: "Nuôi (Adopt)",
      icon: "🤝",
      content: [
        "Người đăng: tạo bài Nuôi, xem bài ở Trang cá nhân → 'Bài đăng của tôi'",
        "Người nhận: mở chi tiết, nếu yêu cầu cọc → đặt cọc, gửi lời nhắn, hẹn giao",
        "Giao mèo: quét QR hoặc xác nhận nút; chủ đánh giá tốt → hoàn cọc bằng voucher",
        "Nếu chủ đánh giá xấu → chủ nhận cọc (voucher); tránh giao dịch bán trá hình",
        "Tip: kiểm tra uy tín trước khi giao/nhận; luôn xác nhận bằng QR để có bằng chứng",
      ],
    },
    {
      title: "Mất (Lost)",
      icon: "🔍",
      content: [
        "Người đăng: tạo bài Đi lạc, treo thưởng nếu muốn, theo dõi báo tin ở panel phải",
        "Người báo tin: mở chi tiết, bấm 'Báo tin', gửi vị trí/ảnh/mô tả (miễn phí)",
        "Sau báo tin: hai bên thấy thông tin liên hệ; hẹn gặp, xác nhận bằng QR/nút",
        "Nhận thưởng: sau xác nhận, hệ thống trả thưởng; có thể bấm Hủy nhận thưởng",
        "Tip: luôn dùng QR/nút xác nhận để ghi nhận giao dịch và giải ngân thưởng tự động",
      ],
    },
    {
      title: "Cứu hộ (Rescue)",
      icon: "🚑",
      content: [
        "Người đăng ca: tạo bài Cứu hộ (có thể đặt tiền hỗ trợ), xem bài ở panel phải",
        "Người cứu: mở chi tiết, bấm 'Nhận ca cứu hộ' → vào Trung tâm cứu hộ (panel)",
        "Trong Trung tâm: Kêu gọi ủng hộ, Cập nhật tình hình (ảnh/video/chi phí), Hoàn thành ca",
        "Người ủng hộ: xem chi tiết, quyên góp, xem lời kêu gọi, xem timeline cập nhật",
        "Kết thúc: bấm Hoàn thành ca → giải ngân tiền hỗ trợ + tiền quyên góp theo quy trình",
      ],
    },
    {
      title: "Cứu hộ + nhận thưởng",
      icon: "💰",
      content: [
        "Nhận ca: từ tab 'Cứu hộ' hoặc chi tiết bài → 'Nhận ca cứu hộ'",
        "Làm nhiệm vụ: tìm, vận chuyển, cấp cứu y tế; cập nhật thường xuyên để minh bạch",
        "Hoàn thành: quét QR hoặc nút hoàn thành; nhận tiền hỗ trợ/treo thưởng",
        "Minh bạch: mọi kêu gọi/chi phí/ảnh/video hiển thị ở panel để cộng đồng theo dõi",
        "Có thể từ chối thưởng: tiền sẽ về ví người đăng và quy đổi thành voucher",
      ],
    },
    {
      title: "Ví – Cọc – Thưởng",
      icon: "💳",
      content: [
        "Cọc (Adopt): đặt cọc khi nhận mèo; hoàn cọc bằng voucher nếu được đánh giá tốt",
        "Thưởng (Lost): chủ treo thưởng; người báo tin nhận sau xác minh; có thể từ chối",
        "Hỗ trợ (Rescue): tiền quyên góp cho chi phí cứu hộ; giải ngân khi hoàn thành",
        "Tất cả giao dịch: lưu vết, minh bạch, hiển thị trong ví; không ẩn danh",
        "Tip: luôn dùng QR/nút xác nhận để tự động hóa giải ngân & tránh tranh chấp",
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
