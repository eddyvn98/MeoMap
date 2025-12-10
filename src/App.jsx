import { useCallback, useEffect, useState, useRef, use } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import debounce from "lodash.debounce";
import { supabase } from "./supabaseClient";
import PetMap from "./components/PetMap";
import Header from "./components/Header";
import BottomNav from "./components/BottomNav";
import PetList from "./components/PetList";
import ReportPetModal from "./components/ReportPetModal";
import AuthModal from "./components/AuthModal";
import ProfileDrawer from "./components/ProfileDrawer";
import RescuePetDetail from "./components/RescuePetDetail";
import LostPetDetail from "./components/LostPetDetail";
import AdoptPetDetail from "./components/AdoptPetDetail";
import { useReminderScheduler } from "./hooks/useReminderScheduler";

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
              <option value="lost">Đi lạc</option>
              <option value="adopt">Nhận nuôi</option>
              <option value="rescue">Cứu hộ</option>
            </select>
          </div>

          {/* Màu lông */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Màu lông</label>
            <select
              value={filters.color || "all"}
              onChange={(e) => setFilters((f) => ({ ...f, color: e.target.value }))}
              style={{
                width: "100%",
                padding: 6,
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <option value="all">Tất cả</option>
              <option value="white">Trắng</option>
              <option value="black">Đen</option>
              <option value="orange">Vàng / Cam</option>
              <option value="gray">Xám</option>
              <option value="mixed">Nhiều màu</option>
            </select>
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

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user);
    };
    fetchUser();
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
      // Include Lost, Found, Abandoned as "open" cases
      query = query.in("status", ["available", "Lost", "Found", "Abandoned"]);
    }

    // TODO: Add category column to database first
    // if (filters.category === "lost") {
    //   query = query.eq("category", "lost");
    // } else if (filters.category === "adopt") {
    //   query = query.eq("category", "adopt");
    // } else if (filters.category === "rescue") {
    //   query = query.eq("category", "rescue");
    // }

    if (filters.color && filters.color !== "all") {
      query = query.eq("color", filters.color);
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

    const newPets = data || [];
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
      />
      {/* Compact Header */}

      {/* Removed floating center card to avoid double popups; popover buttons now open detail directly */}

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
          onSelectPetDetail={(pet) => {
            setSelectedPetId(pet.id || pet.pet_id);
          }}
          height="100%"
        />
        
        {/* Left Detail Panel */}
        {selectedPetId && pets.length > 0 && (() => {
          const pet = selectedPetFull || pets.find((p) => (p.id || p.pet_id) === selectedPetId);

          if (!pet) return null;

          if (pet.owner_id == user?.id) {
            if (!isProfileOpen) {
              openProfilePanel(null);
            }
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('selectMyPost', { detail: { petId: pet.id || pet.pet_id } }));
            }, 100);
            return null;
          }

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
                  <RescuePetDetail pet={pet} user={user} isOwner={false} />
                ) : pet.category === "adopt" ? (
                  <AdoptPetDetail pet={pet} user={user} isOwner={false} />
                ) : pet.category === "lost" ? (
                  <LostPetDetail pet={pet} user={user} isOwner={false} />
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
