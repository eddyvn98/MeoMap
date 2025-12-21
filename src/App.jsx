import { useCallback, useEffect, useState, useRef, use } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import debounce from "lodash.debounce";
import { supabase } from "./supabaseClient";
import PetMap from "./components/PetMap";
import Header from "./components/Header";
import Footer from "./components/Footer";
import BottomNav from "./components/BottomNav";
import PetList from "./components/PetList";
import ReportPetModal from "./components/ReportPetModal";
import AuthModal from "./components/AuthModal";
import QuickGuideModal from "./components/QuickGuideModal";
import ProfileDrawer from "./components/ProfileDrawer";
import RescuePetDetail from "./components/RescuePetDetail";
import LostPetDetail from "./components/LostPetDetail";
import AdoptPetDetail from "./components/AdoptPetDetail";
import { useReminderScheduler } from "./hooks/useReminderScheduler";
import EditPostPanel from "./components/EditPostPanel";
import QrConfirmModal from "./components/QrConfirmModal";

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
              <option value="lost">🔍 Đi lạc – cần báo tin, có thưởng</option>
              <option value="adopt">🤝 Nhận nuôi – miễn phí, có cọc an toàn</option>
              <option value="rescue">🚑 Cứu hộ – khẩn cấp, có hỗ trợ</option>
            </select>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              Adopt: miễn phí, cọc chống kẻ xấu · Lost: báo tin nhận thưởng · Rescue: hỗ trợ ca khẩn cấp
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
              <option value="qbn">Quận Bình Nhật</option>
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

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef(null);
  const [pets, setPets] = useState([]);
  const [recentPets, setRecentPets] = useState([]);
  const [filters, setFilters] = useState({
    status: "available",
    category: location.state?.filters?.category || "all",
    color: location.state?.filters?.color || "all",
    animal: location.state?.filters?.animal || "all",
    ward: location.state?.filters?.ward || "all",
  });
  const [bounds, setBounds] = useState(null);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);
  const [selectedPetFull, setSelectedPetFull] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [error, setError] = useState("");
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileWidthMode, setProfileWidthMode] = useState("normal");
  const [mapBbox, setMapBbox] = useState(null);
  const profileTriggerRef = useRef(null);
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [bannerShown, setBannerShown] = useState({
    adopt: localStorage.getItem("banner_adopt_shown") === "1",
    lost: localStorage.getItem("banner_lost_shown") === "1",
    rescue: localStorage.getItem("banner_rescue_shown") === "1",
  });
  const [showBanner, setShowBanner] = useState(null);
  const [globalEditingPost, setGlobalEditingPost] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrPayload, setQrPayload] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const seen = localStorage.getItem("meomap_onboarding_seen");
    if (!seen) setShowOnboarding(true);
  }, []);

  // Listen for global edit event from ProfileDrawer
  useEffect(() => {
    const handler = (e) => setGlobalEditingPost(e.detail);
    window.addEventListener("open-edit-post", handler);
    return () => window.removeEventListener("open-edit-post", handler);
  }, []);

  // Listen for global QR modal event
  useEffect(() => {
    const handler = (e) => {
      setQrPayload(e.detail);
      setQrModalOpen(true);
    };
    window.addEventListener("open-qr-modal", handler);
    return () => window.removeEventListener("open-qr-modal", handler);
  }, []);

  // Listen for lost reward cancellation (voucher conversion)
  useEffect(() => {
    const handler = async (e) => {
      try {
        const { petId } = e.detail || {};
        if (!petId) return;
        const { data: pet, error: petErr } = await supabase
          .from("pets")
          .select("id, owner_id, bounty_amount")
          .eq("id", petId)
          .single();
        if (petErr) {
          console.error("Không lấy được pet:", petErr);
          return;
        }
        if (!pet?.owner_id || !pet?.bounty_amount || pet.bounty_amount <= 0) {
          console.warn("Thiếu owner hoặc không có bounty_amount để hoàn về ví", pet);
          return;
        }
        const { error: txnErr } = await supabase
          .from("wallet_transactions")
          .insert({
            user_id: pet.owner_id,
            deposit_id: null,
            amount: Math.round(pet.bounty_amount),
            type: "reward_cancel_voucher",
            note: "Người báo tin từ chối thưởng (lost); hoàn về ví, chỉ quy đổi voucher",
          });
        if (txnErr) {
          console.error("Lỗi ghi giao dịch ví:", txnErr);
          alert("Không thể ghi giao dịch hoàn thưởng. Vui lòng thử lại.");
          return;
        }
        alert("✅ Đã hoàn thưởng về ví người đăng (dạng voucher).");
      } catch (err) {
        console.error("Lỗi xử lý hủy nhận thưởng:", err);
        alert("Có lỗi khi xử lý hủy nhận thưởng.");
      }
    };
    window.addEventListener("lost-cancel-reward", handler);
    return () => window.removeEventListener("lost-cancel-reward", handler);
  }, []);

  // Run reminder scheduler periodically (every hour)
  useReminderScheduler(60 * 60 * 1000);

  const loadPets = useCallback(async () => {
    if (!bounds) {
      console.log("No bounds yet, skipping load");
      return;
    }

    setLoading(true);
    setError("");

    let query = supabase.from("pets").select("*");

    // Filter status - check for both 'open' and 'Lost' (legacy)
    if (filters.status === "available") {
      // Include Lost, Found, Abandoned as "open" cases, AND delivered (show completed pets with different marker)
      query = query.in("status", ["available", "Lost", "Found", "Abandoned", "delivered"]);
    }

    // Filter by category
    if (filters.category && filters.category !== "all") {
      query = query.eq("category", filters.category);
    }

    if (filters.animal && filters.animal !== "all") {
      query = query.eq("animal", filters.animal);
    }

    if (filters.ward && filters.ward !== "all") {
      query = query.eq("district", filters.ward);
    }

    query = query
      .gte("lat", bounds.south)
      .lte("lat", bounds.north)
      .gte("lng", bounds.west)
      .lte("lng", bounds.east);

    const { data, error } = await query;

    if (error) {
      console.error("Lỗi load pets theo bounds:", error);
      setError(error.message || "Không thể tải dữ liệu mèo.");
      setPets([]);
      setLoading(false);
      return;
    }

    let newPets = data || [];

    // Filter out adopt pets that already have delivered/completed adoption requests
    if (newPets.length > 0) {
      const adoptPetIds = newPets
        .filter(p => p.category === 'adopt')
        .map(p => p.id);
      
      if (adoptPetIds.length > 0) {
        try {
          const { data: adoptedRequests, error: adoptError } = await supabase
            .from('adoption_requests')
            .select('pet_id')
            .in('pet_id', adoptPetIds)
            .in('status', ['delivered', 'completed']);
          
          if (!adoptError && adoptedRequests && adoptedRequests.length > 0) {
            const adoptedPetIds = new Set(adoptedRequests.map(r => r.pet_id));
            newPets = newPets.filter(p => {
              // Giữ lại pet nếu không phải adopt hoặc chưa có người nhận
              return p.category !== 'adopt' || !adoptedPetIds.has(p.id);
            });
          }
        } catch (err) {
          console.warn('[App] Error filtering adopted pets:', err.message);
        }
      }
    }

    // Client-side search filter by name
    if (filters.searchName && filters.searchName.trim()) {
      const searchTerm = filters.searchName.toLowerCase().trim();
      newPets = newPets.filter((pet) => {
        const name = (pet.name || "").toLowerCase();
        const description = (pet.description || "").toLowerCase();
        return name.includes(searchTerm) || description.includes(searchTerm);
      });
    }

    setPets(newPets);

    if (
      selectedPetId &&
      !newPets.some((p) => (p.id || p.pet_id) === selectedPetId)
    ) {
      setSelectedPetId(null);
    }
    setLoading(false);
  }, [bounds, filters]);

  useEffect(() => {
    loadPets();
  }, [loadPets]);

  // Load full pet details when panel opens
  useEffect(() => {
    const loadPetFull = async () => {
      if (!selectedPetId) {
        setSelectedPetFull(null);
        return;
      }

      const pet = pets.find((p) => (p.id || p.pet_id) === selectedPetId);
      if (!pet) {
        setSelectedPetFull(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("pets")
          .select("*")
          .eq("id", selectedPetId)
          .single();

        if (!error && data) {
          setSelectedPetFull(data);
        }
      } catch (err) {
        console.error("Error loading full pet:", err);
      }
    };

    loadPetFull();
  }, [selectedPetId]);

  useEffect(() => {
    const loadRecentPets = async () => {
      setLoadingRecent(true);
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Lỗi load recent pets:", error);
        setRecentPets([]);
      } else {
        setRecentPets(data || []);
      }
      setLoadingRecent(false);
    };

    loadRecentPets();
  }, []);

  const handleFocusPetOnMap = (pet) => {
    if (!pet) return;
    const pid = pet.id || pet.pet_id;
    setSelectedPetId(pid);
    
    // Show first-click banner for category
    const cat = (pet.category || "").toLowerCase();
    if (cat === "adopt" && !bannerShown.adopt) {
      setShowBanner("adopt");
      setBannerShown((s) => ({ ...s, adopt: true }));
      localStorage.setItem("banner_adopt_shown", "1");
    } else if (cat === "lost" && !bannerShown.lost) {
      setShowBanner("lost");
      setBannerShown((s) => ({ ...s, lost: true }));
      localStorage.setItem("banner_lost_shown", "1");
    } else if (cat === "rescue" && !bannerShown.rescue) {
      setShowBanner("rescue");
      setBannerShown((s) => ({ ...s, rescue: true }));
      localStorage.setItem("banner_rescue_shown", "1");
    }
  };

  const handleReportPetSubmit = async (formData) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        alert("Vui lòng đăng nhập để báo cáo");
        return;
      }

      let imageUrl = null;
      
      if (formData.photo) {
        const fileName = `${Date.now()}-${formData.photo.name}`;
        const { error: uploadError } = await supabase.storage
          .from("pet-images")
          .upload(`reports/${fileName}`, formData.photo);

        if (uploadError) {
          console.error("Lỗi upload ảnh:", uploadError);
        } else {
          const { data } = supabase.storage
            .from("pet-images")
            .getPublicUrl(`reports/${fileName}`);
          imageUrl = data.publicUrl;
        }
      }

      const { error } = await supabase.from("pets").insert([
        {
          name: formData.name,
          category: formData.category,
          lat: formData.lat,
          lng: formData.lng,
          description: formData.description,
          image_url: imageUrl,
          status: "available",
          required_deposit:
            formData.category === "adopt" && formData.requiredDeposit
              ? Number(formData.requiredDeposit)
              : null,
          allow_custom_deposit:
            formData.category === "adopt" ? !!formData.allowCustomDeposit : true,
          bounty_amount:
            (formData.category === "lost" || formData.category === "rescue") && formData.bountyAmount
              ? Number(formData.bountyAmount)
              : null,
          owner_id: userData.user.id,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      alert("Báo cáo thú cưng thành công!");
      setReportModalOpen(false);
      loadPets();
    } catch (err) {
      console.error("Lỗi gửi báo cáo:", err);
      alert("Gửi báo cáo thất bại: " + err.message);
    }
  };

  const onboardingCards = [
    {
      title: "MeoMap dùng để làm gì?",
      bullets: [
        "Đăng và tìm thú cưng đi lạc",
        "Đăng tin nhận nuôi chó/mèo",
        "Báo tin cứu hộ, cập nhật tình trạng",
        "Quản lý cọc, thưởng và uy tín giao dịch",
      ],
    },
    {
      title: "Tiền cọc hoạt động ra sao?",
      bullets: [
        "Khuyến khích dùng cọc để lọc người xấu",
        "Người nhận được hoàn cọc nếu chăm mèo tốt",
        "Người đăng nhận cọc nếu người nhận bị đánh giá không tốt",
      ],
    },
    {
      title: "Tiền thưởng Lost & Rescue",
      bullets: [
        "Chủ mèo lạc treo thưởng để khuyến khích tìm kiếm",
        "Bài cứu hộ được cộng đồng treo thưởng để tăng động lực cứu, cập nhật tình hình",
        "Tất cả minh bạch qua hệ thống ví",
      ],
    },
  ];

  const closeOnboarding = (skipForever = false) => {
    if (skipForever) localStorage.setItem("meomap_onboarding_seen", "1");
    setShowOnboarding(false);
  };

  const goNextOnboarding = () => {
    if (onboardingStep >= onboardingCards.length - 1) {
      closeOnboarding(true);
    } else {
      setOnboardingStep((s) => s + 1);
    }
  };

  // Debounced bbox update for ProfileDrawer posts filtering
  const updateMapBbox = useRef(
    debounce((bounds) => {
      if (!bounds) return;
      const bbox = [bounds.west, bounds.south, bounds.east, bounds.north];
      setMapBbox(bbox);
    }, 400)
  ).current;

  const handleBoundsChange = useCallback((b) => {
    setBounds((prev) => {
      if (
        prev &&
        prev.north === b.north &&
        prev.south === b.south &&
        prev.east === b.east &&
        prev.west === b.west
      ) return prev;
      
      // Update bbox for ProfileDrawer
      updateMapBbox(b);
      return b;
    });
  }, [updateMapBbox]);

  // Profile drawer: sync with URL param ?panel=profile
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setIsProfileOpen(params.get("panel") === "profile");
  }, [location.search]);

  // Handle browser back/forward button for profile panel
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setIsProfileOpen(params.get("panel") === "profile");
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const openProfilePanel = (triggerRef) => {
    if (triggerRef?.current) {
      profileTriggerRef.current = triggerRef.current;
    }
    const params = new URLSearchParams(location.search);
    if (params.get("panel") !== "profile") {
      params.set("panel", "profile");
      const search = params.toString();
      navigate({ pathname: location.pathname, search: `?${search}` }, { replace: false });
    }
    setIsProfileOpen(true);
  };

  const closeProfilePanel = () => {
    const params = new URLSearchParams(location.search);
    if (params.get("panel") === "profile") {
      params.delete("panel");
      const search = params.toString();
      navigate({ pathname: location.pathname, search: search ? `?${search}` : "" }, { replace: true });
    }
    setIsProfileOpen(false);
  };


  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Header
        setAuthModalOpen={setAuthModalOpen}
        setReportModalOpen={setReportModalOpen}
        onOpenProfilePanel={openProfilePanel}
        onOpenGuide={() => setShowGuideModal(true)}
      />
      {/* Compact Header */}

      {/* Removed floating center card to avoid double popups; popover buttons now open detail directly */}

      {/* Global Edit Post Panel Overlay (triggered via window event) */}
      {globalEditingPost && (
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
          onClick={() => setGlobalEditingPost(null)}
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
              post={globalEditingPost}
              onClose={() => setGlobalEditingPost(null)}
              onSuccess={() => {
                setGlobalEditingPost(null);
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}

      {/* Full Screen Map */}
      <div style={{ flex: 1, position: "relative", zIndex: 0 }}>
        {/* Search inside map, aligned with profile top */}
        <MapFilters filters={filters} setFilters={setFilters} />

        <PetMap
          ref={mapRef}
          pets={pets}
          onBoundsChange={handleBoundsChange}
          selectedPetId={selectedPetId}
          onSelectPet={setSelectedPetId}
          onSelectPetDetail={handleFocusPetOnMap}
          height="100%"
        />
        
        {/* Left Detail Panel */}
        {selectedPetId && pets.length > 0 && (() => {
          const pet = selectedPetFull || pets.find((p) => (p.id || p.pet_id) === selectedPetId);

          if (!pet) return null;

          // Check if user is the owner
          const isOwner = pet.owner_id === user?.id;

          return (
            <>
              {/* Backdrop overlay */}
              <div 
                className="absolute inset-0 bg-black/20 z-[1999]"
                onClick={() => setSelectedPetId(null)}
              />
              
              {/* Panel */}
              <div className="absolute top-0 left-0 h-full w-[clamp(320px,33vw,560px)] bg-white shadow-[2px_4px_16px_rgba(0,0,0,0.15)] z-[2000] flex flex-col overflow-hidden">
                {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
                <h3 className="m-0 text-base font-bold">Chi tiết</h3>
                <button
                  onClick={() => setSelectedPetId(null)}
                  className="bg-transparent border-none text-2xl cursor-pointer px-2 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Category-specific detail widgets */}
                {pet.category === "rescue" ? (
                  <RescuePetDetail pet={pet} user={user} isOwner={isOwner} />
                ) : pet.category === "adopt" ? (
                  <AdoptPetDetail pet={pet} user={user} isOwner={isOwner} />
                ) : pet.category === "lost" ? (
                  <LostPetDetail 
                    pet={pet} 
                    user={user} 
                    isOwner={isOwner}
                    onMarkAsFound={async () => {
                      if (!confirm("Bạn có chắc muốn đánh dấu bài này là 'Đã tìm thấy'?")) return;
                      
                      try {
                        // 1. Get verified sighting (người tìm thấy)
                        const { data: verifiedSightings, error: sightingError } = await supabase
                          .from("adoption_activities")
                          .select("actor_id")
                          .eq("pet_id", pet.id)
                          .eq("activity_type", "sighting")
                          .eq("metadata->>verified", "true")
                          .order("created_at", { ascending: false })
                          .limit(1);

                        if (sightingError) throw sightingError;

                        // 2. Transfer bounty to finder if exists
                        const finder = verifiedSightings?.[0];
                        const bountyAmount = pet.bounty_amount || 0;

                        if (finder && bountyAmount > 0) {
                          // Credit finder's wallet
                          const { error: walletError } = await supabase.rpc('increase_balance_thuong', {
                            p_user_id: finder.actor_id,
                            p_amount: bountyAmount,
                            p_note: `Nhận thưởng tìm thấy mèo: ${pet.name}`,
                            p_related_id: pet.id,
                            p_source: 'lost_pet_bounty'
                          });

                          if (walletError) throw walletError;

                          // Create transaction record
                          const { error: txnError } = await supabase
                            .from("wallet_transactions")
                            .insert({
                              user_id: finder.actor_id,
                              amount: bountyAmount,
                              type: "lost_pet_bounty",
                              source_type: "thuong",
                              related_id: pet.id,
                              created_at: new Date().toISOString(),
                            });

                          if (txnError) console.error("Transaction record error:", txnError);
                        }

                        // 3. Update pet status to delivered
                        const { error } = await supabase
                          .from("pets")
                          .update({ status: "delivered" })
                          .eq("id", pet.id);

                        if (error) throw error;

                        // 4. Reload pets list
                        const { data: updatedPets } = await supabase
                          .from("pets")
                          .select("*")
                          .order("created_at", { ascending: false });
                        
                        setPets(updatedPets || []);
                        setSelectedPetId(null);
                        
                        if (finder && bountyAmount > 0) {
                          alert(`Đã cập nhật trạng thái. Người tìm thấy đã nhận ${bountyAmount.toLocaleString()}đ! 🎉`);
                        } else {
                          alert("Đã cập nhật trạng thái. Cảm ơn cộng đồng đã giúp đỡ! 🎉");
                        }
                      } catch (err) {
                        console.error(err);
                        alert("Lỗi: " + err.message);
                      }
                    }}
                    onDelete={async () => {
                      if (!confirm("Bạn có chắc muốn XÓA bài đăng này?")) return;
                      
                      try {
                        const { error } = await supabase
                          .from("pets")
                          .delete()
                          .eq("id", pet.id);

                        if (error) throw error;

                        // Reload pets list
                        const { data: updatedPets } = await supabase
                          .from("pets")
                          .select("*")
                          .order("created_at", { ascending: false });
                        
                        setPets(updatedPets || []);
                        setSelectedPetId(null);
                        alert("Đã xóa bài đăng.");
                      } catch (err) {
                        console.error(err);
                        alert("Lỗi: " + err.message);
                      }
                    }}
                    onEdit={() => {
                      setEditingPost(pet);
                    }}
                  />
                ) : (
                  <>
                    {/* Fallback simple view for other categories */}
                    {/* Image Gallery */}
                    <div className="mb-4">
                      {pet.image_url && (
                        <img
                          src={pet.image_url}
                          alt={pet.name}
                          className="w-full h-[200px] object-cover rounded-xl mb-2"
                        />
                      )}
                    </div>

                    {/* Title & Status */}
                    <h2 className="text-xl font-bold m-0 mb-2">
                      {pet.name || "Chưa đặt tên"}
                    </h2>
                    <div className="inline-block px-3 py-1.5 rounded-md bg-blue-50 text-sky-700 text-xs font-semibold mb-3">
                      {pet.status || "Unknown"}
                    </div>

                    {/* Description */}
                    {pet.description && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-1 font-semibold">
                          📝 Mô tả
                        </div>
                        <div className="text-sm text-gray-700 leading-relaxed">
                          {pet.description}
                        </div>
                      </div>
                    )}

                    {/* Xem đầy đủ button */}
                    <button
                      onClick={() => navigate(`/pet/${pet.id || pet.pet_id}`)}
                      className="w-full px-4 py-3 bg-blue-500 text-white border-none rounded-lg font-bold text-sm cursor-pointer hover:bg-blue-600 transition-colors"
                    >
                      Xem đầy đủ
                    </button>
                  </>
                )}
              </div>
            </div>
            </>
          );
        })()}

        {/* Bottom Pet Deck */}
        {pets.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 16,
              left: 0,
              right: 0,
              zIndex: 1500,
              paddingLeft: 16,
              paddingRight: 16,
              pointerEvents: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 12,
                overflowX: "auto",
                paddingBottom: 4,
                scrollbarWidth: "none",
              }}
            >
              {pets.map((pet) => {
                const petId = pet.id || pet.pet_id;
                const isActive = petId === selectedPetId;
                return (
                  <div
                    key={petId}
                    onClick={() => {
                      setSelectedPetId(petId);
                    }}
                    style={{
                      flex: "0 0 140px",
                      background: "#fff",
                      borderRadius: 12,
                      overflow: "hidden",
                      cursor: "pointer",
                      boxShadow: isActive
                        ? "0 4px 16px rgba(59,130,246,0.4)"
                        : "0 2px 12px rgba(0,0,0,0.15)",
                      border: isActive ? "2px solid #3b82f6" : "2px solid transparent",
                      zIndex: 100,
                      transition: "all 0.2s",
                    }}
                  >
                    {pet.image_url && (
                      <img
                        src={pet.image_url}
                        alt={pet.name}
                        style={{
                          width: "100%",
                          height: 100,
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <div style={{ padding: 8 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          marginBottom: 2,
                        }}
                      >
                        {pet.name || "Mèo"}
                      </div>
                      <div style={{ fontSize: 11, color: "#6b7280", textTransform: "capitalize" }}>
                        {pet.status}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading && (
          <div
            style={{
              position: "absolute",
              bottom: 180,
              left: 16,
              background: "rgba(255,255,255,0.95)",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              zIndex: 100,
            }}
          >
            Đang tải mèo...
          </div>
        )}

        {error && (
          <div
            style={{
              position: "absolute",
              bottom: 180,
              left: 16,
              background: "#fee2e2",
              color: "#b91c1c",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              zIndex: 100,
            }}
          >
            Lỗi: {error}
          </div>
        )}

        {/* Profile Drawer / Modal (inline within map to keep map interactive) */}
        <ProfileDrawer
          isOpen={isProfileOpen}
          onClose={closeProfilePanel}
          widthMode={profileWidthMode}
          onChangeWidth={setProfileWidthMode}
          triggerRef={profileTriggerRef}
          mapBbox={mapBbox}
          inlineWithinMap
        />
      </div>

      {/* Report Modal */}
      <ReportPetModal
        isOpen={reportModalOpen}
        mapRef={mapRef}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReportPetSubmit}
      />

      {showOnboarding && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 120000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 420,
              padding: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                {onboardingCards[onboardingStep].title}
              </h3>
              <button
                onClick={() => closeOnboarding(true)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: 18,
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ×
              </button>
            </div>

            <ul style={{ paddingLeft: 18, margin: "0 0 16px", color: "#374151", lineHeight: 1.6, fontSize: 14 }}>
              {onboardingCards[onboardingStep].bullets.map((b, idx) => (
                <li key={idx}>{b}</li>
              ))}
            </ul>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <button
                onClick={() => closeOnboarding(true)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#6b7280",
                  cursor: "pointer",
                  fontSize: 13,
                  textDecoration: "underline",
                }}
              >
                Đừng hiện lại
              </button>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Bước {onboardingStep + 1}/{onboardingCards.length}
              </div>
            </div>

            <button
              onClick={goNextOnboarding}
              style={{
                width: "100%",
                padding: 12,
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              {onboardingStep >= onboardingCards.length - 1 ? "Bắt đầu thôi" : "Tiếp tục"}
            </button>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          window.location.reload();
        }}
      />

      {/* Quick Guide Modal */}
      <QuickGuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />

      {/* Global QR Modal */}
      <QrConfirmModal isOpen={qrModalOpen} onClose={() => setQrModalOpen(false)} payload={qrPayload} />

      {/* First-Click Banner */}
      {showBanner && (
        <div
          style={{
            position: "fixed",
            bottom: 120,
            left: 16,
            right: 16,
            maxWidth: 400,
            background: showBanner === "adopt" ? "#d1fae5" : showBanner === "lost" ? "#fee2e2" : "#fef3c7",
            border: `2px solid ${showBanner === "adopt" ? "#10b981" : showBanner === "lost" ? "#ef4444" : "#fcd34d"}`,
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            zIndex: 10000,
            animation: "slideUp 0.3s ease-out",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              {showBanner === "adopt" && (
                <>
                  <h4 style={{ margin: "0 0 6px", color: "#065f46", fontSize: 14, fontWeight: 700 }}>
                    🤝 Nhận nuôi miễn phí
                  </h4>
                  <p style={{ margin: 0, color: "#047857", fontSize: 13, lineHeight: 1.4 }}>
                    Tiền cọc không phải mua bán. Nó dùng để đảm bảo trách nhiệm và sẽ hoàn lại bằng voucher nếu bạn chăm mèo tốt.
                  </p>
                </>
              )}
              {showBanner === "lost" && (
                <>
                  <h4 style={{ margin: "0 0 6px", color: "#7f1d1d", fontSize: 14, fontWeight: 700 }}>
                    🔍 Mèo đi lạc – cần báo tin
                  </h4>
                  <p style={{ margin: 0, color: "#b91c1c", fontSize: 13, lineHeight: 1.4 }}>
                    Bạn có thể báo tin nếu thấy mèo. Chủ mèo sẽ gửi thưởng nếu xác minh đúng.
                  </p>
                </>
              )}
              {showBanner === "rescue" && (
                <>
                  <h4 style={{ margin: "0 0 6px", color: "#92400e", fontSize: 14, fontWeight: 700 }}>
                    🚑 Trường hợp khẩn cấp
                  </h4>
                  <p style={{ margin: 0, color: "#b45309", fontSize: 13, lineHeight: 1.4 }}>
                    Người cứu hộ sẽ nhận hỗ trợ và thưởng. Bạn cũng có thể quyên góp để giúp.
                  </p>
                </>
              )}
            </div>
            <button
              onClick={() => setShowBanner(null)}
              style={{
                border: "none",
                background: "transparent",
                fontSize: 18,
                cursor: "pointer",
                color: showBanner === "adopt" ? "#047857" : showBanner === "lost" ? "#b91c1c" : "#b45309",
                padding: 0,
                marginTop: -4,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
      <Footer />
    </div>
  );
}
