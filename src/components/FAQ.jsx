import { useState } from "react";

export default function FAQ() {
  const groups = {
    general: {
      title: "Tổng quan",
      items: [
        ["MeoMap dùng để làm gì?", "Đăng và tìm các case nhận nuôi, đi lạc và cứu hộ trên bản đồ."],
        ["MeoMap có giữ tiền không?", "Không. MeoMap không có ví, cọc, voucher, cửa hàng, thưởng hay chức năng giải ngân."],
      ],
    },
    adopt: {
      title: "Nhận nuôi",
      items: [
        ["Làm sao nhận nuôi?", "Mở case và liên hệ trực tiếp người đăng."],
        ["Có cần đặt cọc qua MeoMap không?", "Không. MeoMap không thu hoặc giữ tiền cọc."],
      ],
    },
    lost: {
      title: "Đi lạc",
      items: [
        ["Tôi thấy thú cưng đi lạc thì làm gì?", "Dùng thông tin trên case để liên hệ trực tiếp người đăng."],
        ["Có thưởng qua hệ thống không?", "Không. MeoMap không giữ hoặc trả tiền thưởng."],
      ],
    },
    rescue: {
      title: "Cứu hộ",
      items: [
        ["Ai có thể nhận ca cứu hộ?", "Người dùng đã đăng nhập có thể nhận ca chưa có người cứu."],
        ["Quyên góp hoạt động thế nào?", "Người cứu tự đăng thông tin nhận hỗ trợ của mình; người ủng hộ chuyển trực tiếp ngoài hệ thống."],
      ],
    },
  };
  const [active, setActive] = useState("general");
  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Câu hỏi thường gặp</h1>
      <div className="flex gap-2 flex-wrap mb-4">
        {Object.entries(groups).map(([id,g])=><button key={id} onClick={()=>setActive(id)} className={`px-3 py-2 rounded ${active===id?"bg-blue-600 text-white":"bg-gray-100"}`}>{g.title}</button>)}
      </div>
      <div className="space-y-3">
        {groups[active].items.map(([q,a])=><details key={q} className="border rounded p-3 bg-white"><summary className="font-semibold cursor-pointer">{q}</summary><p className="mt-2 text-sm text-gray-700">{a}</p></details>)}
      </div>
    </div>
  );
}
