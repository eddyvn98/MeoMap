import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../../supabaseClient';

/**
 * MyAdoptionsTab - User's adoption requests list
 */
export function MyAdoptionsTab({
  adoptionRequests,
  user,
  activeTab,
  onAdoptionRequestsChange,
}) {
  const handleConfirmMeet = async (request) => {
    try {
      const currentValue = request.receiver_confirmed_meet || false;
      const newValue = !currentValue;

      const { error: updateError } = await supabase
        .from('adoption_requests')
        .update({ receiver_confirmed_meet: newValue })
        .eq('id', request.id);
      
      if (updateError) throw updateError;

      if (!newValue && (request.status === 'ready_to_deliver' || request.status === 'accepted')) {
        const { error: resetError } = await supabase
          .from('adoption_requests')
          .update({
            status: 'pending',
            delivery_token: null,
            token_generated_at: null,
            owner_confirmed_meet: false,
            receiver_confirmed_meet: false
          })
          .eq('id', request.id);

        if (resetError) throw resetError;
        alert('Đã hủy xác nhận. Quy trình reset từ đầu.');
      } else if (newValue) {
        const { data: updatedRequest, error: fetchError } = await supabase
          .from('adoption_requests')
          .select('*')
          .eq('id', request.id)
          .single();

        if (fetchError) throw fetchError;

        if (updatedRequest.receiver_confirmed_meet && updatedRequest.owner_confirmed_meet && !updatedRequest.delivery_token) {
          const token = Math.random().toString(36).substr(2, 9).toUpperCase();
          
          const { error: tokenError } = await supabase
            .from('adoption_requests')
            .update({
              status: 'ready_to_deliver',
              delivery_token: token,
              token_generated_at: new Date().toISOString()
            })
            .eq('id', request.id);

          if (tokenError) throw tokenError;
          alert('Đã xác nhận hẹn gặp! Token giao mèo đã được tạo.');
        } else {
          alert('Đã xác nhận. Chờ chủ bài xác nhận để tạo mã giao.');
        }
      }

      // Reload
      if (user && activeTab === 'my-adoptions') {
        const { data } = await supabase
          .from('adoption_requests')
          .select(`
            *,
            pet:pets(id, name, district),
            owner:profiles!owner_id(id, display_name, email, phone, zalo, avatar_url)
          `)
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false });
        onAdoptionRequestsChange(data || []);
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleCancelRequest = async (request) => {
    if (!confirm('Hủy yêu cầu này? Bạn sẽ phải yêu cầu lại từ đầu.')) return;
    try {
      const { error } = await supabase
        .from('adoption_requests')
        .update({ 
          status: 'pending',
          receiver_confirmed_meet: false,
          receiver_confirmed_at: null,
          owner_confirmed_meet: false,
          owner_confirmed_at: null,
          delivery_token: null,
          token_generated_at: null,
        })
        .eq('id', request.id);
      
      if (error) throw error;
      alert('Đã hủy yêu cầu. Bạn có thể yêu cầu lại từ đầu.');
      
      if (user && activeTab === 'my-adoptions') {
        const { data } = await supabase
          .from('adoption_requests')
          .select(`
            *,
            pet:pets(id, name, district),
            owner:profiles!owner_id(id, display_name, email, phone, zalo, avatar_url)
          `)
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false });
        onAdoptionRequestsChange(data || []);
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const statusMap = {
    pending: { icon: "⏳", label: "Chờ chấp nhận", color: "#92400e", bg: "#fef3c7" },
    accepted: { icon: "✅", label: "Đã chấp nhận", color: "#166534", bg: "#dcfce7" },
    ready_to_deliver: { icon: "📦", label: "Sẵn sàng giao", color: "#1e40af", bg: "#dbeafe" },
    delivered: { icon: "🎉", label: "Đã giao", color: "#4338ca", bg: "#e0e7ff" },
    rejected: { icon: "❌", label: "Từ chối", color: "#991b1b", bg: "#fee2e2" },
    cancelled: { icon: "⛔", label: "Đã hủy", color: "#6b7280", bg: "#f3f4f6" },
  };

  return (
    <div style={{ padding: "12px 0", color: "#374151", fontSize: 14, display: "grid", gap: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
        🐾 Mèo đang đặt cọc nhận
      </div>

      {!adoptionRequests || adoptionRequests.length === 0 ? (
        <div style={{ 
          padding: 16, 
          background: "#f9fafb", 
          borderRadius: 8, 
          textAlign: "center", 
          color: "#6b7280" 
        }}>
          <p>Bạn chưa có yêu cầu nhận mèo nào</p>
        </div>
      ) : (
        adoptionRequests.map((request) => {
          const status = statusMap[request.status] || statusMap.pending;
          const isAccepted = request.status === 'accepted';
          const isReadyToDeliver = request.status === 'ready_to_deliver';
          const bothConfirmed = request.receiver_confirmed_meet && request.owner_confirmed_meet;

          return (
            <div
              key={request.id}
              style={{
                padding: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                background: "#fff",
                display: "grid",
                gap: 10,
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                    {request.pet?.name || "Mèo"}
                  </h4>
                  <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                    📍 {request.pet?.district || "Chưa rõ"}
                  </p>
                </div>
                <span style={{
                  padding: "4px 8px",
                  background: status.bg,
                  color: status.color,
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}>
                  {status.icon} {status.label}
                </span>
              </div>

              {/* Info */}
              <div style={{ fontSize: 12, color: "#6b7280", display: "grid", gap: 3 }}>
                <div>👤 Chủ: {request.owner?.display_name || "?"}</div>
                <div>📅 Gửi: {new Date(request.created_at).toLocaleDateString("vi-VN")}</div>
                {request.accepted_at && (
                  <div>✅ Chấp nhận: {new Date(request.accepted_at).toLocaleDateString("vi-VN")}</div>
                )}
              </div>

              {/* Owner Contact Info */}
              {isAccepted && request.owner && (
                <div style={{
                  padding: 10,
                  background: "#f0fdf4",
                  borderRadius: 6,
                  fontSize: 12,
                  borderLeft: "3px solid #10b981",
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 6, color: "#166534" }}>📞 Liên hệ chủ bài:</div>
                  <div style={{ color: "#6b7280", display: "grid", gap: 2 }}>
                    {request.owner.email && <div>📧 {request.owner.email}</div>}
                    {request.owner.phone && <div>☎️ {request.owner.phone}</div>}
                    {request.owner.zalo && <div>💬 {request.owner.zalo}</div>}
                  </div>
                </div>
              )}

              {/* Meeting Confirmation */}
              {isAccepted && (
                <div style={{
                  padding: 10,
                  background: "#f0f9ff",
                  borderRadius: 6,
                  fontSize: 12,
                  borderLeft: "3px solid #3b82f6",
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>✋ Xác nhận hẹn gặp:</div>
                  <div style={{ display: "grid", gap: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={request.receiver_confirmed_meet || false}
                        onChange={() => handleConfirmMeet(request)}
                      />
                      <span style={{ color: request.receiver_confirmed_meet ? "#166534" : "#374151" }}>
                        {request.receiver_confirmed_meet ? "✅ Tôi đã xác nhận" : "Tôi đã xác nhận hẹn gặp"}
                      </span>
                    </label>
                    <div style={{ paddingLeft: 28, fontSize: 11, color: request.owner_confirmed_meet ? "#166534" : "#6b7280" }}>
                      {request.owner_confirmed_meet ? "✅ Chủ bài đã xác nhận" : "⏳ Chờ chủ bài xác nhận"}
                    </div>
                  </div>
                </div>
              )}

              {/* QR Code */}
              {isReadyToDeliver && bothConfirmed && request.delivery_token && (
                <div style={{
                  padding: 12,
                  background: "#dbeafe",
                  borderRadius: 6,
                  textAlign: "center",
                  borderLeft: "3px solid #1e40af",
                }}>
                  <div style={{ fontWeight: 600, color: "#1e40af", marginBottom: 8, fontSize: 12 }}>
                    📱 MÃ XÁC NHẬN NHẬN MÈO
                  </div>
                  <div style={{ marginBottom: 8, display: "flex", justifyContent: "center" }}>
                    <QRCodeSVG value={request.delivery_token} size={100} />
                  </div>
                  <div style={{ 
                    fontFamily: "monospace", 
                    fontSize: 14, 
                    fontWeight: 700, 
                    letterSpacing: 2, 
                    color: "#1e40af", 
                    marginBottom: 6,
                    wordBreak: "break-all"
                  }}>
                    {request.delivery_token}
                  </div>
                  <div style={{ fontSize: 11, color: "#1e40af" }}>
                    Cho chủ bài quét để xác nhận đã giao mèo
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {request.status !== 'delivered' && request.status !== 'rejected' && request.status !== 'cancelled' && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                  {isAccepted && !request.receiver_confirmed_meet && (
                    <button
                      onClick={() => handleConfirmMeet(request)}
                      style={{
                        padding: "8px 12px",
                        background: "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      ✋ Xác nhận gặp
                    </button>
                  )}
                  <button
                    onClick={() => handleCancelRequest(request)}
                    style={{
                      padding: "8px 12px",
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ❌ Hủy
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

