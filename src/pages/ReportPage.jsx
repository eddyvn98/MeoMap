import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import PetMap from "../components/PetMap";
import ReportPageView from './views/ReportPageView';

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

  return <ReportPageView scope={{
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
  }} />;
}
