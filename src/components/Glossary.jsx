import { useState } from "react";

const glossaryTerms = {
  adoption: [
    {
      term: "Nhận Nuôi",
      definition: "Quá trình một người quyết định chăm sóc một con mèo/chó thay thế chủ cũ. Trên MeoMap, nhận nuôi là miễn phí nhưng cần tiền cọc để đảm bảo trách nhiệm.",
    },
    {
      term: "Tiền Cọc",
      definition: "Số tiền tạm thời yêu cầu từ người nhận nuôi để đảm bảo họ chăm sóc tốt. Tiền sẽ được hoàn lại 100% khi hoàn thành quá trình nhận nuôi.",
    },
    {
      term: "Checkin Hàng Tuần",
      definition: "Bước xác nhận định kỳ mà người nhận nuôi gửi ảnh/video chứng minh mèo/chó khỏe mạnh. Giúp chủ cũ yên tâm về sức khỏe thú cưng.",
    },
    {
      term: "Chủ Cũ",
      definition: "Người từng sở hữu hoặc chăm sóc thú cưng trước đó. Họ có thể theo dõi tiến trình nhận nuôi qua checkins hàng tuần.",
    },
    {
      term: "Người Nhận Nuôi",
      definition: "Người mới sẽ chăm sóc thú cưng từ nay về sau. Họ cần gửi tiền cọc và commit checkins hàng tuần.",
    },
    {
      term: "Hoàn Lại Cọc",
      definition: "Quá trình trả lại tiền cọc cho người nhận nuôi sau khi hoàn thành thành công (thường sau 8-12 tuần checkins).",
    },
  ],
  financial: [
    {
      term: "Ví MeoMap",
      definition: "Tài khoản quản lý tài chính trên nền tảng. Ví chứa tiền từ thưởng tìm mèo, cọc hoàn lại, voucher và các dịch vụ khác.",
    },
    {
      term: "Tiền Thưởng",
      definition: "Khoản tiền chủ mèo/chó treo thưởng để khuyến khích mọi người báo tin nếu thấy thú cưng mất tích. Không phải mua bán, mà là tri ân công sức người giúp đỡ.",
    },
    {
      term: "Tiền Hỗ Trợ Cứu Hộ",
      definition: "Khoản tiền chủ đăng ký để hỗ trợ chi phí cho người cứu hộ (chi phí thức ăn, vận chuyển, điều trị). Người cứu sẽ nhận khoản này khi hoàn thành ca cứu hộ.",
    },
    {
      term: "Tiền Quyên Góp",
      definition: "Khoản tiền cộng đồng quyên góp để hỗ trợ chi phí điều trị thú cưng trong các ca cứu hộ khẩn cấp.",
    },
    {
      term: "Voucher",
      definition: "Mã giảm giá hoặc ưu đãi từ MeoMap hoặc các đối tác. Có thể dùng trong ví hoặc nhận từ hoạt động.",
    },
    {
      term: "Hoa Hồng Dịch Vụ",
      definition: "Mức phí nhỏ MeoMap giữ lại khi xử lý giao dịch tiền thưởng hoặc tiền cọc (thường 5-10%).",
    },
  ],
  lost: [
    {
      term: "Mèo Đi Lạc",
      definition: "Tình trạng một con mèo/chó mất tích từ nhà. Chủ có thể đăng bài trên MeoMap để tìm kiếm và treo thưởng.",
    },
    {
      term: "Treo Thưởng",
      definition: "Khoản tiền chủ mèo/chó hứa sẽ trả cho người tìm thấy. Giúp khuyến khích cộng đồng chủ động tìm kiếm.",
    },
    {
      term: "Báo Tin / Sighting",
      definition: "Thông tin từ người dân báo rằng họ đã thấy hoặc biết mèo/chó mất tích ở đâu. Chủ sẽ nhận thông báo và có thể liên hệ.",
    },
    {
      term: "Xác Nhận Thành Công",
      definition: "Quá trình chủ xác nhận rằng mèo/chó được báo tin là chính xác. Người báo tin sẽ nhận tiền thưởng.",
    },
    {
      term: "Địa Điểm Báo Tin",
      definition: "Vị trí địa lý mà người dân báo rằng họ thấy mèo/chó mất tích. Được hiển thị trên bản đồ.",
    },
  ],
  rescue: [
    {
      term: "Cứu Hộ",
      definition: "Hoạt động giúp đỡ một con mèo/chó đang trong tình trạng nguy hiểm, bệnh hoạn hoặc cần xử lý khẩn cấp.",
    },
    {
      term: "Ca Cứu Hộ",
      definition: "Một bài đăng cứu hộ cụ thể trên MeoMap, bao gồm thông tin thú cưng, tình trạng, và yêu cầu hỗ trợ.",
    },
    {
      term: "Người Cứu Hộ",
      definition: "Người tình nguyện hoặc chuyên nghiệp tham gia giúp đỡ thú cưng trong ca cứu hộ.",
    },
    {
      term: "Chi Phí Cứu Hộ",
      definition: "Các khoản chi phí phát sinh trong quá trình cứu hộ, bao gồm y tế, thức ăn, vận chuyển, ở lại, v.v.",
    },
    {
      term: "Quyên Góp Cứu Hộ",
      definition: "Hoạt động mọi người quyên góp tiền để hỗ trợ chi phí cứu hộ. Tất cả tiền sẽ đi vào điều trị thú cưng.",
    },
    {
      term: "Đóng Ca",
      definition: "Kết thúc một ca cứu hộ khi thú cưng đã được xử lý (khỏi bệnh, tìm được chủ, hoặc các tình huống khác).",
    },
  ],
  community: [
    {
      term: "Hồ Sơ Người Dùng",
      definition: "Thông tin cá nhân của bạn trên MeoMap bao gồm tên, ảnh đại diện, liên hệ, và lịch sử hoạt động.",
    },
    {
      term: "Uy Tín / Reputation",
      definition: "Điểm uy tín dựa trên hoạt động tích cực (nhận nuôi thành công, báo tin chính xác, quyên góp, v.v.). Uy tín cao → mọi người tin tưởng bạn hơn.",
    },
    {
      term: "Xác Minh Danh Tính",
      definition: "Quá trình kiểm chứng rằng bạn là người thực, không phải bot hoặc tài khoản giả. Giúp tăng độ tin cậy.",
    },
    {
      term: "Báo Cáo / Report",
      definition: "Thực hiện báo cáo một bài đăng hoặc người dùng có hành vi không phù hợp để quản trị viên xem xét.",
    },
    {
      term: "Chặn / Block",
      definition: "Hành động chặn một người dùng để họ không thể liên hệ hoặc tương tác với bạn.",
    },
    {
      term: "Lịch Sử Hoạt Động",
      definition: "Ghi chép lại tất cả các hành động bạn thực hiện trên MeoMap (nhận nuôi, báo tin, quyên góp, v.v.).",
    },
  ],
};

export default function Glossary() {
  const [activeCategory, setActiveCategory] = useState("adoption");
  const [expandedTerms, setExpandedTerms] = useState({});

  const toggleTerm = (termIndex) => {
    const key = `${activeCategory}-${termIndex}`;
    setExpandedTerms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const categoryLabels = {
    adoption: "📋 Nhận Nuôi",
    financial: "💰 Tài Chính & Ví",
    lost: "🔍 Mèo Đi Lạc",
    rescue: "🆘 Cứu Hộ",
    community: "👥 Cộng Đồng",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">📚 Từ Điển MeoMap</h1>
          <p className="text-blue-100">
            Tìm hiểu các thuật ngữ và khái niệm trong MeoMap
          </p>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Category Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setActiveCategory(key);
                setExpandedTerms({});
              }}
              className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                activeCategory === key
                  ? "bg-blue-500 text-white shadow-lg"
                  : "bg-white text-gray-700 border border-gray-300 hover:border-blue-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Terms List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 space-y-3">
            {glossaryTerms[activeCategory]?.map((item, index) => {
              const isExpanded = expandedTerms[`${activeCategory}-${index}`];
              return (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleTerm(index)}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 font-semibold text-gray-900 flex items-center justify-between transition-colors"
                  >
                    <span>{item.term}</span>
                    <span
                      className={`transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 py-3 bg-white text-gray-700 text-sm leading-relaxed border-t border-gray-200">
                      {item.definition}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
          <h3 className="font-bold text-blue-900 mb-2">💡 Mẹo</h3>
          <p className="text-sm text-blue-800">
            Nhấp vào bất kỳ thuật ngữ nào để xem định nghĩa đầy đủ. Bạn cũng có thể xem thêm tại{" "}
            <a
              href="/how-it-works"
              className="text-blue-600 hover:underline font-semibold"
            >
              Cách sử dụng
            </a>{" "}
            hoặc{" "}
            <a
              href="/faq"
              className="text-blue-600 hover:underline font-semibold"
            >
              Câu hỏi thường gặp
            </a>
            .
          </p>
        </div>

        {/* Footer */}
        <div className="text-center py-6 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            Không tìm thấy thuật ngữ bạn cần?{" "}
            <a
              href="mailto:support@meomap.com"
              className="text-blue-600 hover:underline font-semibold"
            >
              Liên hệ với chúng tôi
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
