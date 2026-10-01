import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import LostPetOwnerView from "./LostPetOwnerView";
import ContextualHelpCard from "./ContextualHelpCard";
import ConfirmHandoverPanel from "./ConfirmHandoverPanel";
import LostPetDetailView from "./LostPetDetailView";

export default function LostPetDetail({ pet, user, isOwner, onMarkAsFound, onDelete, onEdit }) {
  const [owner, setOwner] = useState(null);
  const [sightings, setSightings] = useState([]);
  const [showSightingForm, setShowSightingForm] = useState(false);
  const [sightingImage, setSightingImage] = useState(null);
  const [sightingLocation, setSightingLocation] = useState("");
  const [sightingDescription, setSightingDescription] = useState("");
  const [submittingSighting, setSubmittingSighting] = useState(false);

  // Owner-only stats
  const [viewCount, setViewCount] = useState(0);
  const [shareCount, setShareCount] = useState(0);
  const [activities, setActivities] = useState([]);
  const [sightingVerifications, setSightingVerifications] = useState({});

  const isFound = pet.category === "delivered";
  const createdDate = new Date(pet.created_at);
  const now = new Date();
  const daysAgo = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

  const getCategoryName = (category) => {
    switch (category) {
      case "lost":
        return "Thú cưng của tôi đi lạc";
      case "rescue":
        return "Thú cưng cần cứu hộ";
      case "adopt":
        return "Thú cưng cần nhận nuôi";
      default:
        return "Thú cưng đi lạc";
    }
  };

  const getStatusName = (status) => {
    switch (status) {
      case "available":
        return "Có sẵn";
      case "in_contact":
        return "Đang liên hệ";
      case "delivered":
        return "Đã tìm thấy";
      case "cancelled":
        return "Đã huỷ";
      case "pending":
        return "Đang chờ xử lý";
      case "confirmed":
        return "Đã xác nhận";
      default:
        return "Trạng thái không xác định";
    }
  };

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
        console.log("📞 Owner contact info:", { phone: data?.phone, email: data?.email, username: data?.username });
      }
    };
    console.log("🔍 LostPetDetail - isOwner:", isOwner, "pet.owner_id:", pet.owner_id, "user.id:", user?.id);
    loadOwner();
  }, [pet.owner_id]);

  // Load sightings with reporter info
  useEffect(() => {
    const loadSightings = async () => {
      const { data, error } = await supabase
        .from("adoption_activities")
        .select(`
          *,
          reporter:actor_id (
            id,
            display_name,
            avatar_url,
            phone
          )
        `)
        .eq("pet_id", pet.id)
        .eq("activity_type", "sighting")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error('Load sightings error:', error);
        setSightings([]);
        return;
      }
      setSightings(data || []);
    };
    loadSightings();
  }, [pet.id]);

  const handleSubmitSighting = async (e) => {
    e.preventDefault();
    setSubmittingSighting(true);

    try {
      let imageUrl = null;

      if (sightingImage) {
        const ext = sightingImage.name.split(".").pop();
        const filePath = `sightings/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("pet-images")
          .upload(filePath, sightingImage);

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from("pet-images")
          .getPublicUrl(filePath);

        imageUrl = publicData?.publicUrl;
      }

      const { error: insertError } = await supabase
        .from("adoption_activities")
        .insert({
          pet_id: pet.id,
          activity_type: "sighting",
          actor_id: user.id,
          actor_type: "viewer",
          description: sightingDescription,
          metadata: {
            location: sightingLocation,
            image_url: imageUrl,
          },
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Show success message with navigation options
      const currentUrl = window.location.href;
      const goToReports = confirm(
        "✅ Cảm ơn bạn đã báo nhìn thấy!\n\n" +
        "📋 Bạn có thể xem lại báo cáo của mình trong:\n" +
        "• Trang cá nhân → Tab 'Báo của tôi'\n" +
        "• Hoặc ở lại trang này để theo dõi\n\n" +
        "Nhấn OK để đến trang 'Báo của tôi', Cancel để ở lại đây."
      );

      if (goToReports) {
        window.location.href = "/account?tab=reports";
      }

      setSightingDescription("");
      setSightingLocation("");
      setSightingImage(null);
      setShowSightingForm(false);

      // Reload sightings with reporter info
      const { data: updatedSightings, error: reloadError } = await supabase
        .from("adoption_activities")
        .select(`
          *,
          reporter:actor_id (
            id,
            display_name,
            avatar_url,
            phone
          )
        `)
        .eq("pet_id", pet.id)
        .eq("activity_type", "sighting")
        .order("created_at", { ascending: false });

      if (reloadError) {
        console.error('Reload sightings error:', reloadError);
      }
      setSightings(updatedSightings || []);
    } catch (err) {
      console.error(err);
      alert("Lỗi: " + err.message);
    } finally {
      setSubmittingSighting(false);
    }
  };

  const openGoogleMaps = () => {
    if (pet.lat && pet.lng) {
      window.open(`https://maps.google.com/?q=${pet.lat},${pet.lng}`, "_blank");
    } else {
      alert("Vị trí không xác định.");
    }
  };

  const handleShare = async () => {
    const shareText = `🐱 Tìm mèo thất lạc: ${pet.name}\n📍 ${pet.district || "Vị trí không xác định"}\nHãy giúp tôi tìm: ${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Tìm mèo: ${pet.name}`,
          text: shareText,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      navigator.clipboard.writeText(shareText);
      alert("Đã copy link chia sẻ!");
    }
  };

  // Verify or reject sighting (owner only)
  const handleVerifySighting = async (sightingId, isValid) => {
    try {
      const { error } = await supabase
        .from("adoption_activities")
        .update({
          metadata: {
            ...sightings.find(s => s.id === sightingId)?.metadata,
            verified: isValid,
            verified_at: new Date().toISOString(),
          }
        })
        .eq("id", sightingId);

      if (error) throw error;

      setSightingVerifications({
        ...sightingVerifications,
        [sightingId]: isValid
      });

      // Reload with reporter info
      const { data: updatedSightings, error: reloadError } = await supabase
        .from("adoption_activities")
        .select(`
          *,
          reporter:actor_id (
            id,
            display_name,
            avatar_url,
            phone
          )
        `)
        .eq("pet_id", pet.id)
        .eq("activity_type", "sighting")
        .order("created_at", { ascending: false });

      if (reloadError) throw reloadError;
      setSightings(updatedSightings || []);
    } catch (err) {
      console.error(err);
      alert("Lỗi: " + err.message);
    }
  };

  // Generate poster PDF (mock)
  const handleGeneratePoster = () => {
    alert("Tính năng tạo poster đang phát triển 🚧");
  };

  // Nếu là owner → render Owner View
  if (isOwner) {
    console.log("✅ Rendering LostPetOwnerView");
    return (
      <LostPetOwnerView
        pet={pet}
        owner={owner}
        isOwner={isOwner}
        sightings={sightings}
        onMarkAsFound={onMarkAsFound}
        onDelete={onDelete}
        onEdit={onEdit}
        onVerifySighting={handleVerifySighting}
        onGeneratePoster={handleGeneratePoster}
        onHandleShare={handleShare}
      />
    );
  }

  // Nếu là người xem thường → render Public View
  console.log("❌ Rendering LostPetDetail Public View - isOwner:", isOwner);
  const viewScope = { pet, user, isOwner, onMarkAsFound, onDelete, onEdit, owner, setOwner, sightings, setSightings, showSightingForm, setShowSightingForm, sightingImage, setSightingImage, sightingLocation, setSightingLocation, sightingDescription, setSightingDescription, submittingSighting, setSubmittingSighting, viewCount, setViewCount, shareCount, setShareCount, activities, setActivities, sightingVerifications, setSightingVerifications, isFound, createdDate, now, daysAgo, getCategoryName, getStatusName, handleSubmitSighting, openGoogleMaps, handleShare, handleVerifySighting, handleGeneratePoster };
  return <LostPetDetailView scope={viewScope} />;
}
