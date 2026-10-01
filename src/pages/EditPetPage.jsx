import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import EditPetPageView from './views/EditPetPageView';

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

  return <EditPetPageView scope={{
    navigate,
    id,
    user,
    setUser,
    pet,
    setPet,
    loading,
    setLoading,
    submitting,
    setSubmitting,
    error,
    setError,
    name,
    setName,
    description,
    setDescription,
    category,
    setCategory,
    status,
    setStatus,
    file,
    setFile,
    existingImageUrl,
    setExistingImageUrl,
    suggestedDeposit,
    setSuggestedDeposit,
    requiredDeposit,
    setRequiredDeposit,
    allowCustomDeposit,
    setAllowCustomDeposit,
    bountyAmount,
    setBountyAmount,
    handleSubmit,
    handleDelete,
  }} />;
}
