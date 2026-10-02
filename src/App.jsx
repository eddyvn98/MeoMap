import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { localApi } from "./localClient";
import Footer from "./components/Footer";
import Header from "./components/Header";
import PetMap from "./components/PetMap";
import ProfileDrawer from "./components/ProfileDrawer";
import ReportPetModal from "./components/ReportPetModal";
import AuthModal from "./components/AuthModal";
import QuickGuideModal from "./components/QuickGuideModal";
import MapFilters from "./components/MapFilters";
import CategoryBanner from "./components/app/CategoryBanner";
import EditPostOverlay from "./components/app/EditPostOverlay";
import MapStatus from "./components/app/MapStatus";
import OnboardingModal, {
  onboardingCardCount,
} from "./components/app/OnboardingModal";
import PetDeck from "./components/app/PetDeck";
import PetDetailPanel from "./components/app/PetDetailPanel";
import { usePetsController } from "./hooks/usePetsController";
import { useProfilePanel } from "./hooks/useProfilePanel";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const mapRef = useRef(null);
  const [user, setUser] = useState(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [globalEditingPost, setGlobalEditingPost] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showBanner, setShowBanner] = useState(null);
  const [bannerShown, setBannerShown] = useState({
    adopt: localStorage.getItem("banner_adopt_shown") === "1",
    lost: localStorage.getItem("banner_lost_shown") === "1",
    rescue: localStorage.getItem("banner_rescue_shown") === "1",
  });

  const {
    pets,
    filters,
    setFilters,
    setBounds,
    selectedPetId,
    setSelectedPetId,
    selectedPet,
    loading,
    error,
    loadPets,
    deleteSelectedPet,
  } = usePetsController(location.state?.filters || {});

  const {
    isProfileOpen,
    profileWidthMode,
    setProfileWidthMode,
    mapBbox,
    profileTriggerRef,
    handleBoundsChange,
    openProfilePanel,
    closeProfilePanel,
  } = useProfilePanel({ location, navigate, setBounds });

  useEffect(() => {
    localApi.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("meomap_onboarding_seen")) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    const handler = (event) => setGlobalEditingPost(event.detail);
    window.addEventListener("open-edit-post", handler);
    return () => window.removeEventListener("open-edit-post", handler);
  }, []);

  const focusPetOnMap = (pet) => {
    if (!pet) return;

    setSelectedPetId(pet.id || pet.pet_id);
    const category = (pet.category || "").toLowerCase();
    if (!["adopt", "lost", "rescue"].includes(category)) return;
    if (bannerShown[category]) return;

    setShowBanner(category);
    setBannerShown((current) => ({ ...current, [category]: true }));
    localStorage.setItem(`banner_${category}_shown`, "1");
  };

  const submitReport = async (formData) => {
    try {
      const { data: userData } = await localApi.auth.getUser();
      if (!userData.user) {
        alert("Vui lòng đăng nhập để báo cáo");
        return;
      }

      let imageUrl = null;
      if (formData.photo) {
        const fileName = `${Date.now()}-${formData.photo.name}`;
        const path = `reports/${fileName}`;
        const { error: uploadError } = await localApi.storage
          .from("pet-images")
          .upload(path, formData.photo);

        if (uploadError) {
          console.error("Lỗi upload ảnh:", uploadError);
        } else {
          imageUrl = localApi.storage.from("pet-images").getPublicUrl(path)
            .data.publicUrl;
        }
      }

      const { error: insertError } = await localApi.from("pets").insert([
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

      if (insertError) throw insertError;
      alert("Báo cáo thú cưng thành công!");
      setReportModalOpen(false);
      loadPets();
    } catch (submitError) {
      console.error("Lỗi gửi báo cáo:", submitError);
      alert("Gửi báo cáo thất bại: " + submitError.message);
    }
  };

  const closeOnboarding = (skipForever = false) => {
    if (skipForever) localStorage.setItem("meomap_onboarding_seen", "1");
    setShowOnboarding(false);
  };

  const nextOnboarding = () => {
    if (onboardingStep >= onboardingCardCount - 1) {
      closeOnboarding(true);
      return;
    }
    setOnboardingStep((step) => step + 1);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
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

      <div className="relative z-0 flex-1">
        <MapFilters filters={filters} setFilters={setFilters} />

        <PetMap
          ref={mapRef}
          pets={pets}
          onBoundsChange={handleBoundsChange}
          selectedPetId={selectedPetId}
          onSelectPet={setSelectedPetId}
          onSelectPetDetail={focusPetOnMap}
          height="100%"
        />

        <PetDetailPanel
          pet={selectedPet}
          user={user}
          onClose={() => setSelectedPetId(null)}
          onDelete={deleteSelectedPet}
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

      <ReportPetModal
        isOpen={reportModalOpen}
        mapRef={mapRef}
        onClose={() => setReportModalOpen(false)}
        onSubmit={submitReport}
      />

      <OnboardingModal
        open={showOnboarding}
        step={onboardingStep}
        onClose={closeOnboarding}
        onNext={nextOnboarding}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          setAuthModalOpen(false);
          window.location.reload();
        }}
      />

      <QuickGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      <CategoryBanner
        type={showBanner}
        onClose={() => setShowBanner(null)}
      />

      <Footer />
    </div>
  );
}
