import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { QRCodeSVG } from "qrcode.react";
import PostsSection from "./PostsSection";
import AdoptionFlowSection from "./AdoptionFlowSection";
import AdoptionActivityTimeline from "./AdoptionActivityTimeline";
import AdoptionOwnerSection from "./AdoptionOwnerSection";
import EditPostPanel from "./EditPostPanel";

const WIDTH_MAP = {
  compact: "clamp(320px, 26vw, 440px)",
  normal: "clamp(360px, 33vw, 560px)",
  wide: "clamp(440px, 38vw, 640px)",
};

export default function ProfileDrawer({
  isOpen,
  onClose,
  initialTab = "overview",
  widthMode = "normal",
  onChangeWidth,
  triggerRef,
  mapBbox = null,
  inlineWithinMap = false,
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [adoptionRequests, setAdoptionRequests] = useState([]);
  const [myAdoptionRequest, setMyAdoptionRequest] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // newest, deposit, reputation, distance
  const [pendingTasks, setPendingTasks] = useState([]);
  const [myAllAdoptionRequests, setMyAllAdoptionRequests] = useState([]);
  const [myDeposits, setMyDeposits] = useState([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(false);
  const headerRef = useRef(null);
  const drawerRef = useRef(null);
  const lastFocusedElement = useRef(null);

  const isInlineDesktop = inlineWithinMap && isDesktop;
  const drawerWidth = WIDTH_MAP[widthMode] || WIDTH_MAP.normal;

  // Load current user and profile once
  useEffect(() => {
    const loadUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) return;
      setUser(data.user);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (profileData) setProfile(profileData);
    };
    loadUser();
  }, []);

  // Load adoption requests for selected post
  useEffect(() => {
    const loadAdoptions = async () => {
      if (!selectedPost || selectedPost.category !== 'adopt') {
        setAdoptionRequests([]);
        setMyAdoptionRequest(null);
        return;
      }

      setLoadingRequests(true);
      try {
        const { data, error } = await supabase
          .from('adoption_requests')
          .select(`
            *,
            requester:profiles!requester_id(
              id, display_name, email, phone, zalo, avatar_url, wallet_credit
            )
          `)
          .eq('pet_id', selectedPost.id)
          .order('created_at', { ascending: false });

        // If table doesn't exist, clear requests silently
        if (error && error.code === 'PGRST205') {
          console.warn('[ProfileDrawer] adoption_requests table not found');
          setAdoptionRequests([]);
          setMyAdoptionRequest(null);
          return;
        }

        if (!error && data) {
          const requesterIds = data.map(r => r.requester_id);
          const { data: repData } = await supabase
            .from('user_reputation')
            .select('*')
            .in('user_id', requesterIds);

          const repMap = {};
          repData?.forEach(rep => {
            repMap[rep.user_id] = rep;
          });

          const enriched = data.map(req => ({
            ...req,
            requester_rep: repMap[req.requester_id] || { ok_trades: 0, bad_trades: 0, total_trades: 0 },
          }));

          setAdoptionRequests(enriched);
        }

        if (user?.id) {
          const { data: mineArr, error: mineErr } = await supabase
            .from('adoption_requests')
            .select('*')
            .eq('pet_id', selectedPost.id)
            .eq('requester_id', user.id);
          
          // Handle case where multiple or no records exist
          if (mineErr && mineErr.code !== 'PGRST205') {
            console.warn('[ProfileDrawer] Error loading my adoption request:', mineErr);
          }
          setMyAdoptionRequest((mineArr && mineArr.length > 0) ? mineArr[0] : null);
        }
      } catch (err) {
        console.warn('[ProfileDrawer] Exception loading adoptions:', err.message);
        setAdoptionRequests([]);
        setMyAdoptionRequest(null);
      } finally {
        setLoadingRequests(false);
      }
    };

    loadAdoptions();
  }, [selectedPost?.id, selectedPost?.category, user?.id]);

  // Load all adoption requests for current user
  useEffect(() => {
    const loadMyRequests = async () => {
      if (!user?.id) {
        setMyAllAdoptionRequests([]);
        setMyDeposits([]);
        return;
      }

      setLoadingMyRequests(true);
      try {
        // Load adoption requests
        const { data: reqs, error: reqError } = await supabase
          .from('adoption_requests')
          .select(`
            *,
            pet:pets!pet_id(
              id, name, image_url, category, lat, lng
            ),
            owner:profiles!owner_id(
              id, display_name, avatar_url
            )
          `)
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false });

        if (!reqError && reqs) {
          setMyAllAdoptionRequests(reqs);
        }

        // Load deposits (bài đã cọc)
        const { data: deposits, error: depError } = await supabase
          .from('deposits')
          .select(`
            *,
            pet:pets!pet_id(
              id, name, image_url, category, lat, lng
            ),
            owner:profiles!owner_id(
              id, display_name, avatar_url
            )
          `)
          .eq('receiver_id', user.id)
          .order('created_at', { ascending: false });

        if (!depError && deposits) {
          setMyDeposits(deposits);
        }
      } catch (err) {
        console.warn('[ProfileDrawer] Error loading my adoption requests:', err.message);
      } finally {
        setLoadingMyRequests(false);
      }
    };

    loadMyRequests();
  }, [user?.id]);

  useEffect(() => {
    const handleSelectMyPost = async (e) => {
      const petId = e.detail?.petId;
      if (!petId || !user?.id) return;

      setActiveTab('posts');

      try {
        const { data: pet, error } = await supabase
          .from('pets')
          .select('*')
          .eq('id', petId)
          .single();

        if (error) throw error;
        if (pet) {
          setSelectedPost(pet);
        }
      } catch (err) {
        console.error('[handleSelectMyPost] Error:', err);
      }
    };

    window.addEventListener('selectMyPost', handleSelectMyPost);
    return () => window.removeEventListener('selectMyPost', handleSelectMyPost);
  }, [user?.id]);

  const renderOverviewTab = () => {
    // Find the first ready_to_deliver request with QR code
    const readyRequest = myAllAdoptionRequests.find(
      req => req.status === 'ready_to_deliver' && req.delivery_token
    );

    return (
      <div style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Tổng quan</h3>
        
        {readyRequest ? (
          <div style={{
            border: '2px solid #10b981',
            borderRadius: 12,
            padding: 16,
            backgroundColor: '#f0fdf4',
            marginBottom: 16
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#065f46' }}>
              📱 MÃ NHẬN MÈO
            </div>
            <div style={{ marginBottom: 12, color: '#047857' }}>
              Bạn có thể nhận <strong>{readyRequest.pet?.name || 'mèo'}</strong> từ {readyRequest.owner?.display_name || 'chủ bài'}
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              backgroundColor: 'white',
              borderRadius: 8
            }}>
              <QRCodeSVG
                value={readyRequest.delivery_token}
                size={160}
                level="H"
                includeMargin={true}
              />
              <div style={{
                fontFamily: 'monospace',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 2,
                color: '#065f46'
              }}>
                {readyRequest.delivery_token}
              </div>
              <div style={{
                fontSize: 14,
                color: '#047857',
                textAlign: 'center',
                marginTop: 8
              }}>
                Đưa mã này cho chủ bài khi nhận mèo
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>
            Chưa có yêu cầu nào sẵn sàng nhận mèo
          </div>
        )}
        
        <div style={{ marginTop: 24 }}>
          <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Thông tin tài khoản</h4>
          <div style={{ color: '#6b7280' }}>
            {profile ? (
              <>
                <div>Tên: {profile.display_name || 'Chưa cập nhật'}</div>
                <div>Email: {profile.email || user?.email || 'Chưa cập nhật'}</div>
                <div>Số dư ví: {profile.wallet_credit?.toLocaleString() || '0'} VNĐ</div>
              </>
            ) : (
              'Đang tải...'
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderMyAdoptionsTab = () => {
    if (loadingMyRequests) {
      return <div style={{ padding: 16, textAlign: 'center' }}>Đang tải...</div>;
    }

    // Combine adoption requests and deposits
    const totalItems = myAllAdoptionRequests.length + myDeposits.length;

    if (!totalItems) {
      return (
        <div style={{ padding: 16, textAlign: 'center', color: '#6b7280' }}>
          Bạn chưa gửi yêu cầu hay cọc mèo nào
        </div>
      );
    }

    const statusLabels = {
      pending: { text: 'Chờ duyệt', color: '#f59e0b', bg: '#fef3c7' },
      ready_to_deliver: { text: 'Sẵn sàng nhận', color: '#10b981', bg: '#d1fae5' },
      delivered: { text: 'Đã giao', color: '#3b82f6', bg: '#dbeafe' },
      completed: { text: 'Hoàn thành', color: '#8b5cf6', bg: '#ede9fe' },
      rejected: { text: 'Từ chối', color: '#ef4444', bg: '#fee2e2' },
      cancelled: { text: 'Đã hủy', color: '#6b7280', bg: '#f3f4f6' },
      locked: { text: 'Đã cọc', color: '#3b82f6', bg: '#dbeafe' },
      confirmed: { text: 'Xác nhận', color: '#10b981', bg: '#d1fae5' },
      refunded: { text: 'Hoàn cọc', color: '#8b5cf6', bg: '#ede9fe' }
    };

    return (
      <div style={{ padding: 16 }}>
        <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>
          Bài đã cọc ({myDeposits.length})
        </h3>
        
        {myDeposits.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {myDeposits.map(dep => {
              const status = statusLabels[dep.status] || statusLabels.locked;
              
              return (
                <div
                  key={dep.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: 'white'
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                    {dep.pet?.image_url && (
                      <img
                        src={dep.pet.image_url}
                        alt={dep.pet.name}
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 8,
                          objectFit: 'cover'
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                        {dep.pet?.name || 'Mèo'}
                      </div>
                      <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                        Chủ: {dep.owner?.display_name || 'Không rõ'}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#3b82f6', marginBottom: 4 }}>
                        💳 Cọc: {dep.amount?.toLocaleString()}đ
                      </div>
                      <div
                        style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          color: status.color,
                          backgroundColor: status.bg
                        }}
                      >
                        {status.text}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>
          Yêu cầu nhận mèo ({myAllAdoptionRequests.length})
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {myAllAdoptionRequests.map(req => {
            const status = statusLabels[req.status] || statusLabels.pending;
            
            return (
              <div
                key={req.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 12,
                  backgroundColor: 'white'
                }}
              >
                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  {req.pet?.image_url && (
                    <img
                      src={req.pet.image_url}
                      alt={req.pet.name}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 8,
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                      {req.pet?.name || 'Mèo'}
                    </div>
                    <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                      Chủ: {req.owner?.display_name || 'Không rõ'}
                    </div>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        color: status.color,
                        backgroundColor: status.bg
                      }}
                    >
                      {status.text}
                    </div>
                  </div>
                </div>
                
                {req.status === 'ready_to_deliver' && req.delivery_token && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      backgroundColor: '#f0fdf4',
                      borderRadius: 8,
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#065f46', marginBottom: 8 }}>
                      Mã nhận mèo của bạn
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        letterSpacing: 1,
                        color: '#047857'
                      }}
                    >
                      {req.delivery_token}
                    </div>
                  </div>
                )}
                
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                  Gửi lúc: {new Date(req.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return (
          <PostsSection
            userId={user?.id || null}
            bbox={mapBbox}
            onViewDetail={(post) => setSelectedPost(post)}
            onEdit={(post) => setEditingPost(post)}
            onDelete={() => {}}
            onShowQR={() => {}}
            onEnterToken={() => {}}
          />
        );
      case 'overview':
        return renderOverviewTab();
      case 'my-adoptions':
        return renderMyAdoptionsTab();
      case 'settings':
        return <div style={{ padding: 16 }}>Cài đặt sẽ hiển thị ở đây.</div>;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`profile-layer ${isInlineDesktop ? "inline" : ""}`}
      aria-hidden={!isOpen}
      style={isInlineDesktop ? { position: "absolute" } : undefined}
    >
      {!isInlineDesktop && (
        <div
          className="profile-backdrop"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-panel-title"
        className={`profile-drawer ${isDesktop ? "desktop" : "mobile"}`}
        style={isDesktop ? { width: drawerWidth } : undefined}
        ref={drawerRef}
        tabIndex={-1}
      >
        <div className="profile-drawer__header" ref={headerRef} tabIndex={-1}>
          <div>
            <div id="profile-panel-title" className="profile-drawer__title">
              Trang cá nhân
            </div>
            <div className="profile-drawer__subtitle">Giữ nguyên bản đồ, thao tác nhanh</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isDesktop && (
              <div className="profile-drawer__size-toggle">
                {["compact", "normal", "wide"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onChangeWidth?.(mode)}
                    className={`size-chip ${widthMode === mode ? "active" : ""}`}
                  >
                    {mode === "compact" ? "C" : mode === "normal" ? "M" : "W"}
                  </button>
                ))}
              </div>
            )}
            <button className="profile-drawer__close" onClick={onClose} aria-label="Đóng">
              ×
            </button>
          </div>
        </div>

        <div className="profile-drawer__tabs" role="tablist">
          {[
            { id: "overview", label: "Overview" },
            { id: "posts", label: "Bài đăng" },
            { id: "my-adoptions", label: "🐾 Nhận" },
            { id: "settings", label: "Cài đặt" },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`profile-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="profile-drawer__body">
          {isLoading ? (
            <div className="profile-drawer__loading">Đang tải hồ sơ...</div>
          ) : error ? (
            <div className="profile-drawer__error">{error}</div>
          ) : (
            <>
              {renderTabContent()}
              
              {/* Post Detail Modal - Overlay on top of posts tab */}
              {selectedPost && activeTab === "posts" && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "#fff",
                    zIndex: 50,
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Header with back button */}
                  <div
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "#fff",
                      borderBottom: "1px solid #e5e7eb",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      zIndex: 10,
                    }}
                  >
                    <button
                      onClick={() => setSelectedPost(null)}
                      style={{
                        padding: "6px 12px",
                        background: "#f3f4f6",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      ← Quay lại
                    </button>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                      Chi tiết bài đăng
                    </h3>
                  </div>

                  {/* Post Detail Content */}
                  <div style={{ padding: 16, flex: 1 }}>
                    {/* Image */}
                    {selectedPost.image_url && (
                      <img
                        src={selectedPost.image_url}
                        alt={selectedPost.name}
                        style={{
                          width: "100%",
                          height: 240,
                          objectFit: "cover",
                          borderRadius: 8,
                          marginBottom: 16,
                        }}
                      />
                    )}

                    {/* Title & Status */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                          {selectedPost.name}
                        </h2>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 500,
                            background: selectedPost.status === "available" ? "#dcfce7" : "#fef3c7",
                            color: selectedPost.status === "available" ? "#166534" : "#92400e",
                          }}
                        >
                          {selectedPost.status === "available" ? "Có sẵn" : selectedPost.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        {selectedPost.category === "rescue" && "🚑 Cứu hộ"}
                        {selectedPost.category === "lost" && "📍 Thất lạc"}
                        {selectedPost.category === "adopt" && "🏡 Cho nhận"}
                        {" • "}
                        {selectedPost.district || "Chưa rõ khu vực"}
                      </div>
                    </div>

                    {selectedPost.category === 'adopt' && (
                      <AdoptionFlowSection
                        user={user}
                        profile={profile}
                        selectedPost={selectedPost}
                        adoptionRequests={adoptionRequests}
                        setAdoptionRequests={setAdoptionRequests}
                        myAdoptionRequest={myAdoptionRequest}
                        setMyAdoptionRequest={setMyAdoptionRequest}
                        loadingRequests={loadingRequests}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                      />
                    )}

                    {/* Description */}
                    <div style={{ marginBottom: 16 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Mô tả</h4>
                      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {selectedPost.description || "Không có mô tả"}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div style={{ marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
                      <div style={{ fontSize: 13, color: "#6b7280", display: "grid", gap: 6 }}>
                        <div>
                          <strong>Đăng lúc:</strong>{" "}
                          {new Date(selectedPost.created_at).toLocaleString("vi-VN")}
                        </div>
                        {selectedPost.updated_at && (
                          <div>
                            <strong>Cập nhật:</strong>{" "}
                            {new Date(selectedPost.updated_at).toLocaleString("vi-VN")}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                      <button
                        onClick={() => {
                          alert(`Chỉnh sửa bài: ${selectedPost.name}`);
                        }}
                        style={{
                          padding: "10px 16px",
                          background: "#3b82f6",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        ✏️ Chỉnh sửa
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Xóa bài ${selectedPost.name}?`)) {
                            alert("Xóa bài thành công (TODO: implement API call)");
                            setSelectedPost(null);
                          }
                        }}
                        style={{
                          padding: "10px 16px",
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        🗑 Xóa
                      </button>
                      <button
                        onClick={() => {
                          alert(`Hiện QR cho bài: ${selectedPost.name}`);
                        }}
                        style={{
                          padding: "10px 16px",
                          background: "#10b981",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        📱 Hiện QR
                      </button>
                      <button
                        onClick={() => {
                          const token = prompt("Nhập token:");
                          if (token) {
                            alert(`Gửi token cho bài: ${selectedPost.name}`);
                          }
                        }}
                        style={{
                          padding: "10px 16px",
                          background: "#f59e0b",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 14,
                          fontWeight: 500,
                        }}
                      >
                        🔑 Nhập Token
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </aside>

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
                // Reload posts
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
