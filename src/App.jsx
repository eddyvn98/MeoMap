import { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import debounce from "lodash.debounce";
import { localApi } from "./localClient";
import PetMap from "./components/PetMap";
import Header from "./components/Header";
import Footer from "./components/Footer";
import BottomNav from "./components/BottomNav";
import PetList from "./components/PetList";
import ReportPetModal from "./components/ReportPetModal";
import AuthModal from "./components/AuthModal";
import QuickGuideModal from "./components/QuickGuideModal";
import ProfileDrawer from "./components/ProfileDrawer";
import MapFilters from "./components/MapFilters";
import CategoryBanner from "./components/app/CategoryBanner";
import EditPostOverlay from "./components/app/EditPostOverlay";
import MapStatus from "./components/app/MapStatus";
import OnboardingModal, { onboardingCardCount } from "./components/app/OnboardingModal";
import PetDeck from "./components/app/PetDeck";
import PetDetailPanel from "./components/app/PetDetailPanel";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef(null);
  const [pets, setPets] = useState([]);
  const [filters, setFilters] = useState({
    status: "available",
    category: location.state?.filters?.category || "all",
    color: location.state?.filters?.color || "all",
    animal: location.state?.filters?.animal || "all",
    ward: location.state?.filters?.ward || "all",
  });
  const [bounds, setBounds] = useState(null);
  const [selectedPetId, setSelectedPetId] = useState(null);
  const [selectedPetFull, setSelectedPetFull] = useState(null);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    const fetchUser = async () => {
      const { data: userData } = await localApi.auth.getUser();
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

  const loadPets = useCallback(async () => {
    if (!bounds) {
      console.log("No bounds yet, skipping load");
      return;
    }

    setLoading(true);
    setError("");

    let query = localApi.from("pets").select("*");

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
        const { data, error } = await localApi
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
      const { data: userData } = await localApi.auth.getUser();
      if (!userData.user) {
        alert("Vui lòng đăng nhập để báo cáo");
        return;
      }

      let imageUrl = null;
      
      if (formData.photo) {
        const fileName = `${Date.now()}-${formData.photo.name}`;
        const { error: uploadError } = await localApi.storage
          .from("pet-images")
          .upload(`reports/${fileName}`, formData.photo);

        if (uploadError) {
          console.error("Lỗi upload ảnh:", uploadError);
        } else {
          const { data } = localApi.storage
            .from("pet-images")
            .getPublicUrl(`reports/${fileName}`);
          imageUrl = data.publicUrl;
        }
      }

      const { error } = await localApi.from("pets").insert([
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

  const closeOnboarding = (skipForever = false) => {
    if (skipForever) localStorage.setItem("meomap_onboarding_seen", "1");
    setShowOnboarding(false);
  };

  const goNextOnboarding = () => {
    if (onboardingStep >= onboardingCardCount - 1) {
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


  const selectedPet =
    selectedPetFull ||
    pets.find((pet) => (pet.id || pet.pet_id) === selectedPetId) ||
    null;

  const handleDeletePet = async () => {
    if (!selectedPet || !confirm("Bạn có chắc muốn XÓA bài đăng này?")) return;

    try {
      const { error: deleteError } = await localApi
        .from("pets")
        .delete()
        .eq("id", selectedPet.id);

      if (deleteError) throw deleteError;

      const { data: updatedPets } = await localApi
        .from("pets")
        .select("*")
        .order("created_at", { ascending: false });

      setPets(updatedPets || []);
      setSelectedPetId(null);
      alert("Đã xóa bài đăng.");
    } catch (deleteError) {
      console.error(deleteError);
      alert("Lỗi: " + deleteError.message);
    }
  };


  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Header
        setAuthModalOpen={setAuthModalOpen}
        setReportModalOpen={setReportModalOpen}
        onOpenProfilePanel={openProfilePanel}
        onOpenGuide={() => setShowGuideModal(true)}
      />
      <EditPostOverlay
        post={globalEditingPost}
        onClose={() => setGlobalEditingPost(null)}
        onSuccess={() => {
          setGlobalEditingPost(null);
          window.location.reload();
        }}
      />

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
        
        <PetDetailPanel
          pet={selectedPet}
          user={user}
          onClose={() => setSelectedPetId(null)}
          onDelete={handleDeletePet}
          onEdit={() => setGlobalEditingPost(selectedPet)}
          onViewFull={() =>
            selectedPet &&
            navigate(`/pet/${selectedPet.id || selectedPet.pet_id}`)
          }
        />

        <PetDeck
          pets={pets}
          selectedPetId={selectedPetId}
          onSelect={setSelectedPetId}
        />

        <MapStatus loading={loading} error={error} />

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

      <OnboardingModal
        open={showOnboarding}
        step={onboardingStep}
        onClose={closeOnboarding}
        onNext={goNextOnboarding}
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

      {/* Quick Guide Modal */}
      <QuickGuideModal isOpen={showGuideModal} onClose={() => setShowGuideModal(false)} />

      <CategoryBanner
        type={showBanner}
        onClose={() => setShowBanner(null)}
      />

      <Footer />
    </div>
  );
}
