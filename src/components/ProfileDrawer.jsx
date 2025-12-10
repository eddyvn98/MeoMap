import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { QRCodeSVG } from "qrcode.react";
import PostsSection from "./PostsSection";
import { sendDeliveryNotification, sendOwnerReminderEmail } from "../services/emailService";
import AdoptionActivityTimeline from "./AdoptionActivityTimeline";

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
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedPost, setSelectedPost] = useState(null);
  const [adoptionRequests, setAdoptionRequests] = useState([]);
  const [myAdoptionRequest, setMyAdoptionRequest] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [sortBy, setSortBy] = useState('newest'); // newest, deposit, reputation, distance
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanRequestId, setScanRequestId] = useState(null);
  const [scanInput, setScanInput] = useState('');
  const [scanError, setScanError] = useState('');
  const [pendingTasks, setPendingTasks] = useState([]);
  const [countdownTick, setCountdownTick] = useState(0);

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownTick(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
  const headerRef = useRef(null);
  const drawerRef = useRef(null);
  const lastFocusedElement = useRef(null);

  const drawerWidth = useMemo(() => WIDTH_MAP[widthMode] || WIDTH_MAP.normal, [widthMode]);

  // Keep activeTab in sync with initialTab when reopen
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Responsive breakpoint switcher
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load user + profile when panel opens
  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        if (!userData?.user) {
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }
        setUser(userData.user);
        const { data: profileData, error: profileErr } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, phone, zalo, email, wallet_credit, role, created_at")
          .eq("id", userData.user.id)
          .single();
        if (profileErr) throw profileErr;
        setProfile(profileData);

        // Load pending tasks
        const { data: tasks } = await supabase
          .from('adoption_requests')
          .select('id, pet_id, status, receiver_confirmed_checkin, checkin_required_at, pets(name)')
          .eq('requester_id', userData.user.id)
          .eq('status', 'delivered');
        setPendingTasks((tasks || []).filter(r => !r.receiver_confirmed_checkin));
      } catch (err) {
        console.error("Load profile failed", err);
        setError(err?.message || "Không thể tải hồ sơ");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [isOpen]);

  // Load adoption requests when viewing post detail
  useEffect(() => {
    if (!selectedPost) return;
    
    const loadRequests = async () => {
      setLoadingRequests(true);
      try {
        // Load all requests for this pet (if owner)
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
        
        if (error) throw error;
        console.log('Loaded adoption requests:', data);
        
        // Load reputation scores separately
        if (data && data.length > 0) {
          const requesterIds = data.map(r => r.requester_id);
          const { data: repData, error: repError } = await supabase
            .from('user_reputation')
            .select('*')
            .in('user_id', requesterIds);
          
          if (repError) console.warn('Load reputation failed:', repError);
          
          // Merge reputation data into requests
          const repMap = {};
          repData?.forEach(rep => {
            repMap[rep.user_id] = rep;
          });
          
          data.forEach(req => {
            req.requester_rep = repMap[req.requester_id] || { ok_trades: 0, bad_trades: 0, total_trades: 0 };
          });
        }
        
        setAdoptionRequests(data || []);

        // Also check if current user has a request for this pet
        if (user) {
          const myRequest = data?.find(r => r.requester_id === user.id);
          setMyAdoptionRequest(myRequest || null);
        }
      } catch (err) {
        console.error('Load adoption requests failed:', err);
        setAdoptionRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    };

    loadRequests();
  }, [selectedPost, user, activeTab]);

  // Load user's own adoption requests (for "my-adoptions" tab)
  useEffect(() => {
    if (!user || !isOpen) return;

    const loadMyRequests = async () => {
      try {
        const { data, error } = await supabase
          .from('adoption_requests')
          .select(`
            *,
            pet:pets(id, name, district),
            owner:profiles!owner_id(id, display_name, email, phone, zalo, avatar_url)
          `)
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAdoptionRequests(data || []);
      } catch (err) {
        console.error('Load user adoption requests failed:', err);
        setAdoptionRequests([]);
      }
    };

    // Only load when on "my-adoptions" tab and no selectedPost
    if (!selectedPost && activeTab === 'my-adoptions') {
      loadMyRequests();
    }
  }, [user, isOpen, activeTab, selectedPost]);

  // Sort adoption requests
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

  // Get sorted requests
  const sortedRequests = getSortedRequests();

  // Accept adoption request
  const handleAcceptRequest = async (requestId) => {
    try {
      const { error } = await supabase
        .from('adoption_requests')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString() 
        })
        .eq('id', requestId);
      
      if (error) throw error;
      
      alert('Đã chấp nhận yêu cầu!');
      
      // Reload adoption requests
      if (selectedPost) {
        try {
          const { data, error: loadError } = await supabase
            .from('adoption_requests')
            .select(`
              *,
              requester:profiles!requester_id(
                id, display_name, email, phone, zalo, avatar_url, wallet_credit
              )
            `)
            .eq('pet_id', selectedPost.id)
            .order('created_at', { ascending: false });
          
          if (!loadError) {
            // Load reputation scores
            if (data && data.length > 0) {
              const requesterIds = data.map(r => r.requester_id);
              const { data: repData } = await supabase
                .from('user_reputation')
                .select('*')
                .in('user_id', requesterIds);
              
              const repMap = {};
              repData?.forEach(rep => {
                repMap[rep.user_id] = rep;
              });
              
              data.forEach(req => {
                req.requester_rep = repMap[req.requester_id] || { ok_trades: 0, bad_trades: 0, total_trades: 0 };
              });
            }
            setAdoptionRequests(data || []);
          }
        } catch (err) {
          console.error('Reload adoption requests failed:', err);
        }
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Reject adoption request
  const handleRejectRequest = async (requestId) => {
    if (!confirm('Từ chối yêu cầu này?')) return;
    
    try {
      const { error } = await supabase
        .from('adoption_requests')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('id', requestId);
      
      if (error) throw error;
      
      alert('Đã từ chối yêu cầu');
      
      // Reload adoption requests
      if (selectedPost) {
        try {
          const { data, error: loadError } = await supabase
            .from('adoption_requests')
            .select(`
              *,
              requester:profiles!requester_id(
                id, display_name, email, phone, zalo, avatar_url, wallet_credit
              )
            `)
            .eq('pet_id', selectedPost.id)
            .order('created_at', { ascending: false });
          
          if (!loadError) {
            // Load reputation scores
            if (data && data.length > 0) {
              const requesterIds = data.map(r => r.requester_id);
              const { data: repData } = await supabase
                .from('user_reputation')
                .select('*')
                .in('user_id', requesterIds);
              
              const repMap = {};
              repData?.forEach(rep => {
                repMap[rep.user_id] = rep;
              });
              
              data.forEach(req => {
                req.requester_rep = repMap[req.requester_id] || { ok_trades: 0, bad_trades: 0, total_trades: 0 };
              });
            }
            setAdoptionRequests(data || []);
          }
        } catch (err) {
          console.error('Reload adoption requests failed:', err);
        }
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Cancel accepted adoption request (owner can cancel after accepting)
  const handleOwnerCancelRequest = async (requestId) => {
    if (!confirm('Hủy yêu cầu này? Token giao mèo sẽ bị thu hồi và chuyển sang người khác.')) return;
    
    try {
      const { error } = await supabase
        .from('adoption_requests')
        .update({ 
          status: 'pending',
          owner_confirmed_meet: false,
          owner_confirmed_at: null,
          delivery_token: null,
          token_generated_at: null,
        })
        .eq('id', requestId);
      
      if (error) throw error;
      
      alert('Đã hủy yêu cầu. Token được phát hành lại cho người khác.');
      
      // Reload adoption requests
      if (selectedPost) {
        try {
          const { data, error: loadError } = await supabase
            .from('adoption_requests')
            .select(`
              *,
              requester:profiles!requester_id(
                id, display_name, email, phone, zalo, avatar_url, wallet_credit
              )
            `)
            .eq('pet_id', selectedPost.id)
            .order('created_at', { ascending: false });
          
          if (!loadError) {
            // Load reputation scores
            if (data && data.length > 0) {
              const requesterIds = data.map(r => r.requester_id);
              const { data: repData } = await supabase
                .from('user_reputation')
                .select('*')
                .in('user_id', requesterIds);
              
              const repMap = {};
              repData?.forEach(rep => {
                repMap[rep.user_id] = rep;
              });
              
              data.forEach(req => {
                req.requester_rep = repMap[req.requester_id] || { ok_trades: 0, bad_trades: 0, total_trades: 0 };
              });
            }
            setAdoptionRequests(data || []);
          }
        } catch (err) {
          console.error('Reload adoption requests failed:', err);
        }
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Confirm meeting
  const handleConfirmMeeting = async (requestId, isOwner) => {
    try {
      // Get current request state
      const { data: currentRequest, error: fetchError } = await supabase
        .from('adoption_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      const field = isOwner ? 'owner_confirmed_meet' : 'receiver_confirmed_meet';
      const currentValue = currentRequest[field];
      const newValue = !currentValue; // Toggle

      // Update confirmation flag
      const { error: updateError } = await supabase
        .from('adoption_requests')
        .update({ 
          [field]: newValue
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If unchecking (newValue = false), need to reset completely to pending
      if (!newValue && (currentRequest.status === 'ready_to_deliver' || currentRequest.status === 'accepted')) {
        const { error: resetError } = await supabase
          .from('adoption_requests')
          .update({
            status: 'pending',
            delivery_token: null,
            token_generated_at: null,
            owner_confirmed_meet: false,
            receiver_confirmed_meet: false
          })
          .eq('id', requestId);

        if (resetError) throw resetError;
        alert('Đã hủy xác nhận. Quy trình reset từ đầu.');
      } else if (newValue) {
        // Checking - update the confirmation timestamp
        const dateField = isOwner ? 'owner_confirmed_at' : 'receiver_confirmed_at';
        const { error: dateError } = await supabase
          .from('adoption_requests')
          .update({ 
            [dateField]: new Date().toISOString()
          })
          .eq('id', requestId);

        if (dateError) throw dateError;

        // Check if BOTH have confirmed now - if so, generate token and set status
        const { data: updatedRequest, error: recheckError } = await supabase
          .from('adoption_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (recheckError) throw recheckError;

        // If both confirmed and no token yet, generate token and set status to ready_to_deliver
        if (updatedRequest.receiver_confirmed_meet && updatedRequest.owner_confirmed_meet && !updatedRequest.delivery_token) {
          const token = Math.random().toString(36).substr(2, 9).toUpperCase();
          
          const { error: tokenError } = await supabase
            .from('adoption_requests')
            .update({
              status: 'ready_to_deliver',
              delivery_token: token,
              token_generated_at: new Date().toISOString()
            })
            .eq('id', requestId);

          if (tokenError) throw tokenError;
          alert('Đã xác nhận hẹn gặp! Token giao mèo đã được tạo.');
        } else {
          alert('Đã xác nhận. Chờ người kia xác nhận để tạo mã giao.');
        }
      }
      
      // Reload adoption requests
      if (selectedPost) {
        try {
          const { data, error: loadError } = await supabase
            .from('adoption_requests')
            .select(`
              *,
              requester:profiles!requester_id(
                id, display_name, email, phone, zalo, avatar_url, wallet_credit
              )
            `)
            .eq('pet_id', selectedPost.id)
            .order('created_at', { ascending: false });
          
          if (!loadError) {
            // Load reputation scores
            if (data && data.length > 0) {
              const requesterIds = data.map(r => r.requester_id);
              const { data: repData } = await supabase
                .from('user_reputation')
                .select('*')
                .in('user_id', requesterIds);
              
              const repMap = {};
              repData?.forEach(rep => {
                repMap[rep.user_id] = rep;
              });
              
              data.forEach(req => {
                req.requester_rep = repMap[req.requester_id] || { ok_trades: 0, bad_trades: 0, total_trades: 0 };
              });
            }
            setAdoptionRequests(data || []);
          }
        } catch (err) {
          console.error('Reload adoption requests failed:', err);
        }
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!scanInput.trim()) {
      setScanError('Vui lòng nhập hoặc quét mã');
      return;
    }

    try {
      setScanError('');
      
      // Parse token từ input (có thể là plain token hoặc JSON từ QR)
      let token = scanInput.trim();
      try {
        const parsed = JSON.parse(scanInput);
        token = parsed.delivery_token || scanInput.trim();
      } catch {
        // Nếu không parse được JSON, dùng giá trị nhập vào
      }

      // Tìm adoption request với delivery_token này
      const { data: request, error: reqErr } = await supabase
        .from('adoption_requests')
        .select('*')
        .eq('delivery_token', token)
        .eq('id', scanRequestId)
        .single();

      if (reqErr || !request) {
        setScanError('Mã không khớp với yêu cầu này');
        return;
      }

      // Xác nhận đã giao - set status = delivered
      const checkInDays = 30;
      const checkInDueDate = new Date();
      checkInDueDate.setDate(checkInDueDate.getDate() + checkInDays);
      
      const { error: updateErr } = await supabase
        .from('adoption_requests')
        .update({ 
          status: 'delivered',
          delivered_at: new Date().toISOString(),
          checkin_required_at: checkInDueDate.toISOString(),
          checkin_days: checkInDays
        })
        .eq('id', scanRequestId);

      if (updateErr) throw updateErr;

      // Send delivery notification email to receiver
      try {
        const adoptionData = {
          adoptionId: scanRequestId,
          petName: selectedPost?.name || 'mèo của bạn',
          ownerName: profile?.display_name || 'Chủ bài',
          receiverName: request.requester?.display_name || 'Bạn',
          receiverEmail: request.requester?.email || ''
        };
        await sendDeliveryNotification(adoptionData);
      } catch (emailErr) {
        console.error('Error sending delivery notification:', emailErr);
        // Continue anyway - email failure shouldn't block the delivery
      }

      alert('Đã xác nhận giao mèo thành công!');
      setScanInput('');
      setScanRequestId(null);
      setShowScanModal(false);

      // Reload adoption requests
      if (selectedPost) {
        try {
          const { data: updated, error: loadErr } = await supabase
            .from('adoption_requests')
            .select(`
              *,
              requester:profiles!requester_id(
                id, display_name, email, phone, zalo, avatar_url, wallet_credit
              )
            `)
            .eq('pet_id', selectedPost.id)
            .order('created_at', { ascending: false });
          
          if (!loadErr && updated) {
            // Merge with reputation data
            const withReputation = await Promise.all(
              updated.map(async (req) => {
                const { data: rep } = await supabase
                  .from('user_reputation')
                  .select('*')
                  .eq('user_id', req.requester_id)
                  .single();
                return { ...req, requester_rep: rep };
              })
            );
            setAdoptionRequests(withReputation);
          }
        } catch (err) {
          console.error('Reload error:', err);
        }
      }

      // If current user is the requester, refresh myAdoptionRequest so they see check-in button
      try {
        const { data: mine } = await supabase
          .from('adoption_requests')
          .select('*')
          .eq('id', requestId)
          .single();
        if (mine && mine.requester_id === user?.id) {
          setMyAdoptionRequest(mine);
        }
      } catch (err) {
        console.error('Reload myAdoptionRequest error:', err);
      }
    } catch (err) {
      setScanError('Lỗi: ' + err.message);
    }
  };

  // Focus trap + return focus on close
  useEffect(() => {
    if (!isOpen) return;

    // Save currently focused element
    lastFocusedElement.current = document.activeElement;

    // Focus drawer header
    const timer = setTimeout(() => {
      headerRef.current?.focus?.();
    }, 50);

    // Focus trap logic
    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      const drawer = drawerRef.current;
      if (!drawer) return;

      const focusableElements = drawer.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleTabKey);
      
      // Return focus to trigger or last focused element
      if (triggerRef?.current) {
        triggerRef.current.focus?.();
      } else if (lastFocusedElement.current && lastFocusedElement.current !== document.body) {
        lastFocusedElement.current.focus?.();
      }
    };
  }, [isOpen, triggerRef]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const renderTabContent = () => {
    if (!user) {
      return (
        <div style={{ padding: "16px 0", color: "#4b5563", fontSize: 14 }}>
          Vui lòng đăng nhập để xem trang cá nhân.
        </div>
      );
    }

    if (activeTab === "overview") {
      return (
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: "#f9fafb",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Thông tin</div>
            <div style={{ fontSize: 13, color: "#374151", display: "grid", gap: 4 }}>
              <div>Tên: {profile?.display_name || "Chưa cập nhật"}</div>
              <div>Email: {profile?.email || "Chưa cập nhật"}</div>
              <div>Điện thoại: {profile?.phone || "Chưa cập nhật"}</div>
              <div>Zalo: {profile?.zalo || "Chưa cập nhật"}</div>
              <div>Vai trò: {profile?.role || "user"}</div>
              <div>Ví hiện tại: {profile?.wallet_credit ?? 0} đ</div>
            </div>
          </div>

          {/* Task List Section */}
          {pendingTasks.length > 0 && (
            <div
              style={{
                padding: 12,
                border: "2px solid #fbbf24",
                borderRadius: 10,
                background: "#fffbeb",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#92400e" }}>
                📌 Nhiệm vụ adopt còn lại ({pendingTasks.length})
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {pendingTasks.map(task => {
                  const due = task.checkin_required_at ? new Date(task.checkin_required_at) : null;
                  const overdue = due && new Date() > due;
                  return (
                    <div key={task.id} style={{ padding: 10, background: overdue ? '#fee2e2' : '#fff', borderRadius: 6, border: '1px solid #d1d5db' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: overdue ? '#991b1b' : '#374151' }}>
                        {task.pets?.name || 'Mèo'} - {overdue ? '🟥 Quá hạn' : '🟧 Chờ xác nhận'}
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('my-adoptions');
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 12px',
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                      >
                        ✓ Xác nhận ngay
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div
            style={{
              padding: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              background: "#fff",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600 }}>Tác vụ nhanh</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
              {[
                { label: "Đăng mèo", action: () => alert("Tính năng đang phát triển") },
                { label: "Báo cáo", action: () => alert("Tính năng đang phát triển") },
                { label: "Bài đăng", action: () => setActiveTab("posts") },
                { label: "Cài đặt", action: () => setActiveTab("settings") },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#f3f4f6",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "posts") {
      return (
        <PostsSection
          userId={user?.id}
          bbox={mapBbox}
          onEdit={(post) => {
            alert(`Chỉnh sửa bài: ${post.name}`);
          }}
          onDelete={(post) => {
            if (confirm(`Xóa bài ${post.name}?`)) {
              // TODO: Call delete API and invalidate React Query cache
              alert('Xóa bài thành công (TODO: implement API call)');
            }
          }}
          onShowQR={(post) => {
            alert(`Hiện QR cho bài: ${post.name}`);
          }}
          onEnterToken={(post) => {
            const token = prompt("Nhập token:");
            if (token) {
              alert(`Gửi token cho bài: ${post.name}`);
              // TODO: Call API with token
            }
          }}
          onViewDetail={(post) => {
            setSelectedPost(post);
          }}
        />
      );
    }

    if (activeTab === "my-adoptions") {
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
              const statusMap = {
                pending: { icon: "⏳", label: "Chờ chấp nhận", color: "#92400e", bg: "#fef3c7" },
                accepted: { icon: "✅", label: "Đã chấp nhận", color: "#166534", bg: "#dcfce7" },
                ready_to_deliver: { icon: "📦", label: "Sẵn sàng giao", color: "#1e40af", bg: "#dbeafe" },
                delivered: { icon: "🎉", label: "Đã giao", color: "#4338ca", bg: "#e0e7ff" },
                rejected: { icon: "❌", label: "Từ chối", color: "#991b1b", bg: "#fee2e2" },
                cancelled: { icon: "⛔", label: "Đã hủy", color: "#6b7280", bg: "#f3f4f6" },
              };
              const status = statusMap[request.status] || statusMap.pending;
              const isAccepted = request.status === 'accepted';
              const isReadyToDeliver = request.status === 'ready_to_deliver';
              const bothConfirmed = request.receiver_confirmed_meet && request.owner_confirmed_meet;

              const handleConfirmMeet = async () => {
                try {
                  const currentValue = request.receiver_confirmed_meet || false;
                  const newValue = !currentValue; // Toggle

                  // Update confirmation flag
                  const { error: updateError } = await supabase
                    .from('adoption_requests')
                    .update({ receiver_confirmed_meet: newValue })
                    .eq('id', request.id);
                  
                  if (updateError) throw updateError;

                  // If unchecking (newValue = false), reset completely to pending
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
                    // Checking - check if both confirmed now
                    const { data: updatedRequest, error: fetchError } = await supabase
                      .from('adoption_requests')
                      .select('*')
                      .eq('id', request.id)
                      .single();

                    if (fetchError) throw fetchError;

                    // If both confirmed and no token yet, generate token and set status
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

                  // Reload adoption requests
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
                    setAdoptionRequests(data || []);
                  }
                } catch (err) {
                  alert('Lỗi: ' + err.message);
                }
              };

              const handleCancelRequest = async () => {
                if (!confirm('Hủy yêu cầu này? Bạn sẽ phải yêu cầu lại từ đầu.')) return;
                try {
                  // Reset về pending state - có thể yêu cầu lại
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
                  // Reload adoption requests
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
                    setAdoptionRequests(data || []);
                  }
                } catch (err) {
                  alert('Lỗi: ' + err.message);
                }
              };

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

                  {/* Owner Contact Info (when accepted) */}
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

                  {/* Meeting Confirmation (when accepted) */}
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
                            onChange={handleConfirmMeet}
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

                  {/* QR Code (when both confirmed) */}
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
                          onClick={handleConfirmMeet}
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
                        onClick={handleCancelRequest}
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

    if (activeTab === "settings") {
      return (
        <div style={{ padding: "12px 0", color: "#374151", fontSize: 14, display: "grid", gap: 8 }}>
          <div>Cập nhật thông tin liên hệ đang phát triển. Vào trang `ProfilePage` nếu cần chỉnh sửa chi tiết.</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Email hiển thị: {profile?.email || "Chưa cập nhật"}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Số điện thoại: {profile?.phone || "Chưa cập nhật"}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Zalo: {profile?.zalo || "Chưa cập nhật"}</div>
        </div>
      );
    }

    return null;
  };

  if (!isOpen) return null;

  const isInlineDesktop = inlineWithinMap && isDesktop;

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

                    {/* Adoption Timeline Stepper - only for adopt posts */}
                    {selectedPost.category === 'adopt' && (() => {
                      // Determine current step based on adoption requests
                      let currentStep = 1; // 1=Đăng bài, 2=Người nhận cọc, 3=Giao QR, 4=Xác nhận 1d, 5=Xác nhận 7d, 6=Hoàn tất 30d
                      let stepLabel = 'Chờ người nhận cọc';
                      
                      if (adoptionRequests && adoptionRequests.length > 0) {
                        const accepted = adoptionRequests.find(r => r.status === 'accepted' || r.status === 'ready_to_deliver' || r.status === 'delivered' || r.status === 'completed');
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

                      const steps = [
                        { id: 1, label: 'Đăng bài', icon: '📝' },
                        { id: 2, label: 'Nhận cọc', icon: '💰' },
                        { id: 3, label: 'Giao/QR', icon: '📱' },
                        { id: 4, label: 'XN 1d', icon: '✓' },
                        { id: 5, label: 'XN 7d', icon: '📸' },
                        { id: 6, label: 'Hoàn tất', icon: '🎉' }
                      ];

                      return (
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
                      );
                    })()}

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

                    {/* My Adoption Request Status - For requesters */}
                    {myAdoptionRequest && selectedPost.owner_id !== user?.id && (
                      <div style={{ marginBottom: 16, padding: 16, background: '#f0f9ff', border: '2px solid #3b82f6', borderRadius: 8 }}>
                        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1e40af' }}>
                          📋 Tiến trình yêu cầu của bạn
                        </h4>

                        {/* Status Timeline */}
                        <div style={{ marginBottom: 12 }}>
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
                                      onChange={() => handleConfirmMeeting(myAdoptionRequest.id, false)}
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
                                    onClick={async () => {
                                      try {
                                        const { error } = await supabase
                                          .from('adoption_requests')
                                          .update({
                                            receiver_confirmed_checkin: true,
                                            receiver_confirmed_checkin_at: new Date().toISOString()
                                          })
                                          .eq('id', myAdoptionRequest.id);

                                        if (error) throw error;

                                        alert('Đã xác nhận hoàn thành! Chờ chủ bài xác nhận.');

                                        const { data: updated } = await supabase
                                          .from('adoption_requests')
                                          .select('*')
                                          .eq('id', myAdoptionRequest.id)
                                          .single();
                                        if (updated) setMyAdoptionRequest(updated);
                                      } catch (err) {
                                        alert('Lỗi: ' + err.message);
                                      }
                                    }}
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

                              {/* Task Description */}
                              <div style={{ marginBottom: 8, padding: 10, background: '#dbeafe', borderRadius: 6, border: '1px solid #93c5fd' }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: '#1e3a8a', marginBottom: 4 }}>
                                  📝 Nhiệm vụ: Xác nhận mèo ổn sau {myAdoptionRequest.checkin_days || 30} ngày
                                </div>
                                <div style={{ fontSize: 11, color: '#1e40af', lineHeight: 1.5 }}>
                                  Bạn cần xác nhận rằng mèo đang khỏe mạnh, an toàn, không có vấn đề gì. Sau đó chủ bài sẽ xác nhận lại.
                                </div>
                              </div>

                              {/* Countdown cho 3 milestones */}
                              {myAdoptionRequest.delivered_at && !myAdoptionRequest.receiver_confirmed_checkin && (() => {
                                const delivered = new Date(myAdoptionRequest.delivered_at);
                                const now = new Date();
                                
                                // Calculate deadlines
                                const milestone1d = new Date(delivered.getTime() + 1 * 24 * 60 * 60 * 1000);
                                const milestone7d = new Date(delivered.getTime() + 7 * 24 * 60 * 60 * 1000);
                                const milestone30d = new Date(delivered.getTime() + 30 * 24 * 60 * 60 * 1000);
                                
                                // Calculate time remaining in seconds
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
                                    {/* Milestone 1 ngày */}
                                    <div style={{ padding: 12, background: time1d.total === 0 ? '#fee2e2' : '#fef3c7', borderRadius: 8, border: time1d.total === 0 ? '2px solid #ef4444' : '2px solid #fbbf24' }}>
                                      <div style={{ fontSize: 11, fontWeight: 600, color: time1d.total === 0 ? '#991b1b' : '#92400e', marginBottom: 4 }}>
                                        ⏰ Nhiệm vụ 1 ngày
                                      </div>
                                      <div style={{ fontSize: 24, fontWeight: 900, color: time1d.total === 0 ? '#991b1b' : '#d97706', fontFamily: 'monospace', lineHeight: 1 }}>
                                        {formatTime(time1d)}
                                      </div>
                                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                                        Hạn: {milestone1d.toLocaleString('vi-VN')}
                                      </div>
                                    </div>
                                    
                                    {/* Milestone 7 ngày */}
                                    <div style={{ padding: 12, background: time7d.total === 0 ? '#fee2e2' : (time7d.days <= 1 ? '#fed7aa' : '#fef3c7'), borderRadius: 8, border: time7d.total === 0 ? '2px solid #ef4444' : (time7d.days <= 1 ? '2px solid #f97316' : '2px solid #fbbf24') }}>
                                      <div style={{ fontSize: 11, fontWeight: 600, color: time7d.total === 0 ? '#991b1b' : (time7d.days <= 1 ? '#ea580c' : '#92400e'), marginBottom: 4 }}>
                                        ⏰ Nhiệm vụ 7 ngày
                                      </div>
                                      <div style={{ fontSize: 24, fontWeight: 900, color: time7d.total === 0 ? '#991b1b' : (time7d.days <= 1 ? '#ea580c' : '#d97706'), fontFamily: 'monospace', lineHeight: 1 }}>
                                        {formatTime(time7d)}
                                      </div>
                                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                                        Hạn: {milestone7d.toLocaleString('vi-VN')}
                                      </div>
                                    </div>
                                    
                                    {/* Milestone 30 ngày */}
                                    <div style={{ padding: 12, background: time30d.total === 0 ? '#fee2e2' : (time30d.days <= 3 ? '#fed7aa' : '#dcfce7'), borderRadius: 8, border: time30d.total === 0 ? '2px solid #ef4444' : (time30d.days <= 3 ? '2px solid #f97316' : '2px solid #22c55e') }}>
                                      <div style={{ fontSize: 11, fontWeight: 600, color: time30d.total === 0 ? '#991b1b' : (time30d.days <= 3 ? '#ea580c' : '#166534'), marginBottom: 4 }}>
                                        ⏰ Nhiệm vụ 30 ngày (Chính thức)
                                      </div>
                                      <div style={{ fontSize: 24, fontWeight: 900, color: time30d.total === 0 ? '#991b1b' : (time30d.days <= 3 ? '#ea580c' : '#166534'), fontFamily: 'monospace', lineHeight: 1 }}>
                                        {formatTime(time30d)}
                                      </div>
                                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                                        Hạn: {milestone30d.toLocaleString('vi-VN')}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Milestones 1/7/30 ngày */}
                              <div style={{ padding: 10, background: '#fff', borderRadius: 8, border: '1px solid #c7d2fe', marginBottom: 8 }}>
                                <div style={{ fontWeight: 600, color: '#1e3a8a', marginBottom: 6 }}>🗓️ Mốc sau nhận mèo</div>
                                {[
                                  { label: 'Ngày 1: Báo mèo đã an toàn', done: !!myAdoptionRequest.receiver_confirmed_checkin },
                                  { label: 'Ngày 7: Ảnh / video mèo', done: !!myAdoptionRequest.receiver_confirmed_checkin },
                                  { label: 'Ngày 30: Xác nhận chính thức', done: !!myAdoptionRequest.receiver_confirmed_checkin }
                                ].map((step, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: step.done ? '#166534' : '#374151', marginBottom: 4 }}>
                                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: step.done ? '#dcfce7' : '#e5e7eb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: step.done ? '#166534' : '#6b7280', fontWeight: 700, fontSize: 11 }}>
                                      {step.done ? '✓' : idx + 1}
                                    </span>
                                    <span>{step.label}</span>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Activity Timeline */}
                              <div style={{ marginTop: 12 }}>
                                <AdoptionActivityTimeline adoptionRequestId={myAdoptionRequest.id} />
                              </div>
                              
                              {/* Checkin Confirmation Button (always visible when delivered) - Removed, now in Next Action block */}
                            </div>
                          )}                          {myAdoptionRequest.status === 'rejected' && (
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
                              
                              {/* Rating Section */}
                              {!myAdoptionRequest.has_rated && (
                                <div style={{ padding: 12, background: '#fff', borderRadius: 6, border: '1px solid #86efac' }}>
                                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>⭐ Đánh giá chủ bài</div>
                                  <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                                    {[
                                      { type: 'good', label: '👍 Tốt', color: '#10b981' },
                                      { type: 'neutral', label: '😐 Trung bình', color: '#f59e0b' },
                                      { type: 'bad', label: '👎 Xấu', color: '#ef4444' }
                                    ].map(rating => (
                                      <button
                                        key={rating.type}
                                        onClick={async () => {
                                          try {
                                            const { error } = await supabase
                                              .from('adoption_scores')
                                              .insert({
                                                adoption_request_id: myAdoptionRequest.id,
                                                user_id: selectedPost?.owner_id,
                                                rater_id: user.id,
                                                rating_type: rating.type,
                                                rating_score: rating.type === 'good' ? 20 : rating.type === 'neutral' ? 10 : 0
                                              });

                                            if (error) throw error;

                                            alert('Đã ghi nhận đánh giá của bạn!');
                                            
                                            // Reload request
                                            const { data: updated } = await supabase
                                              .from('adoption_requests')
                                              .select('*')
                                              .eq('id', myAdoptionRequest.id)
                                              .single();
                                            if (updated) {
                                              setMyAdoptionRequest({ ...updated, has_rated: true });
                                            }
                                          } catch (err) {
                                            alert('Lỗi: ' + err.message);
                                          }
                                        }}
                                        style={{
                                          padding: '10px 12px',
                                          background: rating.color,
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: 6,
                                          cursor: 'pointer',
                                          fontSize: 13,
                                          fontWeight: 500
                                        }}
                                      >
                                        {rating.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {myAdoptionRequest.has_rated && (
                                <div style={{ padding: 8, background: '#e0e7ff', borderRadius: 6, color: '#4338ca', fontSize: 12, fontWeight: 500 }}>
                                  ✅ Bạn đã gửi đánh giá
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Buttons for requester */}
                          {(myAdoptionRequest.status === 'pending' || myAdoptionRequest.status === 'rejected') && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                              <button
                                onClick={async () => {
                                  try {
                                    // Reset/create new adoption request
                                    const { error } = await supabase
                                      .from('adoption_requests')
                                      .update({
                                        status: 'pending',
                                        receiver_confirmed_meet: false,
                                        owner_confirmed_meet: false,
                                        delivery_token: null,
                                        token_generated_at: null
                                      })
                                      .eq('id', myAdoptionRequest.id);

                                    if (error) throw error;

                                    alert('Đã gửi lại yêu cầu nhận mèo. Chờ chủ bài phản hồi!');

                                    // Reload current adoption request
                                    if (selectedPost) {
                                      const { data: req, error: reqErr } = await supabase
                                        .from('adoption_requests')
                                        .select('*')
                                        .eq('pet_id', selectedPost.id)
                                        .eq('requester_id', user.id)
                                        .single();

                                      if (!reqErr && req) {
                                        setMyAdoptionRequest(req);
                                      }
                                    }
                                  } catch (err) {
                                    alert('Lỗi: ' + err.message);
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  padding: '10px 16px',
                                  background: '#3b82f6',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  fontSize: 13,
                                  fontWeight: 500,
                                }}
                              >
                                🔄 Yêu cầu lại
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm('Hủy yêu cầu này? Bạn sẽ phải yêu cầu lại từ đầu.')) return;
                                  try {
                                    const { error } = await supabase
                                      .from('adoption_requests')
                                      .update({ status: 'cancelled' })
                                      .eq('id', myAdoptionRequest.id);

                                    if (error) throw error;

                                    alert('Đã hủy yêu cầu.');
                                    setMyAdoptionRequest(null);
                                  } catch (err) {
                                    alert('Lỗi: ' + err.message);
                                  }
                                }}
                                style={{
                                  flex: 1,
                                  padding: '10px 16px',
                                  background: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  fontSize: 13,
                                  fontWeight: 500,
                                }}
                              >
                                ✕ Hủy
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Next Action Block - Owner View */}
                    {selectedPost && selectedPost.owner_id === user?.id && selectedPost.category === 'adopt' && (() => {
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

                    {/* Adoption Requests Section - For any post type if user is owner */}
                    {selectedPost && selectedPost.owner_id === user?.id && (
                      <div style={{ marginBottom: 16, border: '2px solid #3b82f6', padding: 12, borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                          <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            👥 Người muốn nhận ({adoptionRequests.length})
                            {loadingRequests && <span style={{ fontSize: 12, color: '#6b7280' }}>Đang tải...</span>}
                          </h4>
                          {adoptionRequests.length > 0 && (
                            <div style={{ fontSize: 12, color: '#374151', background: '#e0f2fe', padding: '6px 10px', borderRadius: 999, border: '1px solid #93c5fd' }}>
                              📌 Nhiệm vụ còn lại: {adoptionRequests.filter(r => r.status === 'delivered' && !r.receiver_confirmed_checkin).length} cần người nhận xác nhận
                            </div>
                          )}
                        </div>

                        {/* Sort Buttons */}
                        {adoptionRequests.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setSortBy('newest')}
                              style={{
                                padding: '6px 12px',
                                fontSize: 12,
                                borderRadius: 6,
                                border: sortBy === 'newest' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                background: sortBy === 'newest' ? '#dbeafe' : '#fff',
                                color: sortBy === 'newest' ? '#1e40af' : '#6b7280',
                                cursor: 'pointer',
                                fontWeight: 500,
                              }}
                            >
                              🕐 Mới nhất
                            </button>
                            <button
                              onClick={() => setSortBy('deposit')}
                              style={{
                                padding: '6px 12px',
                                fontSize: 12,
                                borderRadius: 6,
                                border: sortBy === 'deposit' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                background: sortBy === 'deposit' ? '#dbeafe' : '#fff',
                                color: sortBy === 'deposit' ? '#1e40af' : '#6b7280',
                                cursor: 'pointer',
                                fontWeight: 500,
                              }}
                            >
                              💰 Cọc cao
                            </button>
                            <button
                              onClick={() => setSortBy('reputation')}
                              style={{
                                padding: '6px 12px',
                                fontSize: 12,
                                borderRadius: 6,
                                border: sortBy === 'reputation' ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                background: sortBy === 'reputation' ? '#dbeafe' : '#fff',
                                color: sortBy === 'reputation' ? '#1e40af' : '#6b7280',
                                cursor: 'pointer',
                                fontWeight: 500,
                              }}
                            >
                              ⭐ Uy tín
                            </button>
                          </div>
                        )}

                        {!loadingRequests && adoptionRequests.length === 0 && (
                          <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                            Chưa có ai liên hệ nhận
                          </div>
                        )}

                        {sortedRequests.filter(req => req.status !== 'rejected').map((request) => {
                          const isPending = request.status === 'pending';
                          const isAccepted = request.status === 'accepted';
                          const isReadyToDeliver = request.status === 'ready_to_deliver';
                          const isDelivered = request.status === 'delivered';
                          const isRejected = request.status === 'rejected';
                          const follow = computeFollowupBadge(request);

                          const requester = request.requester;
                          const deposit = requester?.wallet_credit || 0;
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
                                background: isAccepted ? '#f0fdf4' : isRejected ? '#fef2f2' : '#fff',
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
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12 }}>
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
                                {isPending && (
                                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#92400e' }}>
                                    ⏳ Chờ bạn phản hồi
                                  </span>
                                )}
                                {isAccepted && (
                                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#166534' }}>
                                    ✅ Đã chấp nhận
                                  </span>
                                )}
                                {isReadyToDeliver && (
                                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#dbeafe', color: '#1e40af' }}>
                                    📦 Sẵn sàng giao
                                  </span>
                                )}
                                {isDelivered && (
                                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#e0e7ff', color: '#4338ca' }}>
                                    🎉 Đã giao
                                  </span>
                                )}
                                {request.status === 'completed' && (
                                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#166534' }}>
                                    ✅ Hoàn tất
                                  </span>
                                )}
                                {isRejected && (
                                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#fee2e2', color: '#991b1b' }}>
                                    ❌ Đã từ chối
                                  </span>
                                )}
                              </div>

                              {/* Checkin Status - Owner view */}
                              {isDelivered && (() => {
                                const due = request.checkin_required_at ? new Date(request.checkin_required_at) : null;
                                const now = new Date();
                                const daysLeft = due ? Math.ceil((due - now) / (1000 * 60 * 60 * 24)) : null;
                                const overdue = due && now > due;
                                const deliveredDays = request.checkin_days || 30;

                                return (
                                <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 6, marginBottom: 8, fontSize: 12, border: '1px solid #93c5fd' }}>
                                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e40af' }}>📋 Nhiệm vụ sau khi giao mèo</div>
                                  
                                  {/* Task Description */}
                                  <div style={{ marginBottom: 8, padding: 10, background: '#dbeafe', borderRadius: 6, border: '1px solid #93c5fd' }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e3a8a', marginBottom: 4 }}>
                                      📝 Xác nhận mèo đang ổn sau {deliveredDays} ngày
                                    </div>
                                    <div style={{ fontSize: 11, color: '#1e40af', lineHeight: 1.5 }}>
                                      Cả bạn và người nhận cần xác nhận mèo đã an toàn, khỏe mạnh, không có vấn đề gì sau khi giao.
                                    </div>
                                  </div>
                                  
                                  {/* Countdown */}
                                  {due && (
                                    <div style={{ marginBottom: 8, padding: 16, background: overdue ? '#fee2e2' : (daysLeft <= 3 ? '#fed7aa' : '#fef3c7'), borderRadius: 8, border: overdue ? '3px solid #ef4444' : (daysLeft <= 3 ? '2px solid #f97316' : '2px solid #fbbf24'), textAlign: 'center' }}>
                                      <div style={{ fontSize: 42, fontWeight: 900, color: overdue ? '#991b1b' : (daysLeft <= 3 ? '#ea580c' : '#d97706'), marginBottom: 8, lineHeight: 1 }}>
                                        {overdue ? '🟥 QUÁ HẠN' : `⏰ ${daysLeft}`}
                                      </div>
                                      <div style={{ fontSize: 16, fontWeight: 700, color: overdue ? '#991b1b' : (daysLeft <= 3 ? '#ea580c' : '#d97706'), marginBottom: 6 }}>
                                        {overdue ? '' : 'NGÀY CÒN LẠI'}
                                      </div>
                                      <div style={{ color: overdue ? '#991b1b' : '#6b7280', fontSize: 12, fontWeight: 500 }}>
                                        Hạn: {due.toLocaleDateString('vi-VN')} {due.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}
                                      </div>
                                    </div>
                                  )}

                                  {/* Progress checklist */}
                                  <div style={{ marginBottom: 10, padding: 10, background: '#fff', borderRadius: 6, display: 'grid', gap: 6, fontSize: 11 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4, color: '#374151' }}>Tiến trình xác nhận:</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 16 }}>{request.receiver_confirmed_checkin ? '✅' : '⏳'}</span>
                                        <span style={{ color: request.receiver_confirmed_checkin ? '#166534' : '#6b7280' }}>
                                          <strong>{requester?.display_name || 'Người nhận'}</strong>: {request.receiver_confirmed_checkin ? 'Đã xác nhận mèo ổn' : 'Chưa xác nhận'}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 16 }}>{request.owner_confirmed_checkin ? '✅' : '⏳'}</span>
                                        <span style={{ color: request.owner_confirmed_checkin ? '#166534' : '#6b7280' }}>
                                          <strong>Bạn (chủ bài)</strong>: {request.owner_confirmed_checkin ? 'Đã xác nhận' : 'Chưa xác nhận'}
                                        </span>
                                      </div>
                                  </div>

                                  {/* Remind Button - when waiting for receiver confirmation */}
                                  {!request.receiver_confirmed_checkin && (
                                    <button
                                      onClick={async () => {
                                        try {
                                          // Send reminder email
                                          const adoptionData = {
                                            adoptionId: request.id,
                                            petName: selectedPost?.name || 'mèo của bạn',
                                            ownerName: profile?.display_name || 'Chủ bài',
                                            receiverName: requester?.display_name || 'Bạn',
                                            receiverEmail: requester?.email || ''
                                          };
                                          await sendOwnerReminderEmail(adoptionData);
                                          
                                          // Log reminder action
                                          await supabase
                                            .from('adoption_activities')
                                            .insert({
                                              adoption_request_id: request.id,
                                              activity_type: 'reminder_sent',
                                              actor_id: user?.id,
                                              actor_type: 'owner',
                                              description: `Chủ bài gửi nhắc xác nhận tình hình mèo`,
                                              created_at: new Date().toISOString()
                                            })
                                            .catch(() => {});

                                          alert('Đã gửi nhắc tới người nhận qua email!');
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

                                  <button
                                    disabled={request.owner_confirmed_checkin || !request.receiver_confirmed_checkin}
                                    onClick={async () => {
                                      try {
                                        const { error } = await supabase
                                          .from('adoption_requests')
                                          .update({
                                            owner_confirmed_checkin: true,
                                            owner_confirmed_checkin_at: new Date().toISOString()
                                          })
                                          .eq('id', request.id);

                                        if (error) throw error;

                                        alert('Đã xác nhận hoàn thành! Giao dịch sẽ hoàn tất.');

                                        // Reload adoption requests
                                        if (selectedPost) {
                                          const { data, error: loadError } = await supabase
                                            .from('adoption_requests')
                                            .select(`
                                              *,
                                              requester:profiles!requester_id(
                                                id, display_name, email, phone, zalo, avatar_url, wallet_credit
                                              )
                                            `)
                                            .eq('pet_id', selectedPost.id)
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
                                            setAdoptionRequests(withReputation);
                                          }
                                        }
                                      } catch (err) {
                                        alert('Lỗi: ' + err.message);
                                      }
                                    }}
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
                                      marginTop: 8,
                                      opacity: (!request.receiver_confirmed_checkin && !request.owner_confirmed_checkin) ? 0.6 : 1
                                    }}
                                  >
                                    {request.owner_confirmed_checkin ? '✅ Bạn đã xác nhận' : request.receiver_confirmed_checkin ? '✓ Xác nhận hoàn thành' : '🔒 Chờ người nhận xác nhận trước'}
                                  </button>

                                  {request.owner_confirmed_checkin && request.receiver_confirmed_checkin && (
                                    <div style={{ padding: 8, background: '#dcfce7', borderRadius: 4, color: '#166534', fontSize: 11, fontWeight: 500, marginTop: 8 }}>
                                      ✅ Giao dịch hoàn tất thành công!
                                    </div>
                                  )}
                                </div>
                                );
                              })()}

                              {/* Contact Info (only show if accepted or beyond) */}
                              {(isAccepted || isReadyToDeliver || isDelivered) && request.requester && (
                                <div style={{ padding: 8, background: '#f0fdf4', borderRadius: 6, marginBottom: 8, fontSize: 13 }}>
                                  <div style={{ fontWeight: 600, marginBottom: 4 }}>📞 Thông tin liên hệ:</div>
                                  <div>Email: {request.requester.email || 'Chưa cập nhật'}</div>
                                  <div>SĐT: {request.requester.phone || 'Chưa cập nhật'}</div>
                                  {request.requester.zalo && <div>Zalo: {request.requester.zalo}</div>}
                                </div>
                              )}

                              {/* Meeting Confirmation */}
                              {isAccepted && (
                                <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 6, marginBottom: 8, fontSize: 13, border: '1px solid #93c5fd' }}>
                                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e40af' }}>✋ Xác nhận hẹn gặp:</div>
                                  <div style={{ display: 'grid', gap: 6 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={request.owner_confirmed_meet || false}
                                        onChange={() => handleConfirmMeeting(request.id, true)}
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

                              {/* Action Buttons */}
                              {isPending && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                  <button
                                    onClick={() => handleAcceptRequest(request.id)}
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
                                    onClick={() => handleRejectRequest(request.id)}
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
                                      onClick={() => {
                                        setScanRequestId(request.id);
                                        setScanInput('');
                                        setScanError('');
                                        setShowScanModal(true);
                                      }}
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
                                    onClick={() => handleOwnerCancelRequest(request.id)}
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

          {/* Scan Delivery QR Modal */}
          {showScanModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}>
              <div style={{
                background: '#fff',
                padding: 24,
                borderRadius: 12,
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                maxWidth: 400,
                width: '90%'
              }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
                  📱 Quét mã xác nhận giao mèo
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, color: '#6b7280', marginBottom: 6, display: 'block' }}>
                    Nhập hoặc quét mã:
                  </label>
                  <input
                    type="text"
                    value={scanInput}
                    onChange={(e) => {
                      setScanInput(e.target.value);
                      setScanError('');
                    }}
                    placeholder="Quét mã QR hoặc nhập token"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                      fontSize: 14,
                      fontFamily: 'monospace'
                    }}
                  />
                </div>

                {scanError && (
                  <div style={{
                    padding: 12,
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: 6,
                    color: '#991b1b',
                    fontSize: 13,
                    marginBottom: 16
                  }}>
                    {scanError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleConfirmDelivery}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500
                    }}
                  >
                    ✓ Xác nhận
                  </button>
                  <button
                    onClick={() => {
                      setShowScanModal(false);
                      setScanInput('');
                      setScanError('');
                      setScanRequestId(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500
                    }}
                  >
                    ✗ Hủy
                  </button>
                </div>
              </div>
            </div>
          )}


        </div>
      </aside>
    </div>
  );
}
