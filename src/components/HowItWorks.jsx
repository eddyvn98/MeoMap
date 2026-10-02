export default function HowItWorks() {
  const flows = [
    ["🏡 Nhận nuôi", "Đăng case → liên hệ trực tiếp → đóng case khi đã tìm được người nhận."],
    ["🔍 Đi lạc", "Đăng case → cộng đồng liên hệ trực tiếp khi có thông tin → đóng case khi đã tìm thấy."],
    ["🚑 Cứu hộ", "Người cứu nhận ca → tự cập nhật và kêu gọi hỗ trợ → đóng ca khi hoàn thành."],
  ];
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-5">
      <h1 className="text-2xl font-bold">MeoMap hoạt động thế nào?</h1>
      <p className="text-gray-600">MeoMap là nền tảng đăng case và kết nối cộng đồng, không phải trung gian thanh toán.</p>
      {flows.map(([title,desc])=>(
        <section key={title} className="border rounded-lg p-4 bg-white">
          <h2 className="font-bold text-lg">{title}</h2>
          <p className="mt-2 text-sm text-gray-700">{desc}</p>
        </section>
      ))}
      <section className="border rounded-lg p-4 bg-blue-50">
        <h2 className="font-bold text-blue-900">Nguyên tắc tiền bạc</h2>
        <p className="mt-2 text-sm text-blue-800">MeoMap không thu cọc, giữ thưởng, nhận quyên góp, tạo ví hay giải ngân. Với cứu hộ, người cứu có thể công khai thông tin nhận hỗ trợ của chính họ và người ủng hộ chuyển trực tiếp.</p>
      </section>
    </div>
  );
}
