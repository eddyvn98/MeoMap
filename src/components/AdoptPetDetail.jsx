import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import AdoptionProgressBar from "./AdoptionProgressBar";
import ContextualHelpCard from "./ContextualHelpCard";
import AdoptPetDetailView from "./AdoptPetDetailView";

export default function AdoptPetDetail({ pet, user, isOwner }) {
  const navigate = useNavigate();
  const [owner, setOwner] = useState(null);
  const [currentDeposit, setCurrentDeposit] = useState(null);
  const [maxDeposit, setMaxDeposit] = useState(null);
  const [adoptionRequests, setAdoptionRequests] = useState([]);
  const [myRequest, setMyRequest] = useState(null);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState(pet.required_deposit || 0);
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [depositMessage, setDepositMessage] = useState("");
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);
  const [deliveryToken, setDeliveryToken] = useState("");
  const [deliveryError, setDeliveryError] = useState("");
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);

  // Load owner info
  useEffect(() => {
    const loadOwner = async () => {
      if (pet.owner_id) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", pet.owner_id)
          .single();
        setOwner(data || null);
      }
    };
    loadOwner();
  }, [pet.owner_id]);

  // Load deposits và adoption requests
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      // Load max deposit
      const { data: deposits } = await supabase
        .from("deposits")
        .select("amount")
        .eq("pet_id", pet.id)
        .eq("status", "locked");

      if (deposits && deposits.length > 0) {
        const max = deposits.reduce((m, d) => (d.amount > m ? d.amount : m), 0);
        setMaxDeposit(max);
      }

      // Load current user's deposit
      const { data: myDeposit } = await supabase
        .from("deposits")
        .select("*")
        .eq("pet_id", pet.id)
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setCurrentDeposit(myDeposit);

      // Load adoption requests
      if (isOwner) {
        const { data: requests } = await supabase
          .from("adoption_requests")
          .select(`
            *,
            profiles:requester_id(id, display_name, email, phone)
          `)
          .eq("pet_id", pet.id)
          .order("created_at", { ascending: false });

        setAdoptionRequests(requests || []);
      } else {
        const { data: myReq } = await supabase
          .from("adoption_requests")
          .select("*")
          .eq("pet_id", pet.id)
          .eq("requester_id", user.id)
          .maybeSingle();

        setMyRequest(myReq);
      }
    };

    loadData();
  }, [pet.id, user, isOwner]);

  const handleViewFullPage = () => {
    navigate(`/pet/${pet.id}`);
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from("adoption_requests")
        .update({
          status: "ready_to_deliver",
          accepted_at: new Date().toISOString(),
          delivery_token: Math.random().toString(36).substr(2, 9).toUpperCase(),
          token_generated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;
      alert("✅ Đã chấp nhận! Mã quét đã được tạo.");
      
      // Reload data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!confirm("Từ chối yêu cầu này?")) return;

    try {
      const { error } = await supabase
        .from("adoption_requests")
        .update({ 
          status: "rejected", 
          rejected_at: new Date().toISOString() 
        })
        .eq("id", requestId);

      if (error) throw error;
      alert("✅ Đã từ chối yêu cầu");
      
      // Reload data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryToken.trim()) {
      setDeliveryError("Vui lòng nhập mã giao mèo");
      return;
    }

    if (!myRequest) {
      setDeliveryError("Không tìm thấy yêu cầu của bạn");
      return;
    }

    setConfirmingDelivery(true);
    setDeliveryError("");

    try {
      // Verify token matches
      const { data: request, error: reqErr } = await supabase
        .from("adoption_requests")
        .select("*")
        .eq("id", myRequest.id)
        .eq("delivery_token", deliveryToken.trim().toUpperCase())
        .single();

      if (reqErr || !request) {
        setDeliveryError("❌ Mã không đúng. Vui lòng kiểm tra lại.");
        return;
      }

      // Update status to delivered
      const { error: updateErr } = await supabase
        .from("adoption_requests")
        .update({
          status: "delivered",
          delivered_at: new Date().toISOString(),
        })
        .eq("id", myRequest.id);

      if (updateErr) throw updateErr;

      alert("✅ Đã xác nhận nhận mèo thành công!\n🎉 Chúc bạn chăm sóc bé thật tốt!");
      
      // Reload page
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      setDeliveryError("❌ Lỗi: " + err.message);
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const handleSubmitDeposit = async () => {
    if (!user || !depositAmount || depositAmount <= 0) {
      setDepositMessage("❌ Vui lòng nhập số tiền cọc hợp lệ");
      return;
    }

    setLoadingDeposit(true);
    try {
      // Step 1: Create deposit record
      const { data: depositData, error: depositError } = await supabase
        .from("deposits")
        .insert({
          pet_id: pet.id,
          owner_id: pet.owner_id,
          receiver_id: user.id,
          amount: depositAmount,
          status: "pending",
        })
        .select()
        .single();

      if (depositError) {
        setDepositMessage(`❌ ${depositError.message}`);
        return;
      }

      // Step 2: Create adoption request (để owner thấy được người muốn nhận nuôi)
      const { error: requestError } = await supabase
        .from("adoption_requests")
        .insert({
          pet_id: pet.id,
          requester_id: user.id,
          owner_id: pet.owner_id,
          status: "pending",
        })
        .select()
        .single();

      if (requestError) {
        console.error("Error creating adoption request:", requestError);
        // Không throw error vì deposit đã tạo thành công rồi
        // Có thể xử lý sau
      }

      setDepositMessage("✅ Đã gửi yêu cầu cọc thành công! Đang chờ chủ bài xác nhận...");
      setShowDepositForm(false);
      setCurrentDeposit(depositData);
      
      // Reload data after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      setDepositMessage(`❌ Lỗi: ${err.message}`);
    } finally {
      setLoadingDeposit(false);
    }
  };

  const viewScope = { pet, user, isOwner, navigate, owner, setOwner, currentDeposit, setCurrentDeposit, maxDeposit, setMaxDeposit, adoptionRequests, setAdoptionRequests, myRequest, setMyRequest, showDepositForm, setShowDepositForm, depositAmount, setDepositAmount, loadingDeposit, setLoadingDeposit, depositMessage, setDepositMessage, showDeliveryForm, setShowDeliveryForm, deliveryToken, setDeliveryToken, deliveryError, setDeliveryError, confirmingDelivery, setConfirmingDelivery, handleViewFullPage, handleAcceptRequest, handleRejectRequest, handleConfirmDelivery, handleSubmitDeposit };
  return <AdoptPetDetailView scope={viewScope} />;
}
