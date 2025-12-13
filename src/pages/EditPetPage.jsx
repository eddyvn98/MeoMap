import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function EditPetPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("adopt");
  const [status, setStatus] = useState("available");
  const [file, setFile] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState("");

  // Optional deposit amount (owner can set suggested deposit)
  const [suggestedDeposit, setSuggestedDeposit] = useState("");
  
  // New deposit/bounty fields
  const [requiredDeposit, setRequiredDeposit] = useState("");
  const [allowCustomDeposit, setAllowCustomDeposit] = useState(true);
  const [bountyAmount, setBountyAmount] = useState("");

  useEffect(() => {
    const loadUserAndPet = async () => {
      // 1. Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        navigate("/login");
        return;
      }
      setUser(userData.user);

      // 2. Load pet
      const { data: petData, error: petError } = await supabase
        .from("pets")
        .select("*")
        .eq("id", id)
        .single();

      if (petError || !petData) {
        setError("Không tìm thấy bài đăng.");
        setLoading(false);
        return;
      }

      // 3. Check ownership
      if (petData.owner_id !== userData.user.id) {
        setError("Bạn không phải chủ bài đăng này.");
        setLoading(false);
        return;
      }

      setPet(petData);
      setName(petData.name || "");
      setDescription(petData.description || "");
      setCategory(petData.category || "adopt");
      setStatus(petData.status || "available");
      setExistingImageUrl(petData.image_url || "");
      setSuggestedDeposit(petData.max_deposit ? String(petData.max_deposit) : "");
      
      // Load new deposit/bounty fields
      setRequiredDeposit(petData.required_deposit ? String(petData.required_deposit) : "");
      setAllowCustomDeposit(petData.allow_custom_deposit !== false);
      setBountyAmount(petData.bounty_amount ? String(petData.bounty_amount) : "");

      setLoading(false);
    };

    loadUserAndPet();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Tiêu đề bài viết không được để trống.");
      return;
    }

    setSubmitting(true);

    try {
      // 1) Check if bounty_amount increased and lock the difference
      const currentBounty = pet.bounty_amount || 0;
      const newBounty = bountyAmount ? Number(bountyAmount) : 0;
      const bountyIncrease = newBounty - currentBounty;

      if (bountyIncrease > 0) {
        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          setError("Bạn phải đăng nhập để tăng tiền treo thưởng.");
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

        if (profile.balance_thuong < bountyIncrease) {
          setError(`Số dư ví không đủ. Bạn có ${profile.balance_thuong.toLocaleString()}đ, cần thêm ${bountyIncrease.toLocaleString()}đ.`);
          setSubmitting(false);
          return;
        }

        // Deduct the increase from wallet
        const { data: result, error: deductError } = await supabase.rpc("decrease_balance_thuong", {
          p_user_id: user.id,
          p_amount: bountyIncrease,
          p_description: `Tăng tiền treo thưởng cho bài "${name}"`,
        });

        if (deductError || !result?.success) {
          console.error("Deduct bounty increase error:", deductError || result);
          setError("Khóa tiền treo thưởng thất bại: " + (result?.message || deductError?.message || "Lỗi không xác định"));
          setSubmitting(false);
          return;
        }
      }

      let imageUrl = existingImageUrl;

      // 2) Upload new image if selected
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

        imageUrl = publicData?.publicUrl || existingImageUrl;
      }

      // 3) Update pet
      const updateData = {
        name,
        description,
        category,
        status,
        image_url: imageUrl,
        max_deposit: suggestedDeposit ? Number(suggestedDeposit) : null,
        required_deposit: requiredDeposit ? Number(requiredDeposit) : null,
        allow_custom_deposit: allowCustomDeposit,
        bounty_amount: newBounty > 0 ? newBounty : null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("pets")
        .update(updateData)
        .eq("id", id);

      if (updateError) {
        console.error("Update error:", updateError);
        setError("Cập nhật bài đăng lỗi: " + updateError.message);
        setSubmitting(false);
        return;
      }

      alert("Đã cập nhật bài đăng thành công!");
      navigate("/account");
    } catch (err) {
      console.error(err);
      setError("Có lỗi bất ngờ.");
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn XÓA bài đăng này? Hành động không thể hoàn tác.")) {
      return;
    }

    setSubmitting(true);

    try {
      const { error: deleteError } = await supabase
        .from("pets")
        .delete()
        .eq("id", id);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        setError("Xóa bài đăng lỗi: " + deleteError.message);
        setSubmitting(false);
        return;
      }

      alert("Đã xóa bài đăng.");
      navigate("/account");
    } catch (err) {
      console.error(err);
      setError("Có lỗi bất ngờ.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-sm">
        Đang tải bài đăng...
      </div>
    );
  }

  if (error && !pet) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="text-red-600 text-sm mb-4">{error}</div>
        <button
          className="px-4 py-2 border rounded text-sm"
          onClick={() => navigate("/account")}
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <header className="flex items-center justify-between border-b pb-2 mb-4">
        <h1 className="font-bold text-lg">Chỉnh sửa bài đăng</h1>
        <button
          className="text-sm px-3 py-1 border rounded"
          onClick={() => navigate("/account")}
        >
          Quay lại
        </button>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        {/* Pet Name */}
        <div>
          <label className="block font-semibold mb-1">Tiêu đề bài viết *</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Mèo cam mập mờm"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block font-semibold mb-1">Loại bài đăng</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="adopt">Nhận nuôi</option>
            <option value="lost">Đi lạc</option>
            <option value="rescue">Cứu hộ</option>
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block font-semibold mb-1">Trạng thái</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="available">available</option>
            <option value="reserved">reserved</option>
            <option value="delivered">delivered</option>
          </select>
          <p className="text-xs text-gray-600 mt-1">
            (Chỉ admin/hệ thống tự động thay đổi. Để mặc định "available" nếu không chắc.)
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block font-semibold mb-1">Mô tả</label>
          <textarea
            className="w-full border rounded px-3 py-2"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả chi tiết về thú cưng, tính cách, yêu cầu nhận nuôi..."
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block font-semibold mb-1">Ảnh thú cưng</label>
          {existingImageUrl && (
            <div className="mb-2">
              <img
                src={existingImageUrl}
                alt="Current"
                className="w-32 h-32 object-cover rounded border"
              />
              <p className="text-xs text-gray-600 mt-1">Ảnh hiện tại</p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="text-sm"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <p className="text-xs text-gray-600 mt-1">
            Chọn ảnh mới nếu muốn thay đổi. Để trống nếu giữ ảnh cũ.
          </p>
        </div>

        {/* Category-specific: Deposit for Adoption */}
        {category === "adopt" && (
          <div className="border-t pt-4 space-y-3">
            <div className="p-3 bg-orange-50 border-2 border-orange-200 rounded-lg">
              <h3 className="font-bold text-orange-900 mb-2">💰 Tiền cọc nhận nuôi</h3>
              
              <div className="mb-3">
                <label className="block font-semibold mb-1 text-sm">
                  Số tiền cọc tối thiểu (đ)
                </label>
                <input
                  type="number"
                  step="10000"
                  min="0"
                  className="w-full border rounded px-3 py-2"
                  value={requiredDeposit}
                  onChange={(e) => setRequiredDeposit(e.target.value)}
                  placeholder="Ví dụ: 50000"
                />
                <p className="text-xs text-gray-600 mt-1">
                  Số tiền cọc tối thiểu người nhận nuôi phải đặt. Để trống = không yêu cầu cọc.
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCustomDeposit}
                    onChange={(e) => setAllowCustomDeposit(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">
                    Cho phép người nhận tự điều chỉnh số tiền cọc
                  </span>
                </label>
                <p className="text-xs text-gray-600 mt-1 ml-6">
                  Nếu tắt: Người nhận phải đặt cọc ĐÚNG số tiền bạn quy định.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Category-specific: Bounty for Lost/Rescue */}
        {(category === "lost" || category === "rescue") && (
          <div className="border-t pt-4">
            <div className="p-3 bg-amber-50 border-2 border-amber-200 rounded-lg">
              <h3 className="font-bold text-amber-900 mb-2">
                {category === "lost" ? "🎁 Tiền thưởng tìm kiếm" : "🔥 Hỗ trợ cứu hộ"}
              </h3>
              
              <div>
                <label className="block font-semibold mb-1 text-sm">
                  Số tiền thưởng (đ)
                </label>
                <input
                  type="number"
                  step="10000"
                  min="0"
                  className="w-full border rounded px-3 py-2"
                  value={bountyAmount}
                  onChange={(e) => setBountyAmount(e.target.value)}
                  placeholder="Ví dụ: 1000000"
                />
                <p className="text-xs text-gray-600 mt-1">
                  {category === "lost" 
                    ? "Số tiền thưởng cho người tìm thấy và xác nhận thành công."
                    : "Số tiền hỗ trợ cho người cứu hộ khi hoàn thành ca cứu hộ."}
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-300 rounded p-2">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
          >
            {submitting ? "Đang lưu..." : "Lưu thay đổi"}
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded font-semibold disabled:opacity-50"
          >
            Xóa bài
          </button>
        </div>
      </form>
    </div>
  );
}
