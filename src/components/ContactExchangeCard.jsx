import React from "react";

/*
  ContactExchangeCard
  - Shows reciprocal contact info after a report is submitted
  - Props:
    reporter: { name, phone, note }
    owner: { name, phone, note }
    infoNote?: string
*/
export default function ContactExchangeCard({ reporter, owner, infoNote }) {
  console.log(reporter);
  
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#f9fafb" }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Thông tin liên hệ hai bên</h3>
      {infoNote && <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>{infoNote}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Người đăng (chủ mèo)</div>
          <div style={{ fontWeight: 600 }}>{owner?.name || "—"}</div>
          <div style={{ fontSize: 13 }}>{owner?.phone || "—"}</div>
          {owner?.note && <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>{owner.note}</div>}
        </div>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Người tìm thấy</div>
          <div style={{ fontWeight: 600 }}>{reporter?.name || "—"}</div>
          <div style={{ fontSize: 13 }}>{reporter?.phone || "—"}</div>
          {reporter?.note && <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>{reporter.note}</div>}
        </div>
      </div>
    </div>
  );
}
