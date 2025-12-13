import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import PetMap from "../components/PetMap";

console.log("ReportPage module loaded, supabase:", supabase ? "✅ OK" : "❌ undefined");

export default function ReportPage() {
  const navigate = useNavigate();

  const [position, setPosition] = useState(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Lost");
  const [category, setCategory] = useState("lost"); // adopt, lost, rescue
  const [district, setDistrict] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  
  // Deposit/Bounty fields (new)
  const [requiredDeposit, setRequiredDeposit] = useState("");
  const [allowCustomDeposit, setAllowCustomDeposit] = useState(true);
  const [bountyAmount, setBountyAmount] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  console.log("ReportPage component rendered");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nhập Tiêu đề bài viết.");
      return;
    }
    if (!position) {
      setError("Chọn vị trí trên bản đồ (chạm vào map).");
      return;
    }

    setSubmitting(true);

    let imageUrl = null;

    try {
      // 1) Check wallet balance if bounty is set
      const bountyValue = (category === "lost" || category === "rescue") && bountyAmount ? parseInt(bountyAmount) : 0;
      
      if (bountyValue > 0) {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setError("Bạn phải đăng nhập để treo thưởng.");
          setSubmitting(false);
          return;
        }

        // Get wallet balance
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("balance_thuong")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          setError("Không thể kiểm tra số dư ví.");
          setSubmitting(false);
          return;
        }

        if (profile.balance_thuong < bountyValue) {
          setError(`Số dư ví không đủ. Bạn có ${profile.balance_thuong.toLocaleString()}đ, cần ${bountyValue.toLocaleString()}đ.`);
          setSubmitting(false);
          return;
        }
      }

      // 2) Upload ảnh nếu có
      if (file) {
        const ext = file.name.split(".").pop();
        const filePath = `pets/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("pet-images")
          .upload(filePath, file);

        if (uploadError) {
          console.error(uploadError);
          setError("Upload ảnh lỗi.");
          setSubmitting(false);
          return;
        }

        const { data: publicData } = supabase.storage
          .from("pet-images")
          .getPublicUrl(filePath);

        imageUrl = publicData?.publicUrl || null;
      }

      // 3) Deduct bounty_amount from wallet if set
      if (bountyValue > 0) {
        const { data: result, error: deductError } = await supabase.rpc("decrease_balance_thuong", {
          p_user_id: (await supabase.auth.getUser()).data.user.id,
          p_amount: bountyValue,
          p_description: `Khóa tiền treo thưởng khi tạo bài "${name}"`,
        });

        if (deductError || !result?.success) {
          console.error("Deduct bounty error:", deductError || result);
          setError("Khóa tiền treo thưởng thất bại: " + (result?.message || deductError?.message || "Lỗi không xác định"));
          setSubmitting(false);
          return;
        }
      }

      // 4) Ghi bản ghi vào bảng pets (insert trả về row mới bằng .select())
      const petData = {
        name,
        status,
        category, // adopt, lost, rescue
        district,
        description,
        lat: position.lat,
        lng: position.lng,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        
        // Add deposit/bounty fields based on category
        required_deposit: category === "adopt" && requiredDeposit ? parseInt(requiredDeposit) : null,
        allow_custom_deposit: category === "adopt" ? allowCustomDeposit : true,
        bounty_amount: bountyValue > 0 ? bountyValue : null,
      };

      console.log("Attempting to insert pet:", petData);

      const { data: insertedData, error: insertError } = await supabase
        .from("pets")
        .insert([petData])
        .select();

      console.log("Insert response - data:", insertedData, "error:", insertError);

      if (insertError) {
        console.error("Insert pet error (full):", {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        });
        setError(
          "Lưu thú cưng bị lỗi: " +
            (insertError.details || insertError.message || insertError)
        );
        setSubmitting(false);
        return;
      }

      console.log("Inserted pet successfully:", insertedData);
      alert("Đã báo mèo thành công.");
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Có lỗi bất ngờ.");
    } finally {
      setSubmitting(false);
    }
  };

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
