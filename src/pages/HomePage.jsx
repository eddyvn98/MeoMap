import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import BottomNav from "../components/BottomNav";

export default function HomePage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    category: "all",
    color: "all",
    animal: "all",
    ward: "all",
  });

  const handleSearch = () => {
    navigate("/map", { state: { filters } });
  };

  return (
    <div style={{ paddingBottom: 80 }}>
      <Header />

      <div style={{ padding: 20 }}>
        <h1 style={{ marginBottom: 20 }}>Tìm kiếm bé yêu của bạn</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Nhóm bài */}
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>
              Nhóm bài
            </label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              <option value="all">Tất cả</option>
              <option value="adopt">Nhận nuôi</option>
              <option value="lost">Đi lạc</option>
              <option value="rescue">Cứu hộ (mèo gặp nạn)</option>
            </select>
          </div>

          {/* Màu lông */}
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>
              Màu lông
            </label>
            <select
              value={filters.color}
              onChange={(e) => setFilters({ ...filters, color: e.target.value })}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              <option value="all">Tất cả</option>
              <option value="white">Trắng</option>
              <option value="black">Đen</option>
              <option value="orange">Vàng / Mèo mướp vàng</option>
              <option value="gray">Xám</option>
              <option value="mixed">Nhiều màu</option>
            </select>
          </div>

          {/* Loại */}
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>
              Loại thú cưng
            </label>
            <select
              value={filters.animal}
              onChange={(e) => setFilters({ ...filters, animal: e.target.value })}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              <option value="all">Tất cả</option>
              <option value="cat">Mèo</option>
              <option value="dog">Chó</option>
            </select>
          </div>

          {/* Khu vực */}
          <div>
            <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>
              Quận / Huyện
            </label>
            <select
              value={filters.ward}
              onChange={(e) => setFilters({ ...filters, ward: e.target.value })}
              style={{
                width: "100%",
                padding: 10,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                fontSize: 14,
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

          {/* Nút tìm kiếm */}
          <button
            onClick={handleSearch}
            style={{
              padding: 12,
              background: "#ff7f32",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 12,
            }}
          >
            Tìm kiếm trên bản đồ
          </button>

          {/* Nút báo mèo */}
          <button
            onClick={() => navigate("/report")}
            style={{
              padding: 12,
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Báo mèo thất lạc / cần giúp
          </button>
        </div>

        <div style={{ marginTop: 32, padding: 16, background: "#f0f9ff", borderRadius: 8 }}>
          <h3 style={{ marginBottom: 8 }}>ℹ️ Hướng dẫn sử dụng</h3>
          <ul style={{ fontSize: 14, lineHeight: 1.6, color: "#555" }}>
            <li>Chọn các tiêu chí lọc để tìm bé yêu của bạn</li>
            <li>Bấm "Tìm kiếm trên bản đồ" để xem vị trí các bé trên bản đồ</li>
            <li>Click vào marker hoặc thẻ thú cưng để xem chi tiết và liên hệ</li>
            <li>Nếu tìm được bé của mình, hãy báo cáo để cập nhật tình trạng</li>
          </ul>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
