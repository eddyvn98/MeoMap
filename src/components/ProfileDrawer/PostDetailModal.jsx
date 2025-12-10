import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { QRCodeSVG } from "qrcode.react";
import AdoptionActivityTimeline from "../AdoptionActivityTimeline";
import { sendOwnerReminderEmail } from "../../services/emailService";

/**
 * PostDetailModal - Modal hiển thị chi tiết bài đăng
 * Bao gồm: thông tin post, adoption timeline, adoption requests, requester view
 */
export default function PostDetailModal({
  post,
  onClose,
  adoptionRequests,
  myAdoptionRequest,
  user,
  profile,
  loadingRequests,
  deposits,
  sortBy,
  onSortChange,
  onAcceptRequest,
  onRejectRequest,
  onConfirmMeeting,
  onOwnerCancelRequest,
  onScanDelivery,
  onAdoptionRequestsChange,
  onMyAdoptionRequestChange,
}) {
  const [setMyAdoptionRequest] = useState(myAdoptionRequest);

  // Helper: compute followup badge
  const computeFollowupBadge = (request) => {
    if (!request) return { label: '', color: '#d1d5db', bg: '#f3f4f6' };
    if (request.status === 'completed') return { label: '🟩 Đã hoàn tất adopt', color: '#166534', bg: '#dcfce7' };
    if (request.status === 'delivered') {
      const due = request.checkin_required_at ? new Date(request.checkin_required_at) : null;
      const now = new Date();
      if (due && now > due) return { label: '🟥 Quá hạn 30 ngày', color: '#991b1b', bg: '#fee2e2' };
      if (request.receiver_confirmed_checkin) return { label: '🟨 Chờ chủ xác nhận', color: '#92400e', bg: '#fef3c7' };
      return { label: '🟧 Chờ xác nhận sau giao', color: '#92400e', bg: '#fef3c7' };
    }
    return { label: '', color: '#d1d5db', bg: '#f3f4f6' };
  };

  // Helper: get sorted requests
  const getSortedRequests = () => {
    let sorted = [...adoptionRequests];
    
    switch(sortBy) {
      case 'deposit':
        sorted.sort((a, b) => (b.requester?.wallet_credit || 0) - (a.requester?.wallet_credit || 0));
        break;
      case 'reputation':
        sorted.sort((a, b) => (b.requester_rep?.ok_trades || 0) - (a.requester_rep?.ok_trades || 0));
        break;
      case 'distance':
      default:
        sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    
    return sorted;
  };

  const sortedRequests = getSortedRequests();

  // Helper: calculate adoption timeline current step
  const calculateCurrentStep = () => {
    let currentStep = 1;
    let stepLabel = 'Chờ người nhận cọc';
    
    if (adoptionRequests && adoptionRequests.length > 0) {
      const accepted = adoptionRequests.find(r => 
        r.status === 'accepted' || 
        r.status === 'ready_to_deliver' || 
        r.status === 'delivered' || 
        r.status === 'completed'
      );
      
      if (accepted) {
        currentStep = 2;
        stepLabel = 'Đã có người nhận';
        
        if (accepted.status === 'ready_to_deliver') {
          currentStep = 3;
          stepLabel = 'Sẵn sàng giao mèo';
        }
        if (accepted.status === 'delivered') {
          currentStep = 4;
          stepLabel = 'Chờ xác nhận sau giao';
          if (accepted.receiver_confirmed_checkin && !accepted.owner_confirmed_checkin) {
            stepLabel = 'Chờ bạn xác nhận';
          }
          if (accepted.receiver_confirmed_checkin && accepted.owner_confirmed_checkin) {
            currentStep = 6;
            stepLabel = 'Hoàn tất adopt';
          }
        }
        if (accepted.status === 'completed') {
          currentStep = 6;
          stepLabel = 'Hoàn tất adopt';
        }
      }
    }
    
    return { currentStep, stepLabel };
  };

  const { currentStep, stepLabel } = calculateCurrentStep();

  const steps = [
    { id: 1, label: 'Đăng bài', icon: '📝' },
    { id: 2, label: 'Nhận cọc', icon: '💰' },
    { id: 3, label: 'Giao/QR', icon: '📱' },
    { id: 4, label: 'XN 1d', icon: '✓' },
    { id: 5, label: 'XN 7d', icon: '📸' },
    { id: 6, label: 'Hoàn tất', icon: '🎉' }
  ];

  // Handle receiver check-in confirmation
  const handleReceiverCheckIn = async (requestId) => {
    try {
      const { error } = await supabase
        .from('adoption_requests')
        .update({
          receiver_confirmed_checkin: true,
          receiver_confirmed_checkin_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      alert('Đã xác nhận hoàn thành! Chờ chủ bài xác nhận.');

      const { data: updated } = await supabase
        .from('adoption_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (updated && onMyAdoptionRequestChange) {
        onMyAdoptionRequestChange(updated);
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Handle owner check-in confirmation
  const handleOwnerCheckIn = async (requestId) => {
    try {
      const { error } = await supabase
        .from('adoption_requests')
        .update({
          owner_confirmed_checkin: true,
          owner_confirmed_checkin_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      alert('Đã xác nhận hoàn thành! Giao dịch sẽ hoàn tất.');

      // Reload adoption requests
      if (post && onAdoptionRequestsChange) {
        const { data, error: loadError } = await supabase
          .from('adoption_requests')
          .select(`
            *,
            requester:profiles!requester_id(
              id, display_name, email, phone, zalo, avatar_url, wallet_credit
            )
          `)
          .eq('pet_id', post.id)
          .order('created_at', { ascending: false });
        
        if (!loadError && data) {
          const withReputation = await Promise.all(
            data.map(async (req) => {
              const { data: rep } = await supabase
                .from('user_reputation')
                .select('*')
                .eq('user_id', req.requester_id)
                .single();
              return { ...req, requester_rep: rep };
            })
          );
          onAdoptionRequestsChange(withReputation);
        }
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Render countdown timers for milestones
  const renderMilestoneCountdown = (request) => {
    if (!request.delivered_at || request.receiver_confirmed_checkin) return null;

    const delivered = new Date(request.delivered_at);
    const now = new Date();
    
    const milestone1d = new Date(delivered.getTime() + 1 * 24 * 60 * 60 * 1000);
    const milestone7d = new Date(delivered.getTime() + 7 * 24 * 60 * 60 * 1000);
    const milestone30d = new Date(delivered.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const getTimeRemaining = (deadline) => {
      const total = Math.max(0, deadline - now);
      const days = Math.floor(total / (1000 * 60 * 60 * 24));
      const hours = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((total % (1000 * 60)) / 1000);
      return { total, days, hours, minutes, seconds };
    };
    
    const time1d = getTimeRemaining(milestone1d);
    const time7d = getTimeRemaining(milestone7d);
    const time30d = getTimeRemaining(milestone30d);
    
    const formatTime = (t) => {
      if (t.total === 0) return '⏱️ HẾT HẠN';
      return `${t.days}d ${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`;
    };
    
    return (
      <div style={{ marginBottom: 12, display: 'grid', gap: 8 }}>
        {[
          { time: time1d, milestone: milestone1d, label: '⏰ Nhiệm vụ 1 ngày' },
          { time: time7d, milestone: milestone7d, label: '⏰ Nhiệm vụ 7 ngày' },
          { time: time30d, milestone: milestone30d, label: '⏰ Nhiệm vụ 30 ngày (Chính thức)' }
        ].map(({ time, milestone, label }, idx) => (
          <div
            key={idx}
            style={{
              padding: 12,
              background: time.total === 0 ? '#fee2e2' : (time.days <= (idx === 2 ? 3 : 1) ? '#fed7aa' : idx === 2 ? '#dcfce7' : '#fef3c7'),
              borderRadius: 8,
              border: time.total === 0 ? '2px solid #ef4444' : (time.days <= (idx === 2 ? 3 : 1) ? '2px solid #f97316' : idx === 2 ? '2px solid #22c55e' : '2px solid #fbbf24')
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: time.total === 0 ? '#991b1b' : (time.days <= (idx === 2 ? 3 : 1) ? '#ea580c' : idx === 2 ? '#166534' : '#92400e'), marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: time.total === 0 ? '#991b1b' : (time.days <= (idx === 2 ? 3 : 1) ? '#ea580c' : idx === 2 ? '#166534' : '#d97706'), fontFamily: 'monospace', lineHeight: 1 }}>
              {formatTime(time)}
            </div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
              Hạn: {milestone.toLocaleString('vi-VN')}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
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
          onClick={onClose}
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
        {post.image_url && (
          <img
            src={post.image_url}
            alt={post.name}
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
              {post.name}
            </h2>
            <span
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 500,
                background: post.status === "available" ? "#dcfce7" : "#fef3c7",
                color: post.status === "available" ? "#166534" : "#92400e",
              }}
            >
              {post.status === "available" ? "Có sẵn" : post.status}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            {post.category === "rescue" && "🚑 Cứu hộ"}
            {post.category === "lost" && "📍 Thất lạc"}
            {post.category === "adopt" && "🏡 Cho nhận"}
            {" • "}
            {post.district || "Chưa rõ khu vực"}
          </div>
        </div>

        {/* Adoption Timeline Stepper - only for adopt posts */}
        {post.category === 'adopt' && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 8, border: '1px solid #93c5fd' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', marginBottom: 8 }}>
              Quy trình adopt • Bước hiện tại: <span style={{ color: '#ea580c' }}>{stepLabel}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
              {steps.map((step, idx) => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: 4,
                    flex: 1
                  }}>
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      borderRadius: '50%', 
                      background: step.id < currentStep ? '#10b981' : step.id === currentStep ? '#f97316' : '#d1d5db',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 14,
                      fontWeight: 700
                    }}>
                      {step.id < currentStep ? '✓' : step.icon}
                    </div>
                    <div style={{ 
                      fontSize: 9, 
                      fontWeight: 600, 
                      color: step.id <= currentStep ? '#374151' : '#9ca3af',
                      textAlign: 'center',
                      whiteSpace: 'nowrap'
                    }}>
                      {step.label}
                    </div>
                  </div>
                  {idx < steps.length - 1 && (
                    <div style={{ 
                      flex: '0 0 8px',
                      height: 2, 
                      background: step.id < currentStep ? '#10b981' : '#d1d5db',
                      marginTop: -16
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Mô tả</h4>
          <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {post.description || "Không có mô tả"}
          </p>
        </div>

        {/* Metadata */}
        <div style={{ marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: "#6b7280", display: "grid", gap: 6 }}>
            <div>
              <strong>Đăng lúc:</strong>{" "}
              {new Date(post.created_at).toLocaleString("vi-VN")}
            </div>
            {post.updated_at && (
              <div>
                <strong>Cập nhật:</strong>{" "}
                {new Date(post.updated_at).toLocaleString("vi-VN")}
              </div>
            )}
          </div>
        </div>

        {/* My Adoption Request Status - For requesters */}
        {myAdoptionRequest && post.owner_id !== user?.id && (
          <div style={{ marginBottom: 16, padding: 16, background: '#f0f9ff', border: '2px solid #3b82f6', borderRadius: 8 }}>
            <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1e40af' }}>
              📋 Tiến trình yêu cầu của bạn
            </h4>

            {/* Status sections based on myAdoptionRequest.status */}
            {myAdoptionRequest.status === 'pending' && (
              <div style={{ padding: 12, background: '#fef3c7', borderRadius: 6, marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 4 }}>⏳ Chờ chủ bài chấp nhận</div>
                <div style={{ fontSize: 13, color: '#78350f' }}>
                  Yêu cầu đã gửi lúc: {new Date(myAdoptionRequest.created_at).toLocaleString('vi-VN')}
                </div>
              </div>
            )}

            {(myAdoptionRequest.status === 'accepted' || myAdoptionRequest.status === 'ready_to_deliver' || myAdoptionRequest.status === 'delivered') && (
              <>
                {myAdoptionRequest.status === 'accepted' && (
                  <div style={{ padding: 12, background: '#dcfce7', borderRadius: 6, marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, color: '#166534', marginBottom: 4 }}>✅ Đã được chấp nhận!</div>
                    <div style={{ fontSize: 13, color: '#14532d' }}>
                      Chấp nhận lúc: {new Date(myAdoptionRequest.accepted_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                )}

                {/* Owner Contact Info */}
                <div style={{ padding: 12, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>📞 Thông tin liên hệ chủ bài:</div>
                  <div style={{ fontSize: 13, color: '#6b7280', display: 'grid', gap: 4 }}>
                    <div>Email: {profile?.email || 'Chưa cập nhật'}</div>
                    <div>SĐT: {profile?.phone || 'Chưa cập nhật'}</div>
                    {profile?.zalo && <div>Zalo: {profile.zalo}</div>}
                  </div>
                </div>

                {/* Meeting Confirmation - only for accepted status */}
                {myAdoptionRequest.status === 'accepted' && (
                  <div style={{ padding: 12, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>✋ Xác nhận hẹn gặp:</div>
                    <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={myAdoptionRequest.receiver_confirmed_meet}
                          onChange={() => onConfirmMeeting(myAdoptionRequest.id, false)}
                        />
                        <span style={{ color: myAdoptionRequest.receiver_confirmed_meet ? '#166534' : '#374151' }}>
                          {myAdoptionRequest.receiver_confirmed_meet ? '✅ Tôi đã hẹn gặp' : 'Tôi đã hẹn gặp với chủ bài'}
                        </span>
                      </label>
                      <div style={{ paddingLeft: 28, color: myAdoptionRequest.owner_confirmed_meet ? '#166534' : '#6b7280' }}>
                        {myAdoptionRequest.owner_confirmed_meet ? '✅ Chủ bài đã xác nhận' : '⏳ Chờ chủ bài xác nhận'}
                      </div>
                    </div>

                    {myAdoptionRequest.receiver_confirmed_meet && myAdoptionRequest.owner_confirmed_meet && (
                      <div style={{ marginTop: 8, padding: 8, background: '#dcfce7', borderRadius: 4, fontSize: 12, color: '#166534', fontWeight: 500 }}>
                        🎉 Cả hai đã xác nhận! Mã giao mèo đã được tạo.
                      </div>
                    )}
                  </div>
                )}

                {/* QR Code - only for ready_to_deliver and beyond */}
                {(myAdoptionRequest.status === 'ready_to_deliver' || myAdoptionRequest.status === 'delivered') && myAdoptionRequest.delivery_token && (
                  <div style={{ padding: 16, background: '#dbeafe', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: 12, fontSize: 16 }}>
                      📱 MÃ XÁC NHẬN NHẬN MÈO
                    </div>
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                      <QRCodeSVG value={myAdoptionRequest.delivery_token} size={140} />
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, letterSpacing: 3, color: '#1e40af', marginBottom: 8 }}>
                      {myAdoptionRequest.delivery_token}
                    </div>
                    <div style={{ fontSize: 13, color: '#1e40af' }}>
                      Đưa mã này cho chủ bài khi nhận mèo
                    </div>
                  </div>
                )}
              </>
            )}

            {myAdoptionRequest.status === 'delivered' && (
              <div style={{ padding: 12, background: '#e0e7ff', borderRadius: 6, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: '#4338ca', marginBottom: 4 }}>🎉 Đã nhận mèo thành công!</div>
                <div style={{ fontSize: 13, color: '#4338ca', marginBottom: 8 }}>
                  Giao lúc: {new Date(myAdoptionRequest.delivered_at).toLocaleString('vi-VN')}
                </div>

                {/* Next Action Block - Requester */}
                {!myAdoptionRequest.receiver_confirmed_checkin && (
                  <div style={{ marginBottom: 12, padding: 14, background: '#fef3c7', borderRadius: 8, border: '2px solid #f59e0b' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
                      🎯 Nhiệm vụ kế tiếp
                    </div>
                    <div style={{ fontSize: 14, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                      <strong>Xác nhận mèo đang ổn</strong> sau {myAdoptionRequest.checkin_days || 30} ngày. Kiểm tra sức khỏe, hành vi, không có vấn đề gì.
                    </div>
                    <button
                      onClick={() => handleReceiverCheckIn(myAdoptionRequest.id)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: '#f59e0b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 15,
                        fontWeight: 700,
                      }}
                    >
                      ✓ Xác nhận hôm nay
                    </button>
                  </div>
                )}

                {myAdoptionRequest.receiver_confirmed_checkin && !myAdoptionRequest.owner_confirmed_checkin && (
                  <div style={{ marginBottom: 12, padding: 14, background: '#dbeafe', borderRadius: 8, border: '2px solid #3b82f6' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#1e40af', marginBottom: 4 }}>
                      ⏳ Chờ chủ bài xác nhận
                    </div>
                    <div style={{ fontSize: 13, color: '#374151' }}>
                      Bạn đã xác nhận. Chủ bài sẽ kiểm tra và xác nhận lại để hoàn tất.
                    </div>
                  </div>
                )}

                {/* Milestone countdown */}
                {renderMilestoneCountdown(myAdoptionRequest)}

                {/* Activity Timeline */}
                <div style={{ marginTop: 12 }}>
                  <AdoptionActivityTimeline adoptionRequestId={myAdoptionRequest.id} />
                </div>
              </div>
            )}

            {myAdoptionRequest.status === 'rejected' && (
              <div style={{ padding: 12, background: '#fee2e2', borderRadius: 6, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>❌ Yêu cầu đã bị từ chối</div>
                <div style={{ fontSize: 13, color: '#7f1d1d' }}>
                  Từ chối lúc: {new Date(myAdoptionRequest.rejected_at).toLocaleString('vi-VN')}
                </div>
              </div>
            )}

            {myAdoptionRequest.status === 'completed' && (
              <div style={{ padding: 12, background: '#dcfce7', borderRadius: 6, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, color: '#166534', marginBottom: 8 }}>✅ Giao dịch hoàn tất!</div>
                <div style={{ fontSize: 13, color: '#14532d', marginBottom: 12 }}>
                  Cảm ơn bạn đã hoàn thành quy trình nhận nuôi thành công.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Next Action Block - Owner View */}
        {post && post.owner_id === user?.id && post.category === 'adopt' && (() => {
          const deliveredReq = adoptionRequests.find(r => r.status === 'delivered');
          if (!deliveredReq) return null;

          const needsReceiverConfirm = !deliveredReq.receiver_confirmed_checkin;
          const needsOwnerConfirm = deliveredReq.receiver_confirmed_checkin && !deliveredReq.owner_confirmed_checkin;
          const allDone = deliveredReq.receiver_confirmed_checkin && deliveredReq.owner_confirmed_checkin;

          if (allDone) return null;

          return (
            <div style={{ marginBottom: 16, padding: 16, background: needsOwnerConfirm ? '#fef3c7' : '#e0f2fe', borderRadius: 8, border: needsOwnerConfirm ? '2px solid #f59e0b' : '2px solid #3b82f6' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: needsOwnerConfirm ? '#92400e' : '#1e40af', marginBottom: 8 }}>
                🎯 Nhiệm vụ kế tiếp
              </div>
              {needsReceiverConfirm && (
                <>
                  <div style={{ fontSize: 14, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                    Chờ người nhận xác nhận mèo đang ổn sau giao. Nếu quá 48h không phản hồi, bạn có thể nhắc hoặc báo admin.
                  </div>
                  <button
                    onClick={() => alert('Tính năng nhắc đang phát triển')}
                    style={{
                      padding: '10px 16px',
                      background: '#3b82f6',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      width: '100%'
                    }}
                  >
                    🔔 Nhắc người nhận
                  </button>
                </>
              )}
              {needsOwnerConfirm && (
                <>
                  <div style={{ fontSize: 14, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                    Người nhận đã xác nhận mèo ổn. Bạn cần xác nhận lại để hoàn tất giao dịch.
                  </div>
                  <button
                    onClick={() => {
                      const reqCard = document.querySelector(`[data-request-id="${deliveredReq.id}"]`);
                      if (reqCard) reqCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    style={{
                      padding: '10px 16px',
                      background: '#f59e0b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      width: '100%'
                    }}
                  >
                    ✓ Xác nhận ngay
                  </button>
                </>
              )}
            </div>
          );
        })()}

        {/* Adoption Requests Section - For owner */}
        {post && post.owner_id === user?.id && (
          <div style={{ marginBottom: 16, border: '2px solid #3b82f6', padding: 12, borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                👥 Người muốn nhận ({adoptionRequests.length})
                {loadingRequests && <span style={{ fontSize: 12, color: '#6b7280' }}>Đang tải...</span>}
              </h4>
            </div>

            {/* Sort Buttons */}
            {adoptionRequests.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {[
                  { id: 'newest', icon: '🕐', label: 'Mới nhất' },
                  { id: 'deposit', icon: '💰', label: 'Cọc cao' },
                  { id: 'reputation', icon: '⭐', label: 'Uy tín' }
                ].map(sortOption => (
                  <button
                    key={sortOption.id}
                    onClick={() => onSortChange(sortOption.id)}
                    style={{
                      padding: '6px 12px',
                      fontSize: 12,
                      borderRadius: 6,
                      border: sortBy === sortOption.id ? '2px solid #3b82f6' : '1px solid #d1d5db',
                      background: sortBy === sortOption.id ? '#dbeafe' : '#fff',
                      color: sortBy === sortOption.id ? '#1e40af' : '#6b7280',
                      cursor: 'pointer',
                      fontWeight: 500,
                    }}
                  >
                    {sortOption.icon} {sortOption.label}
                  </button>
                ))}
              </div>
            )}

            {!loadingRequests && adoptionRequests.length === 0 && (
              <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                Chưa có ai liên hệ nhận
              </div>
            )}

            {/* Adoption Request Cards */}
            {sortedRequests.filter(req => req.status !== 'rejected').map((request) => {
              const isPending = request.status === 'pending';
              const isAccepted = request.status === 'accepted';
              const isReadyToDeliver = request.status === 'ready_to_deliver';
              const isDelivered = request.status === 'delivered';
              const follow = computeFollowupBadge(request);

              const requester = request.requester;
              const depositInfo = deposits[request.requester_id];
              const deposit = depositInfo?.amount || requester?.wallet_credit || 0;
              const okTrades = request.requester_rep?.ok_trades || 0;
              const totalTrades = request.requester_rep?.total_trades || 0;

              return (
                <div
                  key={request.id}
                  data-request-id={request.id}
                  style={{
                    marginBottom: 12,
                    padding: 12,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    background: isAccepted ? '#f0fdf4' : '#fff',
                  }}
                >
                  {/* Requester Info + Stats */}
                  <div style={{ display: 'flex', alignItems: 'start', gap: 8, marginBottom: 10 }}>
                    {requester?.avatar_url && (
                      <img
                        src={requester.avatar_url}
                        alt={requester.display_name}
                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                        {requester?.display_name || 'Người dùng'}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>
                        {new Date(request.created_at).toLocaleString('vi-VN')}
                      </div>

                      {/* Follow-up badge */}
                      {follow.label && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, background: follow.bg, color: follow.color, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                          {follow.label}
                        </div>
                      )}
                      
                      {/* Stats Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12 }}>
                        <div style={{ padding: 6, background: '#f0fdf4', borderRadius: 4, textAlign: 'center' }}>
                          <div style={{ color: '#6b7280', fontSize: 11 }}>Cọc</div>
                          <div style={{ fontWeight: 600, color: '#10b981' }}>
                            {deposit.toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                        <div style={{ padding: 6, background: '#fef3c7', borderRadius: 4, textAlign: 'center' }}>
                          <div style={{ color: '#6b7280', fontSize: 11 }}>Uy tín</div>
                          <div style={{ fontWeight: 600, color: '#f59e0b' }}>
                            ⭐ {okTrades}/{totalTrades}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div style={{ marginBottom: 8 }}>
                    {isPending && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#92400e' }}>⏳ Chờ bạn phản hồi</span>}
                    {isAccepted && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#166534' }}>✅ Đã chấp nhận</span>}
                    {isReadyToDeliver && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#dbeafe', color: '#1e40af' }}>📦 Sẵn sàng giao</span>}
                    {isDelivered && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#e0e7ff', color: '#4338ca' }}>🎉 Đã giao</span>}
                    {request.status === 'completed' && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#166534' }}>✅ Hoàn tất</span>}
                  </div>

                  {/* Contact Info */}
                  {(isAccepted || isReadyToDeliver || isDelivered) && requester && (
                    <div style={{ padding: 8, background: '#f0fdf4', borderRadius: 6, marginBottom: 8, fontSize: 13 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>📞 Thông tin liên hệ:</div>
                      <div>Email: {requester.email || 'Chưa cập nhật'}</div>
                      <div>SĐT: {requester.phone || 'Chưa cập nhật'}</div>
                      {requester.zalo && <div>Zalo: {requester.zalo}</div>}
                    </div>
                  )}

                  {/* Meeting Confirmation for owner */}
                  {isAccepted && (
                    <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 6, marginBottom: 8, fontSize: 13, border: '1px solid #93c5fd' }}>
                      <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e40af' }}>✋ Xác nhận hẹn gặp:</div>
                      <div style={{ display: 'grid', gap: 6 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={request.owner_confirmed_meet || false}
                            onChange={() => onConfirmMeeting(request.id, true)}
                          />
                          <span style={{ color: request.owner_confirmed_meet ? '#166534' : '#374151', fontWeight: 500 }}>
                            {request.owner_confirmed_meet ? '✅ Tôi đã xác nhận' : 'Tôi đã xác nhận hẹn gặp'}
                          </span>
                        </label>
                        <div style={{ paddingLeft: 28, color: request.receiver_confirmed_meet ? '#166534' : '#6b7280', fontSize: 12 }}>
                          {request.receiver_confirmed_meet ? '✅ Người nhận đã xác nhận' : '⏳ Chờ người nhận xác nhận'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Check-in section for delivered requests */}
                  {isDelivered && (() => {
                    const due = request.checkin_required_at ? new Date(request.checkin_required_at) : null;
                    const now = new Date();
                    const daysLeft = due ? Math.ceil((due - now) / (1000 * 60 * 60 * 24)) : null;
                    const overdue = due && now > due;

                    return (
                      <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 6, marginBottom: 8, fontSize: 12, border: '1px solid #93c5fd' }}>
                        <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e40af' }}>📋 Nhiệm vụ sau khi giao mèo</div>
                        
                        {/* Countdown */}
                        {due && (
                          <div style={{ marginBottom: 8, padding: 16, background: overdue ? '#fee2e2' : (daysLeft <= 3 ? '#fed7aa' : '#fef3c7'), borderRadius: 8, border: overdue ? '3px solid #ef4444' : (daysLeft <= 3 ? '2px solid #f97316' : '2px solid #fbbf24'), textAlign: 'center' }}>
                            <div style={{ fontSize: 42, fontWeight: 900, color: overdue ? '#991b1b' : (daysLeft <= 3 ? '#ea580c' : '#d97706'), marginBottom: 8, lineHeight: 1 }}>
                              {overdue ? '🟥 QUÁ HẠN' : `⏰ ${daysLeft}`}
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: overdue ? '#991b1b' : (daysLeft <= 3 ? '#ea580c' : '#d97706'), marginBottom: 6 }}>
                              {overdue ? '' : 'NGÀY CÒN LẠI'}
                            </div>
                          </div>
                        )}

                        {/* Progress checklist */}
                        <div style={{ marginBottom: 10, padding: 10, background: '#fff', borderRadius: 6, display: 'grid', gap: 6, fontSize: 11 }}>
                          <div style={{ fontWeight: 600, marginBottom: 4, color: '#374151' }}>Tiến trình xác nhận:</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 16 }}>{request.receiver_confirmed_checkin ? '✅' : '⏳'}</span>
                            <span style={{ color: request.receiver_confirmed_checkin ? '#166534' : '#6b7280' }}>
                              <strong>{requester?.display_name || 'Người nhận'}</strong>: {request.receiver_confirmed_checkin ? 'Đã xác nhận' : 'Chưa xác nhận'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 16 }}>{request.owner_confirmed_checkin ? '✅' : '⏳'}</span>
                            <span style={{ color: request.owner_confirmed_checkin ? '#166534' : '#6b7280' }}>
                              <strong>Bạn (chủ bài)</strong>: {request.owner_confirmed_checkin ? 'Đã xác nhận' : 'Chưa xác nhận'}
                            </span>
                          </div>
                        </div>

                        {/* Remind button */}
                        {!request.receiver_confirmed_checkin && (
                          <button
                            onClick={async () => {
                              try {
                                await sendOwnerReminderEmail({
                                  adoptionId: request.id,
                                  petName: post?.name || 'mèo',
                                  ownerName: profile?.display_name || 'Chủ bài',
                                  receiverName: requester?.display_name || 'Bạn',
                                  receiverEmail: requester?.email || ''
                                });
                                alert('Đã gửi nhắc tới người nhận!');
                              } catch (err) {
                                alert('Lỗi: ' + err.message);
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              background: '#f59e0b',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 500,
                              marginBottom: 8
                            }}
                          >
                            🔔 Nhắc người nhận
                          </button>
                        )}

                        {/* Owner confirm button */}
                        <button
                          disabled={request.owner_confirmed_checkin || !request.receiver_confirmed_checkin}
                          onClick={() => handleOwnerCheckIn(request.id)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: request.owner_confirmed_checkin ? '#e5e7eb' : (!request.receiver_confirmed_checkin ? '#9ca3af' : '#10b981'),
                            color: request.owner_confirmed_checkin ? '#6b7280' : (!request.receiver_confirmed_checkin ? '#f3f4f6' : '#fff'),
                            border: 'none',
                            borderRadius: 6,
                            cursor: (request.owner_confirmed_checkin || !request.receiver_confirmed_checkin) ? 'not-allowed' : 'pointer',
                            fontSize: 12,
                            fontWeight: 500,
                            opacity: (!request.receiver_confirmed_checkin && !request.owner_confirmed_checkin) ? 0.6 : 1
                          }}
                        >
                          {request.owner_confirmed_checkin ? '✅ Bạn đã xác nhận' : request.receiver_confirmed_checkin ? '✓ Xác nhận hoàn thành' : '🔒 Chờ người nhận xác nhận trước'}
                        </button>
                      </div>
                    );
                  })()}

                  {/* Action Buttons */}
                  {isPending && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button
                        onClick={() => onAcceptRequest(request.id)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        ✓ Chấp nhận
                      </button>
                      <button
                        onClick={() => onRejectRequest(request.id)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        ✗ Từ chối
                      </button>
                    </div>
                  )}

                  {(isAccepted || isReadyToDeliver) && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      {isReadyToDeliver && (
                        <button
                          onClick={() => onScanDelivery(request.id)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: '#06b6d4',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 500,
                          }}
                        >
                          📱 Quét mã ✓
                        </button>
                      )}
                      <button
                        onClick={() => onOwnerCancelRequest(request.id)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: '#f97316',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        ⛔ Hủy & chọn lại
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
