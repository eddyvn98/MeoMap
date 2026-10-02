import React, { useState } from "react";

export default function QuickGuideModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState(0);
  const guides = [
    {
      title: "Tổng quan",
      icon: "🧭",
      content: [
        "Nhận nuôi: đăng case → liên hệ trực tiếp → chủ bài đóng case.",
        "Đi lạc: đăng case → ai có thông tin liên hệ trực tiếp → chủ bài đóng case.",
        "Cứu hộ: người cứu nhận ca → cập nhật tình hình → tự đăng lời kêu gọi hỗ trợ → đóng ca.",
        "MeoMap không thu cọc, giữ thưởng, nhận quyên góp hay quản lý tiền người dùng.",
      ],
    },
    {
      title: "Nhận nuôi",
      icon: "🏡",
      content: [
        "Người đăng tạo case và để thông tin liên hệ.",
        "Người quan tâm liên hệ trực tiếp để trao đổi việc nhận nuôi.",
        "Khi đã tìm được người nhận, chủ bài đóng case.",
      ],
    },
    {
      title: "Đi lạc",
      icon: "🔍",
      content: [
        "Người đăng tạo case với ảnh, mô tả và khu vực.",
        "Người có thông tin liên hệ trực tiếp với chủ bài.",
        "Khi đã tìm thấy hoặc không còn cần tìm, chủ bài đóng case.",
      ],
    },
    {
      title: "Cứu hộ",
      icon: "🚑",
      content: [
        "Người dùng có thể nhận một ca cứu hộ chưa có người nhận.",
        "Người cứu tự đăng cập nhật và lời kêu gọi hỗ trợ.",
        "Thông tin tài khoản nhận hỗ trợ là của chính người cứu.",
        "Tiền chuyển trực tiếp giữa người ủng hộ và người cứu, ngoài MeoMap.",
      ],
    },
  ];

  if (!isOpen) return null;
  const guide = guides[activeTab];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:119999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }} onClick={onClose}>
      <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:560, maxHeight:"85vh", overflow:"auto", boxShadow:"0 25px 50px rgba(0,0,0,.35)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:16, background:"#4f46e5", color:"#fff", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h2 style={{ margin:0, fontSize:18 }}>❓ Hướng dẫn nhanh MeoMap</h2>
          <button onClick={onClose} style={{ border:0, background:"transparent", color:"#fff", fontSize:24, cursor:"pointer" }}>×</button>
        </div>
        <div style={{ display:"flex", gap:8, padding:12, overflowX:"auto", borderBottom:"1px solid #eee" }}>
          {guides.map((g,i)=><button key={g.title} onClick={()=>setActiveTab(i)} style={{ border:0, borderRadius:999, padding:"8px 12px", whiteSpace:"nowrap", cursor:"pointer", background:i===activeTab?"#e0e7ff":"#f3f4f6", color:i===activeTab?"#3730a3":"#374151" }}>{g.icon} {g.title}</button>)}
        </div>
        <div style={{ padding:20 }}>
          <h3 style={{ marginTop:0 }}>{guide.icon} {guide.title}</h3>
          <ul style={{ paddingLeft:20, lineHeight:1.7 }}>{guide.content.map(item=><li key={item}>{item}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
