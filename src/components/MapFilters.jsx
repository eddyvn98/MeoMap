import { useState } from "react";

function MapFilters({ filters, setFilters }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1200,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 8px 30px rgba(0,0,0,0.16)",
        maxHeight: expanded ? 520 : 56,
        overflow: "hidden",
        transition: "max-height 0.3s ease, box-shadow 0.2s ease",
        width: 320,
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          borderBottom: expanded ? "1px solid #e5e7eb" : "none",
          background: "#f9fafb",
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 13 }}>🔍 Tìm kiếm</span>
        <span style={{ fontSize: 16 }}>{expanded ? "▼" : "▶"}</span>
      </div>

      {expanded && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, maxHeight: 440, overflowY: "auto" }}>
          {/* Tìm kiếm theo tên */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Tìm theo tên</label>
            <input
              type="text"
              placeholder="Nhập Tiêu đề bài viết..."
              value={filters.searchName || ""}
              onChange={(e) => setFilters((f) => ({ ...f, searchName: e.target.value }))}
              style={{
                width: "100%",
                padding: "6px 10px",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 12,
                outline: "none",
              }}
            />
          </div>

          {/* Nhóm bài */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Nhóm bài</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              style={{
                width: "100%",
                padding: 6,
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <option value="all">Tất cả</option>
              <option value="lost">🔍 Đi lạc – liên hệ trực tiếp</option>
              <option value="adopt">🤝 Nhận nuôi – liên hệ trực tiếp</option>
              <option value="rescue">🚑 Cứu hộ – nhận ca & kêu gọi trực tiếp</option>
            </select>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              Adopt/Lost: đăng và đóng case · Rescue: người cứu nhận ca và tự kêu gọi quyên góp
            </div>
          </div>

          {/* Loại */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Loại</label>
            <select
              value={filters.animal || "all"}
              onChange={(e) => setFilters((f) => ({ ...f, animal: e.target.value }))}
              style={{
                width: "100%",
                padding: 6,
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <option value="all">Tất cả</option>
              <option value="cat">Mèo</option>
              <option value="dog">Chó</option>
            </select>
          </div>

          {/* Khu vực */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Quận / Huyện</label>
            <select
              value={filters.ward || "all"}
              onChange={(e) => setFilters((f) => ({ ...f, ward: e.target.value }))}
              style={{
                width: "100%",
                padding: 6,
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <option value="all">Tất cả</option>
              <option value="q1">Quận 1</option>
              <option value="q2">Quận 2</option>
              <option value="q3">Quận 3</option>
              <option value="q4">Quận 4</option>
              <option value="q5">Quận 5</option>
              <option value="q6">Quận 6</option>
              <option value="q7">Quận 7</option>
              <option value="q8">Quận 8</option>
              <option value="q9">Quận 9</option>
              <option value="q10">Quận 10</option>
              <option value="q11">Quận 11</option>
              <option value="q12">Quận 12</option>
              <option value="qbn">Bình Chánh</option>
              <option value="qbt">Quận Bình Tân</option>
              <option value="qbth">Quận Bình Thạnh</option>
              <option value="qgg">Quận Gò Vấp</option>
              <option value="qtb">Quận Tân Bình</option>
              <option value="qtp">Quận Tân Phú</option>
              <option value="qth">Thủ Đức</option>
            </select>
          </div>

          <button
            onClick={() => setExpanded(false)}
            style={{
              padding: 8,
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            Đóng bộ lọc
          </button>
        </div>
      )}
    </div>
  );
}

export default MapFilters;
