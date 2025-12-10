import React, { useState } from "react";
import ProfileDrawerHeader from "./components/Header";
import Tabs from "./components/Tabs";
import OverviewTab from "./components/OverviewTab";
import PostsTab from "./components/PostsTab";
import MyAdoptionsTab from "./components/MyAdoptionsTab";
import SettingsTab from "./components/SettingsTab";
import PostDetail from "./components/PostDetail";
import { useProfileData } from "./hooks/useProfileData";
import { useAdoptionRequests } from "./hooks/useAdoptionRequests";
import { useMeetingConfirm } from "./hooks/useMeetingConfirm";
import { useDeliveryConfirm } from "./hooks/useDeliveryConfirm";

export default function ProfileDrawer(props) {
  const {
    isOpen,
    onClose,
    initialTab = "overview",
    widthMode = "normal",
    onChangeWidth,
    triggerRef,
    mapBbox = null,
    inlineWithinMap = false,
  } = props;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedPost, setSelectedPost] = useState(null);

  const profileData = useProfileData({ isOpen });
  const adoptionData = useAdoptionRequests({ selectedPost, profileData });
  const meeting = useMeetingConfirm({ adoptionData, selectedPost });
  const delivery = useDeliveryConfirm({ adoptionData, selectedPost, profileData });

  if (!isOpen) return null;

  return (
    <aside className="profile-drawer" style={{ width: "min(560px, 38vw)" }}>
      <ProfileDrawerHeader
        onClose={onClose}
        widthMode={widthMode}
        onChangeWidth={onChangeWidth}
      />
      <Tabs active={activeTab} onChange={setActiveTab} />
      <div className="profile-drawer__body" style={{ padding: 12 }}>
        {activeTab === "overview" && <OverviewTab {...profileData} />}
        {activeTab === "posts" && <PostsTab onViewDetail={setSelectedPost} bbox={mapBbox} />}
        {activeTab === "my-adoptions" && (
          <MyAdoptionsTab
            {...adoptionData}
            onConfirmMeeting={meeting.handleConfirmMeeting}
            onConfirmDelivery={delivery.handleConfirmDelivery}
          />
        )}
        {activeTab === "settings" && <SettingsTab {...profileData} />}
      </div>

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          adoptionRequests={adoptionData.adoptionRequests}
          onAccept={adoptionData.handleAcceptRequest}
          onReject={adoptionData.handleRejectRequest}
          onConfirmMeeting={meeting.handleConfirmMeeting}
          onOwnerCancelRequest={adoptionData.handleOwnerCancelRequest}
          onScanDelivery={delivery.openScanModal}
        />
      )}
    </aside>
  );
}
