import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import PetMap from "../components/PetMap";

export default function ReportPageView({ scope }) {
  const {
    navigate,
    position,
    setPosition,
    name,
    setName,
    status,
    setStatus,
    category,
    setCategory,
    district,
    setDistrict,
    description,
    setDescription,
    file,
    setFile,
    requiredDeposit,
    setRequiredDeposit,
    allowCustomDeposit,
    setAllowCustomDeposit,
    bountyAmount,
    setBountyAmount,
    submitting,
    setSubmitting,
    error,
    setError,
    handleSubmit,
  } = scope;

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: 20 }}>
        <h2>Báo mèo / chó thất lạc</h2>

        <PetMap
          pets={[]}
          fullscreen={true}
          reportMode={true}
          onSelectPosition={setPosition}
        />

        <p style={{ marginTop: 8, fontSize: 12 }}>
          Chạm vào bản đồ để chọn vị trí thú cưng được thấy lần cuối.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 10 }}>
            <label>Tiêu đề bài viết</label>
            <input
              style={{ width: "100%", padding: 8 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Nhóm bài</label>
            <select
              style={{ width: "100%", padding: 8 }}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="lost">🔍 Đi lạc (Lost)</option>
              <option value="adopt">🏡 Nhận nuôi (Adoption)</option>
              <option value="rescue">🚑 Cứu hộ (Rescue)</option>
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Trạng thái</label>
            <select
              style={{ width: "100%", padding: 8 }}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="available">Có sẵn</option>
              <option value="pending">Chờ xử lý</option>
              <option value="in_contact">Đang liên lạc</option>
            </select>
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Quận / Khu vực</label>
            <input
              style={{ width: "100%", padding: 8 }}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="VD: Bình Thạnh"
            />
          </div>

          {/* ADOPTION: Deposit fields */}
          {category === "adopt" && (
            <>
              <div style={{ marginBottom: 10, padding: 12, background: "#fff7ed", border: "2px solid #fb923c", borderRadius: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: "#c2410c" }}>
                  💰 Thiết lập cọc (Rất được khuyến khích!)
                </div>
                <div style={{ fontSize: 12, color: "#c2410c", marginBottom: 8, fontWeight: 500 }}>
                  Cọc giúp chắc chắn người nhận nuôi thật sự nghiêm túc & hạn chế giao dịch trá hình
                </div>
                
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 13 }}>Mức cọc tối thiểu (đ)</label>
                  <input
                    type="number"
                    style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 4 }}
                    value={requiredDeposit}
                    onChange={(e) => setRequiredDeposit(e.target.value)}
                    placeholder="VD: 50000 (để trống nếu không yêu cầu cọc)"
                    min="0"
                  />
                  <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                    💡 Gợi ý: Cọc 50k-200k rất tốt để kiểm soát chất lượng người nhận
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    id="allowCustomDeposit"
                    checked={allowCustomDeposit}
                    onChange={(e) => setAllowCustomDeposit(e.target.checked)}
                  />
                  <label htmlFor="allowCustomDeposit" style={{ fontSize: 13, cursor: "pointer" }}>
                    Cho phép người nhận nhập mức cọc khác
                  </label>
                </div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 4, marginLeft: 28 }}>
                  Nếu tắt, người nhận chỉ có thể đặt cọc đúng số tiền bạn yêu cầu
                </div>
              </div>
            </>
          )}

          {/* LOST/RESCUE: Bounty fields */}
          {(category === "lost" || category === "rescue") && (
            <div style={{ marginBottom: 10, padding: 12, background: "#fef3c7", border: "2px solid #fcd34d", borderRadius: 6 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, color: "#b45309" }}>
                {category === "lost" ? "🎁 Treo thưởng tìm kiếm (Khuyến khích!)" : "🔥 Hỗ trợ cứu hộ (Quan trọng!)"}
              </div>
              <div style={{ fontSize: 12, color: "#b45309", marginBottom: 8, fontWeight: 500 }}>
                {category === "lost" 
                  ? "Tiền thưởng sẽ khuyến khích mọi người chủ động tìm kiếm thú cưng của bạn"
                  : "Tiền hỗ trợ giúp tăng động lực cho người cứu hộ khi thú cưng gặp nguy cấp"}
              </div>
              
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 13 }}>
                  {category === "lost" ? "Tiền thưởng cho người tìm thấy (đ)" : "Số tiền hỗ trợ cứu hộ (đ)"}
                </label>
                <input
                  type="number"
                  style={{ width: "100%", padding: 8, border: "1px solid #d1d5db", borderRadius: 4 }}
                  value={bountyAmount}
                  onChange={(e) => setBountyAmount(e.target.value)}
                  placeholder={category === "lost" ? "VD: 1000000" : "VD: 500000"}
                  min="0"
                />
                <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                  💡 {category === "lost" 
                    ? "Gợi ý: 100k-1M phù hợp để tìm mèo" 
                    : "Gợi ý: 200k-1M phù hợp để hỗ trợ cứu hộ"}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label>Mô tả ngắn</label>
            <textarea
              style={{ width: "100%", padding: 8 }}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Đặc điểm nhận dạng, thời điểm, thông tin liên hệ..."
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>Ảnh thú cưng (tuỳ chọn)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>

          {error && (
            <div style={{ color: "red", marginBottom: 10 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: 12,
              background: "#ff7f32",
              border: "none",
              color: "#fff",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            {submitting ? "Đang gửi..." : "Gửi báo cáo"}
          </button>
        </form>
      </div>
    </div>
  );
}
