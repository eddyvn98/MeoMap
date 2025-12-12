import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { QRCodeCanvas } from "qrcode.react";
import { createDepositAndTicket } from "../deposit";
import LostPetDetail from "../components/LostPetDetail";
import RescuePetDetail from "../components/RescuePetDetail";
import EditPostPanel from "../components/EditPostPanel";

// Tính mã số 6 chữ số từ pet_id
function getShortNumericCode(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0; // 32-bit int
  }
  const num = Math.abs(hash) % 1000000; // 0..999999
  return num.toString().padStart(6, "0"); // luôn 6 số
}

// Hàm tính số tiền cọc dựa trên uy tín
function calculateDepositAmount(userInput, rep) {
  const bad = rep?.bad_trades ?? 0;

  // CASE C: Blacklist - Bị hạ uy tín >= 3 lần
  if (bad >= 3) {
    return {
      blocked: true,
      amount: null,
      reason: "Tài khoản đã bị hạ uy tín 3 lần. Không thể đặt cọc."
    };
  }

  // CASE B: 1-2 lần xấu → tăng 50%
  if (bad >= 1) {
    let boosted = userInput * 1.5;
    boosted = Math.ceil(boosted / 10000) * 10000; // làm tròn 10k
    return {
      blocked: false,
      amount: boosted,
      reason: `Bạn đã bị đánh giá không tốt ${bad} lần, số tiền cọc sẽ tăng 50% và làm tròn.`
    };
  }

  // CASE A: bình thường → giữ nguyên
  return {
    blocked: false,
    amount: userInput,
    reason: null
  };
}

// Hàm chia tiền ví + chuyển khoản
function splitWalletAndCash(requiredAmount, walletCredit) {
  if (walletCredit <= 0) {
    return {
      walletUsed: 0,
      cashAmount: requiredAmount,
    };
  }

  if (walletCredit >= requiredAmount) {
    // đủ ví, không cần chuyển khoản
    return {
      walletUsed: requiredAmount,
      cashAmount: 0,
    };
  }

  // không đủ, dùng hết ví, phần còn lại chuyển khoản
  return {
    walletUsed: walletCredit,
    cashAmount: requiredAmount - walletCredit,
  };
}

export default function PetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);

  // state cho cọc + QR
  const [currentDeposit, setCurrentDeposit] = useState(null);
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [depositError, setDepositError] = useState("");
  const [maxDeposit, setMaxDeposit] = useState(null);
  const [depositAmount, setDepositAmount] = useState("");
  
  // state cho uy tín người nhận
  const [receiverReputation, setReceiverReputation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserReputation, setCurrentUserReputation] = useState(null);
  const [depositCalculation, setDepositCalculation] = useState(null);
  
  // state cho ví
  const [walletCredit, setWalletCredit] = useState(0);
  const [splitPreview, setSplitPreview] = useState(null);

  // state cho owner: danh sách người đăng ký nhận
  const [applicants, setApplicants] = useState([]);
  
  // state cho edit panel
  const [editingPost, setEditingPost] = useState(null);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [adoption, setAdoption] = useState(null); // Thông tin giao mèo đã hoàn tất
  const [ownerProfile, setOwnerProfile] = useState(null); // Thông tin liên hệ của owner

  // state cho adoption requests (flow mới)
  const [requests, setRequests] = useState([]); // Danh sách adoption requests
  const [myRequest, setMyRequest] = useState(null); // Request của user hiện tại (receiver)
  const [loadingRequests, setLoadingRequests] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // 1. Load pet info trước (critical)
        const { data, error } = await supabase
          .from("pets")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Load pet error:", error);
          setPet(null);
          setLoading(false);
          return;
        }
        
        // Đảm bảo pet.category được set chính xác
        // Nếu không có category, default là 'adopt' (vì đa số pets là adoption)
        if (!data.category) {
          data.category = 'adopt';
        }
        
        console.log("🐾 Loaded pet from DB:", {
          id: data.id,
          name: data.name,
          category: data.category,
          status: data.status
        });
        
        setPet(data || null);
        const petId = data.id;
        
        // Load owner profile để hiển thị thông tin liên hệ
        const ownerId = data.owner_id || data.user_id;
        if (ownerId) {
          // Thử load từ profiles trước
          const { data: ownerData, error: profileErr } = await supabase
            .from("profiles")
            .select("id, email, phone, display_name")
            .eq("id", ownerId)
            .maybeSingle();
          
          console.log("Owner profile loaded:", ownerData, "error:", profileErr);
          
          // Nếu profiles không có email, lấy từ auth.users
          if (ownerData && !ownerData.email) {
            const { data: authData } = await supabase.auth.admin.getUserById(ownerId).catch(() => ({ data: null }));
            if (authData?.user?.email) {
              ownerData.email = authData.user.email;
            }
          }
          
          setOwnerProfile(ownerData || null);
        }

        // 2. Load tất cả dữ liệu khác song song
        const [userResult, depositsResult, userRepResult, profileResult] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from("deposits")
            .select("amount, status")
            .eq("pet_id", petId)
            .eq("status", "locked"),
          supabase
            .from("user_reputation")
            .select("*")
            .maybeSingle(),
          supabase
            .from("profiles")
            .select("wallet_credit")
            .maybeSingle()
        ]);

        // Xử lý user
        const { data: { user } } = userResult;
        if (user) {
          setCurrentUser(user);
          
          // Load uy tín của user
          const { data: userRep } = await supabase
            .from("user_reputation")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();
          
          setCurrentUserReputation(userRep || null);

          // Load wallet credit
          const { data: profile, error: profileErr } = await supabase
            .from("profiles")
            .select("wallet_credit")
            .eq("id", user.id)
            .maybeSingle();
          
          if (profileErr) {
            console.error("Error loading profile wallet_credit:", profileErr);
          }
          
          setWalletCredit(profile?.wallet_credit || 0);

          // Load deposit hiện tại của user
          const { data: existingDeposit } = await supabase
            .from("deposits")
            .select("*")
            .eq("pet_id", petId)
            .eq("receiver_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingDeposit) {
            setCurrentDeposit(existingDeposit);

            const { data: rep } = await supabase
              .from("user_reputation")
              .select("*")
              .eq("user_id", existingDeposit.receiver_id)
              .maybeSingle();

            setReceiverReputation(rep || null);
          }
        }

        // Xử lý deposits
        const { data: depRows, error: depErr } = depositsResult;
        if (!depErr && depRows && depRows.length > 0) {
          const max = depRows.reduce((m, d) => (d.amount > m ? d.amount : m), 0);
          setMaxDeposit(max);
        } else {
          setMaxDeposit(null);
        }

        // Gợi ý số tiền cọc - use required_deposit if set and custom not allowed
        if (data.required_deposit && data.allow_custom_deposit === false) {
          // Must use exact required_deposit
          setDepositAmount(data.required_deposit);
        } else if (data.required_deposit && data.required_deposit > 0) {
          // Use required_deposit as minimum
          setDepositAmount(data.required_deposit);
        } else {
          // Old logic: suggest based on existing deposits
          const base = data.deposit_amount || 50000;
          const suggested =
            depRows && depRows.length > 0
              ? (depRows.reduce((m, d) => (d.amount > m ? d.amount : m), 0) + 10000)
              : base;
          setDepositAmount(suggested);
        }

      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // Xác định người dùng có phải owner không
  const isOwner = currentUser && pet && (pet.owner_id === currentUser.id || pet.user_id === currentUser.id);
  console.log("[PetDetailPage] isOwner calculation:", { 
    currentUserId: currentUser?.id, 
    petOwnerId: pet?.owner_id, 
    petUserId: pet?.user_id, 
    isOwner,
    petCategory: pet?.category
  });

  // Load danh sách người đăng ký nhận nếu là owner
  useEffect(() => {
    if (!isOwner || !pet) return;

    const loadApplicants = async () => {
      setLoadingApplicants(true);
      const { data, error } = await supabase
        .from("deposits")
        .select("*, profiles:profiles!deposits_receiver_id_fkey(id, display_name, email, phone, zalo)")
        .eq("pet_id", pet.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setApplicants(data);
      }
      setLoadingApplicants(false);
    };

    const loadAdoption = async () => {
      const { data, error } = await supabase
        .from("adoptions")
        .select("*")
        .eq("pet_id", pet.id)
        .maybeSingle();
      
      if (error) console.error("[loadAdoption] Error:", error);
      if (data) {
        setAdoption(data);
        // Load adopter profile separately
        if (data.adopter_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, display_name, email")
            .eq("id", data.adopter_id)
            .maybeSingle();
          if (profileData) {
            setAdoption(prev => ({ ...prev, profiles: profileData }));
          }
        }
      }
    };

    loadApplicants();
    loadAdoption();
  }, [isOwner, pet]);

  // Load adoption requests (flow mới)
  useEffect(() => {
    if (!pet) return;

    const loadRequests = async () => {
      setLoadingRequests(true);

      // Owner: Load tất cả requests cho pet này
      if (isOwner) {
        const { data } = await supabase
          .from("adoption_requests")
          .select(`
            *,
            profiles:requester_id(id, display_name, email, phone)
          `)
          .eq("pet_id", pet.id)
          .order("created_at", { ascending: false });

        console.log("[Owner] Adoption requests loaded:", data);
        setRequests(data || []);
      }

      // Receiver: Load request của user hiện tại
      if (!isOwner && currentUser) {
        const { data } = await supabase
          .from("adoption_requests")
          .select("*")
          .eq("pet_id", pet.id)
          .eq("requester_id", currentUser.id)
          .maybeSingle();

        setMyRequest(data || null);
      }

      setLoadingRequests(false);
    };

    loadRequests();
  }, [pet, isOwner, currentUser]);

  // Reload ví khi component mount
  useEffect(() => {
    if (!currentUser) return;

    const reloadWallet = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_credit")
        .eq("id", currentUser.id)
        .single();
      
      setWalletCredit(profile?.wallet_credit || 0);
    };

    reloadWallet();
  }, [currentUser]);

  // Tính toán số tiền cọc dựa trên uy tín khi depositAmount thay đổi
  useEffect(() => {
    if (depositAmount && currentUserReputation !== null) {
      const userInput = Number(depositAmount);
      if (userInput > 0) {
        const result = calculateDepositAmount(userInput, currentUserReputation);
        setDepositCalculation(result);
        
        // Tính split ví + tiền mặt nếu không bị block
        if (!result.blocked && result.amount) {
          const split = splitWalletAndCash(result.amount, walletCredit);
          setSplitPreview(split);
        } else {
          setSplitPreview(null);
        }
      } else {
        setDepositCalculation(null);
        setSplitPreview(null);
      }
    } else {
      setDepositCalculation(null);
      setSplitPreview(null);
    }
  }, [depositAmount, currentUserReputation, walletCredit]);

  // Hàm xử lý đặt cọc
  const handleDepositClick = async () => {
    if (!pet) return;
    
    // Ngăn owner đặt cọc
    if (isOwner) {
      setDepositError("Bạn là chủ bài này, không thể đặt cọc.");
      return;
    }

    setDepositError("");
    setLoadingDeposit(true);

    try {
      const petId = pet.id;

      // TÙY BẢNG CỦA BẠN:
      // nếu trong pets có cột owner_id (hoặc user_id) thì chỉnh cho đúng:
      const ownerId = pet.owner_id || pet.user_id;
      if (!ownerId) {
        throw new Error("Thiếu thông tin người đăng (owner_id) trong pet.");
      }

      // Kiểm tra user input
      const userInput = Number(depositAmount);
      
      // NEW: Use required_deposit instead of max_deposit
      const requiredDeposit = pet.required_deposit || 0;
      const allowCustom = pet.allow_custom_deposit !== false; // default true
      
      // Validate deposit amount
      if (userInput < 0) {
        throw new Error('Số tiền cọc không hợp lệ.');
      }
      
      // Check minimum deposit requirement
      if (requiredDeposit > 0 && userInput < requiredDeposit) {
        throw new Error(`Số tiền cọc tối thiểu là ${requiredDeposit.toLocaleString()}đ`);
      }
      
      // If custom deposit not allowed, must match exactly
      if (!allowCustom && userInput !== requiredDeposit) {
        throw new Error(`Chủ bài yêu cầu cọc đúng ${requiredDeposit.toLocaleString()}đ`);
      }
      
      // Nếu user nhập 0 và owner không yêu cầu -> hiển thị thông tin liên hệ
      if (userInput === 0 && requiredDeposit === 0) {
        const contactMsg = ownerProfile?.email 
          ? `Chủ bài không yêu cầu tiền cọc.\n\nThông tin liên hệ:\nEmail: ${ownerProfile.email}${ownerProfile.phone ? `\nSĐT: ${ownerProfile.phone}` : ''}` 
          : 'Chủ bài không yêu cầu tiền cọc. Vui lòng xem thông tin liên hệ bên dưới.';
        alert(contactMsg);
        return;
      }

      // Tính toán tiền cọc dựa trên uy tín
      const calculation = calculateDepositAmount(userInput, currentUserReputation);

      // Kiểm tra blacklist
      if (calculation.blocked) {
        throw new Error(calculation.reason);
      }

      const finalAmount = calculation.amount;
      
      // Tính split ví + tiền mặt
      const split = splitWalletAndCash(finalAmount, walletCredit);
      const walletUsed = split.walletUsed;
      const cashAmount = split.cashAmount;
      
      // Xác định status ban đầu
      let initialStatus = "pending";
      let paymentStatus = "pending";
      let paymentProvider = "manual";
      
      if (cashAmount === 0) {
        // Dùng toàn bộ ví -> confirmed luôn
        initialStatus = "confirmed";
        paymentStatus = "success";
        paymentProvider = "wallet";
      }

      // Tạo deposit với wallet_used và cash_amount
      const { deposit } = await createDepositAndTicket({
        petId,
        ownerId,
        amount: finalAmount,
        walletUsed,
        cashAmount,
        initialStatus,
        paymentStatus,
        paymentProvider,
      });
      
      // Nếu có dùng ví -> trừ ví
      if (walletUsed > 0) {
        // P1 FIX: Use atomic RPC to prevent double spending
        const { data: walletResult, error: walletErr } = await supabase.rpc("atomic_decrease_wallet", {
          p_user_id: currentUser.id,
          p_amount: walletUsed,
          p_reason: "Dùng ví để đặt cọc nhận mèo.",
          p_related_id: deposit.id,
          p_related_type: "deposit"
        });

        if (walletErr) {
          console.error("Lỗi atomic_decrease_wallet", walletErr);
          throw new Error("Có lỗi khi trừ tiền trong ví. Vui lòng liên hệ admin.");
        }

        if (!walletResult.success) {
          throw new Error(walletResult.error || "Không thể trừ ví.");
        }
        
        // Update local state với balance_after từ RPC (100% chính xác)
        setWalletCredit(walletResult.balance_after);
      }

      // Load lại deposit từ DB để update state
      const { data: freshDeposit } = await supabase
        .from("deposits")
        .select("*")
        .eq("id", deposit.id)
        .single();

      setCurrentDeposit(freshDeposit);

      // Load uy tín người nhận (receiver_id từ deposit mới)
      if (freshDeposit && freshDeposit.receiver_id) {
        const { data: rep } = await supabase
          .from("user_reputation")
          .select("*")
          .eq("user_id", freshDeposit.receiver_id)
          .maybeSingle();

        setReceiverReputation(rep || null);
      }
    } catch (err) {
      console.error(err);
      setDepositError(err.message || "Có lỗi khi đặt cọc.");
    } finally {
      setLoadingDeposit(false);
    }
  };

  const handleCancelDeposit = async (depositId) => {
    if (!confirm("Bạn có chắc muốn hủy giao dịch này?")) return;
    
    const { error } = await supabase
      .from("deposits")
      .update({ status: "cancelled" })
      .eq("id", depositId);

    if (error) {
      alert("Không hủy được giao dịch.");
    } else {
      setApplicants((prev) => prev.map((d) => (d.id === depositId ? { ...d, status: "cancelled" } : d)));
    }
  };

  // ============ ADOPTION REQUESTS HANDLERS (Flow mới) ============

  const handleSendContactRequest = async () => {
    if (!confirm("Bạn muốn liên hệ với chủ để nhận mèo này?")) return;
    
    try {
      const { error } = await supabase
        .from("adoption_requests")
        .insert({
          pet_id: pet.id,
          requester_id: currentUser.id,
          owner_id: pet.owner_id || pet.user_id,
          status: 'pending'
        });

      if (error) throw error;

      // Reload data từ server để đồng bộ
      const { data: refreshed } = await supabase
        .from("adoption_requests")
        .select("*")
        .eq("pet_id", pet.id)
        .eq("requester_id", currentUser.id)
        .maybeSingle();

      setMyRequest(refreshed || null);

      alert("✅ Đã gửi yêu cầu! Chờ chủ bài chấp nhận.");
    } catch (err) {
      console.error("[handleSendContactRequest] Error:", err);
      alert("Lỗi: " + err.message);
    }
  };

  const randomToken = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleReceiverConfirmMeet = async () => {
    if (!myRequest) return;

    try {
      const payload = {
        receiver_confirmed_meet: true,
        receiver_confirmed_at: new Date().toISOString()
      };

      // Nếu owner cũng confirm → sinh token tự động
      if (myRequest.owner_confirmed_meet) {
        const token = Math.random().toString(36).substring(2, 10).toUpperCase();
        payload.delivery_token = token;
        payload.status = 'ready_to_deliver';
        payload.token_generated_at = new Date().toISOString();
      }

      const { data: updated, error } = await supabase
        .from("adoption_requests")
        .update(payload)
        .eq("id", myRequest.id)
        .select()
        .single();

      if (error) throw error;

      setMyRequest(updated);
      alert(myRequest.owner_confirmed_meet ? "✅ Đã sinh mã giao mèo!" : "✅ Đã xác nhận. Chờ chủ bài xác nhận...");
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleOwnerAcceptRequest = async (requestId) => {
    if (!confirm("Chấp nhận người này?")) return;

    try {
      // Tạo mã QR token
      const deliveryToken = Math.random().toString(36).substr(2, 9).toUpperCase();

      // Accept request này và tạo mã ngay
      const { error: acceptErr } = await supabase
        .from("adoption_requests")
        .update({ 
          status: 'ready_to_deliver',
          accepted_at: new Date().toISOString(),
          delivery_token: deliveryToken,
          token_generated_at: new Date().toISOString()
        })
        .eq("id", requestId);

      if (acceptErr) throw acceptErr;

      // Reject các request khác
      await supabase
        .from("adoption_requests")
        .update({ 
          status: 'rejected', 
          rejected_at: new Date().toISOString() 
        })
        .eq("pet_id", pet.id)
        .eq("status", "pending")
        .neq("id", requestId);

      // Update pet status
      await supabase
        .from("pets")
        .update({ status: 'in_contact' })
        .eq("id", pet.id);

      alert("✅ Đã chấp nhận! Mã quét đã được tạo.");
      
      // Reload requests
      const { data } = await supabase
        .from("adoption_requests")
        .select(`
          *,
          profiles:requester_id(id, display_name, email, phone)
        `)
        .eq("pet_id", pet.id)
        .order("created_at", { ascending: false });

      setRequests(data || []);
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleOwnerConfirmMeet = async (request) => {
    try {
      const payload = {
        owner_confirmed_meet: true,
        owner_confirmed_at: new Date().toISOString()
      };

      // Nếu receiver cũng đã confirm → sinh token
      if (request.receiver_confirmed_meet) {
        const token = Math.random().toString(36).substring(2, 10).toUpperCase();
        payload.delivery_token = token;
        payload.status = 'ready_to_deliver';
        payload.token_generated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("adoption_requests")
        .update(payload)
        .eq("id", request.id);

      if (error) throw error;

      alert(request.receiver_confirmed_meet 
        ? "✅ Đã sinh mã giao mèo!" 
        : "✅ Đã xác nhận. Chờ người nhận xác nhận...");

      // Reload requests
      const { data } = await supabase
        .from("adoption_requests")
        .select(`
          *,
          profiles:requester_id(id, display_name, email, phone)
        `)
        .eq("pet_id", pet.id)
        .order("created_at", { ascending: false });

      setRequests(data || []);
    } catch (err) {
      alert("Lỗi: " + err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: 20 }}>Đang tải...</div>;
  }

  if (!pet) {
    return (
      <div style={{ padding: 20 }}>
        Không tìm thấy thông tin mèo.
        <br />
        <button onClick={() => navigate("/")}>Về trang chủ</button>
      </div>
    );
  }

  // Handlers cho Lost Pet
  const handleLostPetMarkAsFound = async () => {
    if (!confirm("Bạn có chắc muốn đánh dấu bài này là 'Đã tìm thấy'?")) return;

    try {
      const { error } = await supabase
        .from("pets")
        .update({ status: "delivered" })
        .eq("id", id);

      if (error) throw error;

      setPet({ ...pet, status: "delivered" });
      alert("Đã cập nhật trạng thái. Cảm ơn cộng đồng đã giúp đỡ! 🎉");
    } catch (err) {
      console.error(err);
      alert("Lỗi: " + err.message);
    }
  };

  const handleLostPetDelete = async () => {
    if (!confirm("Bạn có chắc muốn XÓA bài đăng này?")) return;

    try {
      const { error } = await supabase.from("pets").delete().eq("id", id);

      if (error) throw error;

      alert("Đã xóa bài đăng.");
      navigate("/");
    } catch (err) {
      console.error(err);
      alert("Lỗi: " + err.message);
    }
  };

  const handleLostPetEdit = () => {
    setEditingPost(pet);
  };

  // Nếu category là 'lost' → render Lost Pet UI
  if (pet.category === "lost") {
    console.log("🔍 Rendering LOST pet:", pet.name);
    return (
      <div style={{ padding: 20, paddingBottom: 80 }}>
        <button onClick={() => navigate(-1)} style={{ marginBottom: 10, padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}>
          ← Quay lại
        </button>
        <LostPetDetail
          pet={pet}
          user={currentUser}
          isOwner={isOwner}
          onMarkAsFound={handleLostPetMarkAsFound}
          onDelete={handleLostPetDelete}
          onEdit={handleLostPetEdit}
        />
      </div>
    );
  }

  // Nếu category là 'rescue' → render Rescue Pet UI (quyên góp)
  if (pet.category === "rescue") {
    console.log("🚒 Rendering RESCUE pet:", pet.name);
    return (
      <div style={{ padding: 20, paddingBottom: 80 }}>
        <button onClick={() => navigate(-1)} style={{ marginBottom: 10, padding: "8px 12px", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}>
          ← Quay lại
        </button>
        <RescuePetDetail
          pet={pet}
          user={currentUser}
          isOwner={isOwner}
        />
      </div>
    );
  }

  // Nếu category là 'adopt' → render Adopt Pet UI (UI cũ)
  console.log("👶 Rendering ADOPTION pet:", pet.name, "- category:", pet.category);
  return (
    <div style={{ padding: 20, paddingBottom: 80 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 10 }}>
        ← Quay lại
      </button>

      <h2>{pet.name}</h2>
      <p>
        <strong>Trạng thái:</strong> {pet.status}
      </p>
      <p>
        <strong>Khu vực:</strong> {pet.district}
      </p>
      <p>
        <strong>Thời gian:</strong> {pet.timeAgo}
      </p>

      {(pet.image_url || pet.imageUrl) && (
        <img
          src={pet.image_url || pet.imageUrl}
          alt={pet.name}
          style={{
            width: "100%",
            maxWidth: 400,
            borderRadius: 16,
            margin: "10px 0",
          }}
        />
      )}

      <p>{pet.description}</p>

      {/* Cọc + nút */}
      {isOwner ? (
        <div style={{ marginTop: 20, padding: 16, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#334155", marginBottom: 12 }}>
            🏠 Bạn là người đăng bài này
          </div>
          
          {/* Thống kê nhanh */}
          <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 13 }}>
            <div style={{ padding: 8, background: "#e0f2fe", borderRadius: 6, flex: 1 }}>
              <div style={{ color: "#0369a1", fontWeight: 600 }}>
                {maxDeposit ? maxDeposit.toLocaleString() + " đ" : "0 đ"}
              </div>
              <div style={{ color: "#64748b", fontSize: 11 }}>Cọc cao nhất</div>
            </div>
            <div style={{ padding: 8, background: "#fef3c7", borderRadius: 6, flex: 1 }}>
              <div style={{ color: "#b45309", fontWeight: 600 }}>{pet.status || "available"}</div>
              <div style={{ color: "#64748b", fontSize: 11 }}>Trạng thái</div>
            </div>
          </div>

          {/* Thanh tiến trình giai đoạn */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 10 }}>
              📍 Tiến trình giao mèo
            </div>
            {(() => {
              const hasApplicants = applicants.length > 0;
              const hasConfirmed = applicants.some(a => a.status === "confirmed");
              const hasDelivered = !!adoption || applicants.some(a => a.delivery_status === "delivered");
              const hasRated = adoption?.rating_id;

              const steps = [
                { label: "Chờ người nhận", active: !hasApplicants, done: hasApplicants },
                { label: "Chờ xác nhận tiền", active: hasApplicants && !hasConfirmed, done: hasConfirmed },
                { label: "Giao mèo", active: hasConfirmed && !hasDelivered, done: hasDelivered },
                { label: "Đánh giá", active: hasDelivered && !hasRated, done: hasRated },
              ];

              return (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {steps.map((step, idx) => (
                    <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ 
                        width: "100%", 
                        height: 6, 
                        background: step.done ? "#86efac" : step.active ? "#fcd34d" : "#e2e8f0",
                        borderRadius: 3,
                        marginBottom: 4
                      }} />
                      <div style={{ 
                        fontSize: 10, 
                        color: step.done ? "#166534" : step.active ? "#b45309" : "#94a3b8",
                        fontWeight: step.active ? 600 : 400,
                        textAlign: "center"
                      }}>
                        {step.done ? "✓ " : step.active ? "● " : ""}{step.label}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Các nút hành động */}
          <div style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 16 }}>
            <button
              onClick={() => setEditingPost(pet)}
              style={{
                padding: "8px 12px",
                background: "#fff",
                color: "#334155",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              ✏️ Sửa bài
            </button>
            <button
              onClick={() => {
                const link = window.location.href;
                const message = `💚 MÈO CẦN NHÀ MỚI!\n\n🐱 ${pet.name}\n${pet.description ? `📝 ${pet.description.substring(0, 100)}${pet.description.length > 100 ? '...' : ''}\n` : ''}${pet.required_deposit ? `💰 Cọc: ${pet.required_deposit.toLocaleString()}đ\n` : ''}\n📍 Xem chi tiết & đăng ký: ${link}`;
                
                if (navigator.share) {
                  navigator.share({ 
                    title: `💚 Nhận nuôi: ${pet.name}`,
                    text: message,
                    url: link 
                  });
                } else {
                  navigator.clipboard.writeText(message);
                  alert("✅ Đã copy nội dung chia sẻ!");
                }
              }}
              style={{
                padding: "8px 12px",
                background: "#fff",
                color: "#334155",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              🔗 Share
            </button>
            <button
              onClick={() => navigate("/")}
              style={{
                padding: "8px 12px",
                background: "#fff",
                color: "#334155",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              📋 Đóng bài
            </button>
          </div>

          {/* Danh sách người đăng ký nhận */}
          <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
              👥 Người đăng ký nhận ({applicants.length})
            </div>
            
            {loadingApplicants ? (
              <div style={{ fontSize: 12, color: "#64748b" }}>Đang tải...</div>
            ) : applicants.length === 0 ? (
              <div style={{ fontSize: 12, color: "#64748b", padding: 8, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                Chưa có ai đăng ký nhận mèo này.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {applicants.map((app) => {
                  const isWaitingPayment = (app.status === "pending" || app.status === "locked") && app.payment_status === "pending";
                  const isConfirmed = app.status === "confirmed" && app.delivery_status !== "delivered";
                  const isDelivered = app.delivery_status === "delivered";
                  const isCancelled = app.status === "cancelled";
                  
                  return (
                    <div key={app.id} style={{ 
                      padding: 12, 
                      background: isDelivered ? "#f0fdf4" : isConfirmed ? "#fffbeb" : "#fff", 
                      border: `1px solid ${isDelivered ? "#86efac" : isConfirmed ? "#fcd34d" : "#e2e8f0"}`, 
                      borderRadius: 6, 
                      fontSize: 12 
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, color: "#334155", marginBottom: 2 }}>
                            {app.profiles?.display_name || app.profiles?.email || "Người nhận"}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>
                            ID: {app.receiver_id?.slice(0, 8)}...
                          </div>
                          {isConfirmed && app.profiles?.phone && (
                            <div style={{ fontSize: 11, color: "#0369a1", marginTop: 4 }}>
                              📞 {app.profiles.phone}
                            </div>
                          )}
                          {isConfirmed && app.profiles?.zalo && (
                            <div style={{ fontSize: 11, color: "#0369a1" }}>
                              💬 Zalo: {app.profiles.zalo}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 600, color: "#0369a1" }}>
                            {(app.amount || 0).toLocaleString()} đ
                          </div>
                          <div style={{ fontSize: 10, color: isDelivered ? "#059669" : isConfirmed ? "#ea580c" : isCancelled ? "#dc2626" : "#64748b", marginTop: 2 }}>
                            {isDelivered ? "✅ Đã giao" : isConfirmed ? "⏳ Chờ giao mèo" : isWaitingPayment ? "💰 Chờ xác nhận tiền" : isCancelled ? "❌ Đã hủy" : app.status}
                          </div>
                          {app.confirmed_at && (
                            <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                              {new Date(app.confirmed_at).toLocaleDateString("vi-VN")}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Trạng thái chờ xác nhận tiền */}
                      {isWaitingPayment && (
                        <div style={{ fontSize: 11, color: "#64748b", padding: 6, background: "#f9fafb", borderRadius: 4, marginBottom: 6 }}>
                          ⏰ Đang đợi admin xác nhận thanh toán. Bạn chưa cần làm gì.
                        </div>
                      )}

                      {/* Trạng thái đã confirm - chuẩn bị giao */}
                      {isConfirmed && (
                        <div style={{ padding: 8, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 4, marginBottom: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#b45309", marginBottom: 6 }}>
                            ✨ Đã xác nhận - Sẵn sàng giao mèo
                          </div>
                          <div style={{ fontSize: 11, color: "#78716c", marginBottom: 6 }}>
                            Hãy liên lạc người nhận để hẹn gặp. Khi gặp, quét QR hoặc nhập mã token để xác nhận giao mèo.
                          </div>
                        </div>
                      )}
                      
                      <div style={{ display: "flex", gap: 6, fontSize: 11, flexWrap: "wrap" }}>
                        {/* Nút xem QR (cho người nhận mở) */}
                        {isConfirmed && (
                          <button
                            onClick={() => navigate(`/deposit/${app.id}/ticket`)}
                            style={{
                              padding: "5px 10px",
                              background: "#eff6ff",
                              color: "#0369a1",
                              border: "1px solid #bae6fd",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontWeight: 500,
                            }}
                          >
                            📱 Xem QR người nhận
                          </button>
                        )}
                        
                        {/* Nút mở trang xác nhận giao mèo (owner quét/nhập token) */}
                        {isConfirmed && app.delivery_token && (
                          <button
                            onClick={() => navigate(`/deliver/${app.delivery_token}`)}
                            style={{
                              padding: "5px 10px",
                              background: "#dcfce7",
                              color: "#166534",
                              border: "1px solid #86efac",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            ✅ Xác nhận giao mèo
                          </button>
                        )}

                        {/* Nút hủy giao dịch */}
                        {!isDelivered && !isCancelled && (
                          <button
                            onClick={() => handleCancelDeposit(app.id)}
                            style={{
                              padding: "5px 10px",
                              background: "#fef2f2",
                              color: "#dc2626",
                              border: "1px solid #fecaca",
                              borderRadius: 4,
                              cursor: "pointer",
                            }}
                          >
                            ❌ Hủy
                          </button>
                        )}

                        {/* Link xem uy tín người nhận */}
                        <button
                          onClick={() => navigate(`/profile/${app.receiver_id}`)}
                          style={{
                            padding: "5px 10px",
                            background: "#fff",
                            color: "#64748b",
                            border: "1px solid #e2e8f0",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                        >
                          👤 Xem uy tín
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Phần sau khi đã giao mèo */}
          {adoption && (
            <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 12, marginTop: 12 }}>
              <div style={{ padding: 12, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#166534", marginBottom: 6 }}>
                  ✅ Đã giao mèo thành công
                </div>
                <div style={{ fontSize: 12, color: "#334155", marginBottom: 4 }}>
                  Người nhận: <strong>{adoption.profiles?.display_name || adoption.profiles?.email || "N/A"}</strong>
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                  Thời gian: {adoption.created_at ? new Date(adoption.created_at).toLocaleString("vi-VN") : "N/A"}
                </div>
                
                <div style={{ display: "flex", gap: 6, fontSize: 11, flexWrap: "wrap" }}>
                  <button
                    onClick={() => navigate(`/adoptions`)}
                    style={{
                      padding: "5px 10px",
                      background: "#fff",
                      color: "#334155",
                      border: "1px solid #e2e8f0",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    📋 Xem hồ sơ nhận nuôi
                  </button>
                  
                  {!adoption.rating_id && (
                    <button
                      onClick={() => navigate(`/rate-adoption/${adoption.id}`)}
                      style={{
                        padding: "5px 10px",
                        background: "#fef3c7",
                        color: "#b45309",
                        border: "1px solid #fcd34d",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      ⭐ Đánh giá người nhận
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
      <div style={{ marginTop: 20 }}>
        {/* ========== ADOPTION REQUESTS - RECEIVER VIEW ========== */}
        {!isOwner && (
          <>
            {/* Button "Liên hệ nhận mèo" - nếu chưa gửi request */}
            {!myRequest && (
              <button 
                onClick={handleSendContactRequest}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "#0369a1",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  marginBottom: 16
                }}
              >
                📞 Liên hệ nhận mèo này
              </button>
            )}

            {/* Request pending */}
            {myRequest && myRequest.status === 'pending' && (
              <div style={{
                padding: 12,
                background: "#fef3c7",
                border: "1px solid #fcd34d",
                borderRadius: 8,
                marginBottom: 16,
                color: "#b45309"
              }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>⏳ Yêu cầu đang chờ phản hồi</div>
                <div style={{ fontSize: 12 }}>Chủ bài sẽ xem xét yêu cầu của bạn trong giây lát.</div>
              </div>
            )}

            {/* Request accepted - show contact + confirm meet */}
            {myRequest && myRequest.status === 'accepted' && (
              <div style={{
                padding: 12,
                background: "#dcfce7",
                border: "1px solid #86efac",
                borderRadius: 8,
                marginBottom: 16
              }}>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12, color: "#166534" }}>
                  ✅ Chủ bài đã chấp nhận bạn!
                </div>

                {/* Contact info owner */}
                {ownerProfile && (
                  <div style={{
                    padding: 10,
                    background: "#eff6ff",
                    border: "1px solid #bae6fd",
                    borderRadius: 6,
                    marginBottom: 12,
                    fontSize: 13
                  }}>
                    <div style={{ fontWeight: 600, color: "#0369a1", marginBottom: 8 }}>
                      📞 Thông tin liên hệ chủ bài:
                    </div>
                    {ownerProfile.display_name && (
                      <div>👤 {ownerProfile.display_name}</div>
                    )}
                    {ownerProfile.email && (
                      <div>✉️ <a href={`mailto:${ownerProfile.email}`} style={{ color: "#0369a1" }}>
                        {ownerProfile.email}
                      </a></div>
                    )}
                    {ownerProfile.phone && (
                      <div>📱 <a href={`tel:${ownerProfile.phone}`} style={{ color: "#0369a1" }}>
                        {ownerProfile.phone}
                      </a></div>
                    )}
                  </div>
                )}

                {/* Confirm meet */}
                <div style={{
                  padding: 10,
                  background: "#f0f9ff",
                  border: "1px solid #7dd3fc",
                  borderRadius: 6,
                  marginBottom: 12
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: "#0369a1" }}>
                    ⏳ Xác nhận hẹn gặp:
                  </div>
                  <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <input 
                      type="checkbox" 
                      checked={myRequest.receiver_confirmed_meet || false}
                      onChange={handleReceiverConfirmMeet}
                    />
                    Tôi đã hẹn gặp với chủ bài
                  </label>
                  <div style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
                    {myRequest.owner_confirmed_meet 
                      ? "✅ Chủ bài đã xác nhận" 
                      : "⏳ Chờ chủ bài xác nhận..."}
                  </div>
                </div>

                {/* Show QR when ready */}
                {myRequest.status === 'ready_to_deliver' && myRequest.delivery_token && (
                  <div style={{
                    padding: 12,
                    background: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: 6
                  }}>
                    <div style={{ fontWeight: 600, color: "#166534", marginBottom: 12 }}>
                      📱 MÃ XÁC NHẬN NHẬN MÈO
                    </div>
                    <div style={{ textAlign: "center", background: "#fff", padding: 8, borderRadius: 6, marginBottom: 12 }}>
                      <QRCodeCanvas 
                        value={`https://map-meo.web.app/deliver/${myRequest.delivery_token}`} 
                        size={200}
                      />
                    </div>
                    <div style={{ fontSize: 12, marginTop: 8, textAlign: "center", fontWeight: 600, fontFamily: "monospace" }}>
                      Mã dự phòng: {myRequest.delivery_token}
                    </div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 8, textAlign: "center" }}>
                      Khi gặp chủ bài, mở màn hình này để họ quét mã.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Rejected */}
            {myRequest && myRequest.status === 'rejected' && (
              <div style={{
                padding: 12,
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                borderRadius: 8,
                marginBottom: 16,
                color: "#991b1b"
              }}>
                <div style={{ fontWeight: 600 }}>❌ Chủ bài không chấp nhận yêu cầu của bạn.</div>
              </div>
            )}
          </>
        )}

        {/* ========== ADOPTION REQUESTS - OWNER VIEW ========== */}
        {(() => {
          console.log("[RENDER] isOwner:", isOwner, "requests.length:", requests.length, "requests:", requests);
          return null;
        })()}
        {isOwner && requests.length > 0 && (
          <div style={{
            marginBottom: 20,
            padding: 12,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#334155", marginBottom: 12 }}>
              👥 Người muốn nhận mèo ({requests.length})
            </div>

            {requests.map((req) => (
              <div key={req.id} style={{
                padding: 12,
                background: req.status === 'ready_to_deliver' ? "#f0fdf4" : req.status === 'accepted' ? "#fffbeb" : "#fff",
                border: `1px solid ${req.status === 'ready_to_deliver' ? "#86efac" : req.status === 'accepted' ? "#fcd34d" : "#e2e8f0"}`,
                borderRadius: 6,
                marginBottom: 8,
                fontSize: 13
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#334155" }}>
                      {req.profiles?.display_name || req.profiles?.email || "Người nhận"}
                    </div>
                    {req.status === 'pending' && (
                      <div style={{ fontSize: 11, color: "#b45309" }}>⏳ Chờ bạn phản hồi</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", fontSize: 12 }}>
                    {req.status === 'pending' && "⏳ Chờ"}
                    {req.status === 'accepted' && "✅ Đã chấp nhận"}
                    {req.status === 'ready_to_deliver' && "🚀 Sẵn sàng giao"}
                  </div>
                </div>

                {/* Pending - Accept/Reject buttons */}
                {req.status === 'pending' && (
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    <button
                      onClick={() => handleOwnerAcceptRequest(req.id)}
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      ✅ Chấp nhận
                    </button>
                    <button
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      ❌ Từ chối
                    </button>
                  </div>
                )}

                {/* Accepted - Show contact + confirm meet */}
                {req.status === 'accepted' && (
                  <>
                    {req.profiles && (
                      <div style={{
                        padding: 8,
                        background: "#eff6ff",
                        border: "1px solid #bae6fd",
                        borderRadius: 4,
                        marginBottom: 8,
                        fontSize: 12
                      }}>
                        <strong>📞 Liên hệ:</strong>
                        {req.profiles.email && <div>✉️ {req.profiles.email}</div>}
                        {req.profiles.phone && <div>📱 {req.profiles.phone}</div>}
                      </div>
                    )}

                    <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <input
                        type="checkbox"
                        checked={req.owner_confirmed_meet || false}
                        onChange={() => handleOwnerConfirmMeet(req)}
                      />
                      <span style={{ fontSize: 12 }}>Tôi đã hẹn gặp</span>
                    </label>

                    <div style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>
                      {req.receiver_confirmed_meet 
                        ? "✅ Người nhận đã xác nhận" 
                        : "⏳ Chờ người nhận xác nhận..."}
                    </div>

                    {/* Deliver button when ready */}
                    {req.delivery_token && (
                      <button
                        onClick={() => navigate(`/deliver/${req.delivery_token}`)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          background: "#f0fdf4",
                          color: "#166534",
                          border: "1px solid #86efac",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        ✅ Quét mã & Xác nhận giao mèo
                      </button>
                    )}
                  </>
                )}

                {/* Ready to deliver - Show deliver button */}
                {req.status === 'ready_to_deliver' && req.delivery_token && (
                  <button
                    onClick={() => navigate(`/deliver/${req.delivery_token}`)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      background: "#10b981",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    ✅ Quét mã & Xác nhận giao mèo
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* OWNER - Show "Chưa có" message */}
        {isOwner && requests.length === 0 && !loadingRequests && (
          <div style={{
            marginBottom: 20,
            padding: 12,
            background: "#f0f9ff",
            border: "1px solid #7dd3fc",
            borderRadius: 8,
            fontSize: 13,
            color: "#0369a1"
          }}>
            ℹ️ Chưa có ai đăng ký nhận mèo này
          </div>
        )}
        <div style={{ marginBottom: 8, fontSize: 14 }}>
          {maxDeposit != null ? (
            <>
              <div>
                Cọc cao nhất hiện tại: {" "}
                <strong>{maxDeposit.toLocaleString()} đ</strong>
              </div>
              <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                (Gợi ý: {(maxDeposit + 10000).toLocaleString()} đ)
              </div>
            </>
          ) : (
            <div>
              Chưa có ai cọc. {" "}
              <span style={{ color: "#6b7280", fontSize: 12 }}>
                (Gợi ý: {(pet.deposit_amount || 50000).toLocaleString()} đ)
              </span>
            </div>
          )}
        </div>

        {/* ô nhập số tiền cọc */}
        <div style={{ marginBottom: 8 }}>
          <label>
            Số tiền bạn muốn cọc: {" "}
            <input
              type="number"
              step={10000}
              min={pet?.required_deposit && pet.required_deposit > 0 ? pet.required_deposit : 0}
              value={depositAmount}
              onChange={(e) => setDepositAmount(Number(e.target.value))}
              disabled={pet?.allow_custom_deposit === false}
              style={{ 
                width: 160, 
                marginLeft: 4, 
                padding: "4px 8px",
                background: pet?.allow_custom_deposit === false ? "#f3f4f6" : "#fff",
                cursor: pet?.allow_custom_deposit === false ? "not-allowed" : "text"
              }}
            />
            {" "} đ
          </label>
          {pet?.required_deposit && pet.required_deposit > 0 ? (
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              💰 Cọc tối thiểu: {pet.required_deposit.toLocaleString()} đ
              {pet?.allow_custom_deposit === false && (
                <span style={{ color: "#dc2626", fontWeight: 600 }}> (Bắt buộc)</span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>
              ✅ Chủ không yêu cầu tiền cọc (có thể nhập 0)
            </div>
          )}
        </div>

        {/* Hiển thị thông tin liên hệ owner khi không yêu cầu cọc */}
        {(!pet?.required_deposit || pet.required_deposit === 0) && (
          <div 
            style={{ 
              marginBottom: 12, 
              padding: 10, 
              background: "#f0f9ff", 
              border: "1px solid #7dd3fc",
              borderRadius: 6,
              fontSize: 13
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 6, color: "#0369a1" }}>
              📞 Thông tin liên hệ chủ bài:
            </div>
            {ownerProfile ? (
              <>
                {ownerProfile.display_name && (
                  <div>👤 Tên: {ownerProfile.display_name}</div>
                )}
                {ownerProfile.email && (
                  <div>✉️ Email: <a href={`mailto:${ownerProfile.email}`} style={{ color: "#2563eb" }}>{ownerProfile.email}</a></div>
                )}
                {ownerProfile.phone && (
                  <div>📱 SĐT: <a href={`tel:${ownerProfile.phone}`} style={{ color: "#2563eb" }}>{ownerProfile.phone}</a></div>
                )}
                {!ownerProfile.email && !ownerProfile.phone && (
                  <div style={{ color: "#6b7280", fontSize: 12 }}>Thông tin liên hệ chưa cập nhật.</div>
                )}
              </>
            ) : (
              <div style={{ color: "#6b7280", fontSize: 12 }}>Đang tải thông tin...</div>
            )}
          </div>
        )}

        {/* Hiển thị số dư ví */}
        {currentUser && (
          <div 
            style={{ 
              marginBottom: 12, 
              padding: 10, 
              background: "#f0fdf4", 
              border: "1px solid #86efac",
              borderRadius: 6,
              fontSize: 13,
              color: "#166534"
            }}
          >
            💰 Số dư ví hiện tại: <strong>{walletCredit.toLocaleString()} đ</strong>
          </div>
        )}

        {/* Hiển thị cảnh báo/thông báo về tính toán tiền cọc */}
        {depositCalculation && depositCalculation.reason && (
          <div 
            style={{ 
              marginBottom: 12, 
              padding: 10, 
              background: "#fef2f2", 
              border: "1px solid #fca5a5",
              borderRadius: 6,
              fontSize: 13,
              color: "#991b1b"
            }}
          >
            ⚠️ {depositCalculation.reason}
            <div style={{ marginTop: 6, fontWeight: "bold" }}>
              Số tiền cọc thực tế: {depositCalculation.amount.toLocaleString()} đ
            </div>
          </div>
        )}
        
        {/* Hiển thị preview chia ví + chuyển khoản */}
        {splitPreview && depositCalculation && !depositCalculation.blocked && (
          <div 
            style={{ 
              marginBottom: 12, 
              padding: 10, 
              background: "#eff6ff", 
              border: "1px solid #93c5fd",
              borderRadius: 6,
              fontSize: 13,
              color: "#1e40af"
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 6 }}>📊 Phân bổ thanh toán:</div>
            {splitPreview.walletUsed > 0 && (
              <div style={{ marginTop: 4 }}>
                • Dùng từ ví: <strong>{splitPreview.walletUsed.toLocaleString()} đ</strong>
              </div>
            )}
            {splitPreview.cashAmount > 0 && (
              <div style={{ marginTop: 4 }}>
                • Cần chuyển khoản thêm: <strong>{splitPreview.cashAmount.toLocaleString()} đ</strong>
              </div>
            )}
            {splitPreview.cashAmount === 0 && (
              <div style={{ marginTop: 4, color: "#059669" }}>
                ✅ Dùng toàn bộ ví, không cần chuyển khoản!
              </div>
            )}
          </div>
        )}

        {depositCalculation && depositCalculation.blocked && (
          <div 
            style={{ 
              marginBottom: 12, 
              padding: 10, 
              background: "#fee2e2", 
              border: "1px solid #dc2626",
              borderRadius: 6,
              fontSize: 13,
              color: "#7f1d1d",
              fontWeight: "bold"
            }}
          >
            🚫 {depositCalculation.reason}
          </div>
        )}

        <button 
          onClick={handleDepositClick} 
          disabled={loadingDeposit || (depositCalculation && depositCalculation.blocked)}
          style={{
            opacity: (loadingDeposit || (depositCalculation && depositCalculation.blocked)) ? 0.5 : 1,
            cursor: (loadingDeposit || (depositCalculation && depositCalculation.blocked)) ? "not-allowed" : "pointer"
          }}
        >
          {loadingDeposit ? "Đang xử lý..." : "Đặt cọc & hiện mã QR"}
        </button>

        {depositError && (
          <p style={{ color: "red", marginTop: 8 }}>{depositError}</p>
        )}
      </div>
      )}

      {/* Hiển thị QR + token nếu đã có deposit */}
      
      {/* BLOCK 1: QR CHUYỂN TIỀN (hiện ngay sau đặt cọc) */}
      {currentDeposit && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #3b82f6",
            borderRadius: 8,
            maxWidth: 400,
            background: "#eff6ff",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#1e40af" }}>Mã chuyển khoản cọc</h3>
          <p>
            <strong>Nội dung chuyển khoản:</strong>
          </p>
          <p
            style={{
              fontSize: 14,
              color: "#000",
              fontFamily: "monospace",
              fontWeight: "bold",
              margin: "8px 0",
            }}
          >
            MEOMAP {getShortNumericCode(pet.id)}
          </p>
          <p style={{ fontSize: 12, color: "#555", margin: "8px 0" }}>
            <strong>Số tiền:</strong> {currentDeposit.amount.toLocaleString()} đ
          </p>
          <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
            Hãy chuyển khoản theo thông tin trên, sau đó upload bằng chứng chuyển tiền trên trang danh sách cọc.
          </p>

          {/* Hiển thị uy tín người nhận */}
          {currentDeposit.receiver_id && (
            <div style={{ marginTop: 12, padding: 8, background: "#dbeafe", borderRadius: 6 }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: 14, color: "#1e40af" }}>Người đang nhận mèo</h4>
              <div style={{ fontSize: 12, color: "#1e293b" }}>ID: {currentDeposit.receiver_id}</div>

              {receiverReputation ? (
                <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
                  Uy tín: <strong>{receiverReputation.total_trades}</strong> lần nhận •{" "}
                  OK: <strong>{receiverReputation.ok_trades}</strong> •{" "}
                  Không OK: <strong>{receiverReputation.bad_trades}</strong>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  Chưa có lịch sử uy tín.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* BLOCK 2: QR NHẬN MÈO (chỉ hiện khi confirmed + có delivery_token) */}
      {currentDeposit &&
        currentDeposit.status === "confirmed" &&
        currentDeposit.delivery_token && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              border: "1px solid #10b981",
              borderRadius: 8,
              maxWidth: 400,
              background: "#f0fdf4",
            }}
          >
            <h3 style={{ marginTop: 0, color: "#065f46" }}>Mã QR xác nhận đã nhận mèo</h3>
            <div style={{ background: "#fff", padding: 8, borderRadius: 6, display: "inline-block" }}>
              <QRCodeCanvas
                value={`https://map-meo.web.app/deliver/${currentDeposit.delivery_token}`}
                size={200}
              />
            </div>
            <p style={{ marginTop: 8, fontSize: 12, color: "#000" }}>
              Mã dự phòng (nhập tay nếu quét lỗi):{" "}
              <strong>{currentDeposit.delivery_token}</strong>
            </p>
            <p style={{ fontSize: 12, color: "#666", marginTop: 8 }}>
              Khi gặp người đăng, hãy mở màn hình này để họ quét mã để xác nhận đã nhận mèo.
            </p>
          </div>
        )}

      {/* Edit Post Panel Overlay */}
      {editingPost && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "auto",
          }}
          onClick={() => setEditingPost(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 8,
              width: "90%",
              maxWidth: 600,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              pointerEvents: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <EditPostPanel
              post={editingPost}
              onClose={() => setEditingPost(null)}
              onSuccess={() => {
                setEditingPost(null);
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
