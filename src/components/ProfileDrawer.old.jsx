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
    if (request.status === 'completed') return { label: 'đŸŸ© ÄĂ£ hoĂ n táº¥t adopt', color: '#166534', bg: '#dcfce7' };
    if (request.status === 'delivered') {
      const due = request.checkin_required_at ? new Date(request.checkin_required_at) : null;
      const now = new Date();
      if (due && now > due) return { label: 'đŸŸ¥ QuĂ¡ háº¡n 30 ngĂ y', color: '#991b1b', bg: '#fee2e2' };
      if (request.receiver_confirmed_checkin) return { label: 'đŸŸ¨ Chá» chá»§ xĂ¡c nháº­n', color: '#92400e', bg: '#fef3c7' };
      return { label: 'đŸŸ§ Chá» xĂ¡c nháº­n sau giao', color: '#92400e', bg: '#fef3c7' };
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
        setError(err?.message || "KhĂ´ng thá»ƒ táº£i há»“ sÆ¡");
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
      
      alert('ÄĂ£ cháº¥p nháº­n yĂªu cáº§u!');
      
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
      alert('Lá»—i: ' + err.message);
    }
  };

  // Reject adoption request
  const handleRejectRequest = async (requestId) => {
    if (!confirm('Tá»« chá»‘i yĂªu cáº§u nĂ y?')) return;
    
    try {
      const { error } = await supabase
        .from('adoption_requests')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('id', requestId);
      
      if (error) throw error;
      
      alert('ÄĂ£ tá»« chá»‘i yĂªu cáº§u');
      
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
      alert('Lá»—i: ' + err.message);
    }
  };

  // Cancel accepted adoption request (owner can cancel after accepting)
  const handleOwnerCancelRequest = async (requestId) => {
    if (!confirm('Há»§y yĂªu cáº§u nĂ y? Token giao mĂ¨o sáº½ bá»‹ thu há»“i vĂ  chuyá»ƒn sang ngÆ°á»i khĂ¡c.')) return;
    
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
      
      alert('ÄĂ£ há»§y yĂªu cáº§u. Token Ä‘Æ°á»£c phĂ¡t hĂ nh láº¡i cho ngÆ°á»i khĂ¡c.');
      
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
      alert('Lá»—i: ' + err.message);
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
        alert('ÄĂ£ há»§y xĂ¡c nháº­n. Quy trĂ¬nh reset tá»« Ä‘áº§u.');
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
          alert('ÄĂ£ xĂ¡c nháº­n háº¹n gáº·p! Token giao mĂ¨o Ä‘Ă£ Ä‘Æ°á»£c táº¡o.');
        } else {
          alert('ÄĂ£ xĂ¡c nháº­n. Chá» ngÆ°á»i kia xĂ¡c nháº­n Ä‘á»ƒ táº¡o mĂ£ giao.');
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
      alert('Lá»—i: ' + err.message);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!scanInput.trim()) {
      setScanError('Vui lĂ²ng nháº­p hoáº·c quĂ©t mĂ£');
      return;
    }

    try {
      setScanError('');
      
      // Parse token tá»« input (cĂ³ thá»ƒ lĂ  plain token hoáº·c JSON tá»« QR)
      let token = scanInput.trim();
      try {
        const parsed = JSON.parse(scanInput);
        token = parsed.delivery_token || scanInput.trim();
      } catch {
        // Náº¿u khĂ´ng parse Ä‘Æ°á»£c JSON, dĂ¹ng giĂ¡ trá»‹ nháº­p vĂ o
      }

      // TĂ¬m adoption request vá»›i delivery_token nĂ y
      const { data: request, error: reqErr } = await supabase
        .from('adoption_requests')
        .select('*')
        .eq('delivery_token', token)
        .eq('id', scanRequestId)
        .single();

      if (reqErr || !request) {
        setScanError('MĂ£ khĂ´ng khá»›p vá»›i yĂªu cáº§u nĂ y');
        return;
      }

      // XĂ¡c nháº­n Ä‘Ă£ giao - set status = delivered
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
          petName: selectedPost?.name || 'mĂ¨o cá»§a báº¡n',
          ownerName: profile?.display_name || 'Chá»§ bĂ i',
          receiverName: request.requester?.display_name || 'Báº¡n',
          receiverEmail: request.requester?.email || ''
        };
        await sendDeliveryNotification(adoptionData);
      } catch (emailErr) {
        console.error('Error sending delivery notification:', emailErr);
        // Continue anyway - email failure shouldn't block the delivery
      }

      alert('ÄĂ£ xĂ¡c nháº­n giao mĂ¨o thĂ nh cĂ´ng!');
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
      setScanError('Lá»—i: ' + err.message);
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
          Vui lĂ²ng Ä‘Äƒng nháº­p Ä‘á»ƒ xem trang cĂ¡ nhĂ¢n.
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
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>ThĂ´ng tin</div>
            <div style={{ fontSize: 13, color: "#374151", display: "grid", gap: 4 }}>
              <div>TĂªn: {profile?.display_name || "ChÆ°a cáº­p nháº­t"}</div>
              <div>Email: {profile?.email || "ChÆ°a cáº­p nháº­t"}</div>
              <div>Äiá»‡n thoáº¡i: {profile?.phone || "ChÆ°a cáº­p nháº­t"}</div>
              <div>Zalo: {profile?.zalo || "ChÆ°a cáº­p nháº­t"}</div>
              <div>Vai trĂ²: {profile?.role || "user"}</div>
              <div>VĂ­ hiá»‡n táº¡i: {profile?.wallet_credit ?? 0} Ä‘</div>
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
                đŸ“Œ Nhiá»‡m vá»¥ adopt cĂ²n láº¡i ({pendingTasks.length})
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {pendingTasks.map(task => {
                  const due = task.checkin_required_at ? new Date(task.checkin_required_at) : null;
                  const overdue = due && new Date() > due;
                  return (
                    <div key={task.id} style={{ padding: 10, background: overdue ? '#fee2e2' : '#fff', borderRadius: 6, border: '1px solid #d1d5db' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: overdue ? '#991b1b' : '#374151' }}>
                        {task.pets?.name || 'MĂ¨o'} - {overdue ? 'đŸŸ¥ QuĂ¡ háº¡n' : 'đŸŸ§ Chá» xĂ¡c nháº­n'}
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
                        âœ“ XĂ¡c nháº­n ngay
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
            <div style={{ fontSize: 14, fontWeight: 600 }}>TĂ¡c vá»¥ nhanh</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
              {[
                { label: "ÄÄƒng mĂ¨o", action: () => alert("TĂ­nh nÄƒng Ä‘ang phĂ¡t triá»ƒn") },
                { label: "BĂ¡o cĂ¡o", action: () => alert("TĂ­nh nÄƒng Ä‘ang phĂ¡t triá»ƒn") },
                { label: "BĂ i Ä‘Äƒng", action: () => setActiveTab("posts") },
                { label: "CĂ i Ä‘áº·t", action: () => setActiveTab("settings") },
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
            alert(`Chá»‰nh sá»­a bĂ i: ${post.name}`);
          }}
          onDelete={(post) => {
            if (confirm(`XĂ³a bĂ i ${post.name}?`)) {
              // TODO: Call delete API and invalidate React Query cache
              alert('XĂ³a bĂ i thĂ nh cĂ´ng (TODO: implement API call)');
            }
          }}
          onShowQR={(post) => {
            alert(`Hiá»‡n QR cho bĂ i: ${post.name}`);
          }}
          onEnterToken={(post) => {
            const token = prompt("Nháº­p token:");
            if (token) {
              alert(`Gá»­i token cho bĂ i: ${post.name}`);
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
            đŸ¾ MĂ¨o Ä‘ang Ä‘áº·t cá»c nháº­n
          </div>

          {!adoptionRequests || adoptionRequests.length === 0 ? (
            <div style={{ 
              padding: 16, 
              background: "#f9fafb", 
              borderRadius: 8, 
              textAlign: "center", 
              color: "#6b7280" 
            }}>
              <p>Báº¡n chÆ°a cĂ³ yĂªu cáº§u nháº­n mĂ¨o nĂ o</p>
            </div>
          ) : (
            adoptionRequests.map((request) => {
              const statusMap = {
                pending: { icon: "â³", label: "Chá» cháº¥p nháº­n", color: "#92400e", bg: "#fef3c7" },
                accepted: { icon: "âœ…", label: "ÄĂ£ cháº¥p nháº­n", color: "#166534", bg: "#dcfce7" },
                ready_to_deliver: { icon: "đŸ“¦", label: "Sáºµn sĂ ng giao", color: "#1e40af", bg: "#dbeafe" },
                delivered: { icon: "đŸ‰", label: "ÄĂ£ giao", color: "#4338ca", bg: "#e0e7ff" },
                rejected: { icon: "âŒ", label: "Tá»« chá»‘i", color: "#991b1b", bg: "#fee2e2" },
                cancelled: { icon: "â›”", label: "ÄĂ£ há»§y", color: "#6b7280", bg: "#f3f4f6" },
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
                    alert('ÄĂ£ há»§y xĂ¡c nháº­n. Quy trĂ¬nh reset tá»« Ä‘áº§u.');
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
                      alert('ÄĂ£ xĂ¡c nháº­n háº¹n gáº·p! Token giao mĂ¨o Ä‘Ă£ Ä‘Æ°á»£c táº¡o.');
                    } else {
                      alert('ÄĂ£ xĂ¡c nháº­n. Chá» chá»§ bĂ i xĂ¡c nháº­n Ä‘á»ƒ táº¡o mĂ£ giao.');
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
                  alert('Lá»—i: ' + err.message);
                }
              };

              const handleCancelRequest = async () => {
                if (!confirm('Há»§y yĂªu cáº§u nĂ y? Báº¡n sáº½ pháº£i yĂªu cáº§u láº¡i tá»« Ä‘áº§u.')) return;
                try {
                  // Reset vá» pending state - cĂ³ thá»ƒ yĂªu cáº§u láº¡i
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
                  alert('ÄĂ£ há»§y yĂªu cáº§u. Báº¡n cĂ³ thá»ƒ yĂªu cáº§u láº¡i tá»« Ä‘áº§u.');
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
                  alert('Lá»—i: ' + err.message);
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
                        {request.pet?.name || "MĂ¨o"}
                      </h4>
                      <p style={{ margin: 0, fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        đŸ“ {request.pet?.district || "ChÆ°a rĂµ"}
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
                    <div>đŸ‘¤ Chá»§: {request.owner?.display_name || "?"}</div>
                    <div>đŸ“… Gá»­i: {new Date(request.created_at).toLocaleDateString("vi-VN")}</div>
                    {request.accepted_at && (
                      <div>âœ… Cháº¥p nháº­n: {new Date(request.accepted_at).toLocaleDateString("vi-VN")}</div>
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
                      <div style={{ fontWeight: 600, marginBottom: 6, color: "#166534" }}>đŸ“ LiĂªn há»‡ chá»§ bĂ i:</div>
                      <div style={{ color: "#6b7280", display: "grid", gap: 2 }}>
                        {request.owner.email && <div>đŸ“§ {request.owner.email}</div>}
                        {request.owner.phone && <div>â˜ï¸ {request.owner.phone}</div>}
                        {request.owner.zalo && <div>đŸ’¬ {request.owner.zalo}</div>}
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
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>âœ‹ XĂ¡c nháº­n háº¹n gáº·p:</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={request.receiver_confirmed_meet || false}
                            onChange={handleConfirmMeet}
                          />
                          <span style={{ color: request.receiver_confirmed_meet ? "#166534" : "#374151" }}>
                            {request.receiver_confirmed_meet ? "âœ… TĂ´i Ä‘Ă£ xĂ¡c nháº­n" : "TĂ´i Ä‘Ă£ xĂ¡c nháº­n háº¹n gáº·p"}
                          </span>
                        </label>
                        <div style={{ paddingLeft: 28, fontSize: 11, color: request.owner_confirmed_meet ? "#166534" : "#6b7280" }}>
                          {request.owner_confirmed_meet ? "âœ… Chá»§ bĂ i Ä‘Ă£ xĂ¡c nháº­n" : "â³ Chá» chá»§ bĂ i xĂ¡c nháº­n"}
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
                        đŸ“± MĂƒ XĂC NHáº¬N NHáº¬N MĂˆO
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
                        Cho chá»§ bĂ i quĂ©t Ä‘á»ƒ xĂ¡c nháº­n Ä‘Ă£ giao mĂ¨o
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
                          âœ‹ XĂ¡c nháº­n gáº·p
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
                        âŒ Há»§y
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
          <div>Cáº­p nháº­t thĂ´ng tin liĂªn há»‡ Ä‘ang phĂ¡t triá»ƒn. VĂ o trang `ProfilePage` náº¿u cáº§n chá»‰nh sá»­a chi tiáº¿t.</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Email hiá»ƒn thá»‹: {profile?.email || "ChÆ°a cáº­p nháº­t"}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Sá»‘ Ä‘iá»‡n thoáº¡i: {profile?.phone || "ChÆ°a cáº­p nháº­t"}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Zalo: {profile?.zalo || "ChÆ°a cáº­p nháº­t"}</div>
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
              Trang cĂ¡ nhĂ¢n
            </div>
            <div className="profile-drawer__subtitle">Giá»¯ nguyĂªn báº£n Ä‘á»“, thao tĂ¡c nhanh</div>
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
            <button className="profile-drawer__close" onClick={onClose} aria-label="ÄĂ³ng">
              Ă—
            </button>
          </div>
        </div>

        <div className="profile-drawer__tabs" role="tablist">
          {[
            { id: "overview", label: "Overview" },
            { id: "posts", label: "BĂ i Ä‘Äƒng" },
            { id: "my-adoptions", label: "đŸ¾ Nháº­n" },
            { id: "settings", label: "CĂ i Ä‘áº·t" },
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
            <div className="profile-drawer__loading">Äang táº£i há»“ sÆ¡...</div>
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
                      â† Quay láº¡i
                    </button>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                      Chi tiáº¿t bĂ i Ä‘Äƒng
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
                          {selectedPost.status === "available" ? "CĂ³ sáºµn" : selectedPost.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        {selectedPost.category === "rescue" && "đŸ‘ Cá»©u há»™"}
                        {selectedPost.category === "lost" && "đŸ“ Tháº¥t láº¡c"}
                        {selectedPost.category === "adopt" && "đŸ¡ Cho nháº­n"}
                        {" â€¢ "}
                        {selectedPost.district || "ChÆ°a rĂµ khu vá»±c"}
                      </div>
                    </div>

                    {/* Adoption Timeline Stepper - only for adopt posts */}
                    {selectedPost.category === 'adopt' && (() => {
                      // Determine current step based on adoption requests
                      let currentStep = 1; // 1=ÄÄƒng bĂ i, 2=NgÆ°á»i nháº­n cá»c, 3=Giao QR, 4=XĂ¡c nháº­n 1d, 5=XĂ¡c nháº­n 7d, 6=HoĂ n táº¥t 30d
                      let stepLabel = 'Chá» ngÆ°á»i nháº­n cá»c';
                      
                      if (adoptionRequests && adoptionRequests.length > 0) {
                        const accepted = adoptionRequests.find(r => r.status === 'accepted' || r.status === 'ready_to_deliver' || r.status === 'delivered' || r.status === 'completed');
                        if (accepted) {
                          currentStep = 2;
                          stepLabel = 'ÄĂ£ cĂ³ ngÆ°á»i nháº­n';
                          
                          if (accepted.status === 'ready_to_deliver') {
                            currentStep = 3;
                            stepLabel = 'Sáºµn sĂ ng giao mĂ¨o';
                          }
                          if (accepted.status === 'delivered') {
                            currentStep = 4;
                            stepLabel = 'Chá» xĂ¡c nháº­n sau giao';
                            if (accepted.receiver_confirmed_checkin && !accepted.owner_confirmed_checkin) {
                              stepLabel = 'Chá» báº¡n xĂ¡c nháº­n';
                            }
                            if (accepted.receiver_confirmed_checkin && accepted.owner_confirmed_checkin) {
                              currentStep = 6;
                              stepLabel = 'HoĂ n táº¥t adopt';
                            }
                          }
                          if (accepted.status === 'completed') {
                            currentStep = 6;
                            stepLabel = 'HoĂ n táº¥t adopt';
                          }
                        }
                      }

                      const steps = [
                        { id: 1, label: 'ÄÄƒng bĂ i', icon: 'đŸ“' },
                        { id: 2, label: 'Nháº­n cá»c', icon: 'đŸ’°' },
                        { id: 3, label: 'Giao/QR', icon: 'đŸ“±' },
                        { id: 4, label: 'XN 1d', icon: 'âœ“' },
                        { id: 5, label: 'XN 7d', icon: 'đŸ“¸' },
                        { id: 6, label: 'HoĂ n táº¥t', icon: 'đŸ‰' }
                      ];

                      return (
                        <div style={{ marginBottom: 16, padding: 12, background: '#f0f9ff', borderRadius: 8, border: '1px solid #93c5fd' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', marginBottom: 8 }}>
                            Quy trĂ¬nh adopt â€¢ BÆ°á»›c hiá»‡n táº¡i: <span style={{ color: '#ea580c' }}>{stepLabel}</span>
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
                                    {step.id < currentStep ? 'âœ“' : step.icon}
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
                      <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>MĂ´ táº£</h4>
                      <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {selectedPost.description || "KhĂ´ng cĂ³ mĂ´ táº£"}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div style={{ marginBottom: 16, padding: 12, background: "#f9fafb", borderRadius: 8 }}>
                      <div style={{ fontSize: 13, color: "#6b7280", display: "grid", gap: 6 }}>
                        <div>
                          <strong>ÄÄƒng lĂºc:</strong>{" "}
                          {new Date(selectedPost.created_at).toLocaleString("vi-VN")}
                        </div>
                        {selectedPost.updated_at && (
                          <div>
                            <strong>Cáº­p nháº­t:</strong>{" "}
                            {new Date(selectedPost.updated_at).toLocaleString("vi-VN")}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* My Adoption Request Status - For requesters */}
                    {myAdoptionRequest && selectedPost.owner_id !== user?.id && (
                      <div style={{ marginBottom: 16, padding: 16, background: '#f0f9ff', border: '2px solid #3b82f6', borderRadius: 8 }}>
                        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1e40af' }}>
                          đŸ“‹ Tiáº¿n trĂ¬nh yĂªu cáº§u cá»§a báº¡n
                        </h4>

                        {/* Status Timeline */}
                        <div style={{ marginBottom: 12 }}>
                          {myAdoptionRequest.status === 'pending' && (
                            <div style={{ padding: 12, background: '#fef3c7', borderRadius: 6, marginBottom: 8 }}>
                              <div style={{ fontWeight: 600, color: '#92400e', marginBottom: 4 }}>â³ Chá» chá»§ bĂ i cháº¥p nháº­n</div>
                              <div style={{ fontSize: 13, color: '#78350f' }}>
                                YĂªu cáº§u Ä‘Ă£ gá»­i lĂºc: {new Date(myAdoptionRequest.created_at).toLocaleString('vi-VN')}
                              </div>
                            </div>
                          )}

                          {(myAdoptionRequest.status === 'accepted' || myAdoptionRequest.status === 'ready_to_deliver' || myAdoptionRequest.status === 'delivered') && (
                            <>
                              {myAdoptionRequest.status === 'accepted' && (
                                <div style={{ padding: 12, background: '#dcfce7', borderRadius: 6, marginBottom: 8 }}>
                                  <div style={{ fontWeight: 600, color: '#166534', marginBottom: 4 }}>âœ… ÄĂ£ Ä‘Æ°á»£c cháº¥p nháº­n!</div>
                                  <div style={{ fontSize: 13, color: '#14532d' }}>
                                    Cháº¥p nháº­n lĂºc: {new Date(myAdoptionRequest.accepted_at).toLocaleString('vi-VN')}
                                  </div>
                                </div>
                              )}

                              {/* Owner Contact Info */}
                              <div style={{ padding: 12, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 12 }}>
                                <div style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>đŸ“ ThĂ´ng tin liĂªn há»‡ chá»§ bĂ i:</div>
                                <div style={{ fontSize: 13, color: '#6b7280', display: 'grid', gap: 4 }}>
                                  <div>Email: {profile?.email || 'ChÆ°a cáº­p nháº­t'}</div>
                                  <div>SÄT: {profile?.phone || 'ChÆ°a cáº­p nháº­t'}</div>
                                  {profile?.zalo && <div>Zalo: {profile.zalo}</div>}
                                </div>
                              </div>

                              {/* Meeting Confirmation - only for accepted status */}
                              {myAdoptionRequest.status === 'accepted' && (
                              <div style={{ padding: 12, background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, marginBottom: 8 }}>
                                <div style={{ fontWeight: 600, marginBottom: 8 }}>âœ‹ XĂ¡c nháº­n háº¹n gáº·p:</div>
                                <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <input
                                      type="checkbox"
                                      checked={myAdoptionRequest.receiver_confirmed_meet}
                                      onChange={() => handleConfirmMeeting(myAdoptionRequest.id, false)}
                                    />
                                    <span style={{ color: myAdoptionRequest.receiver_confirmed_meet ? '#166534' : '#374151' }}>
                                      {myAdoptionRequest.receiver_confirmed_meet ? 'âœ… TĂ´i Ä‘Ă£ háº¹n gáº·p' : 'TĂ´i Ä‘Ă£ háº¹n gáº·p vá»›i chá»§ bĂ i'}
                                    </span>
                                  </label>
                                  <div style={{ paddingLeft: 28, color: myAdoptionRequest.owner_confirmed_meet ? '#166534' : '#6b7280' }}>
                                    {myAdoptionRequest.owner_confirmed_meet ? 'âœ… Chá»§ bĂ i Ä‘Ă£ xĂ¡c nháº­n' : 'â³ Chá» chá»§ bĂ i xĂ¡c nháº­n'}
                                  </div>
                                </div>

                                {myAdoptionRequest.receiver_confirmed_meet && myAdoptionRequest.owner_confirmed_meet && (
                                  <div style={{ marginTop: 8, padding: 8, background: '#dcfce7', borderRadius: 4, fontSize: 12, color: '#166534', fontWeight: 500 }}>
                                    đŸ‰ Cáº£ hai Ä‘Ă£ xĂ¡c nháº­n! MĂ£ giao mĂ¨o Ä‘Ă£ Ä‘Æ°á»£c táº¡o.
                                  </div>
                                )}
                              </div>
                              )}

                              {/* QR Code - only for ready_to_deliver and beyond */}
                              {(myAdoptionRequest.status === 'ready_to_deliver' || myAdoptionRequest.status === 'delivered') && myAdoptionRequest.delivery_token && (
                            <div style={{ padding: 16, background: '#dbeafe', borderRadius: 8, textAlign: 'center' }}>
                              <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: 12, fontSize: 16 }}>
                                đŸ“± MĂƒ XĂC NHáº¬N NHáº¬N MĂˆO
                              </div>
                              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                                <QRCodeSVG value={myAdoptionRequest.delivery_token} size={140} />
                              </div>
                              <div style={{ fontFamily: 'monospace', fontSize: 20, fontWeight: 700, letterSpacing: 3, color: '#1e40af', marginBottom: 8 }}>
                                {myAdoptionRequest.delivery_token}
                              </div>
                              <div style={{ fontSize: 13, color: '#1e40af' }}>
                                ÄÆ°a mĂ£ nĂ y cho chá»§ bĂ i khi nháº­n mĂ¨o
                              </div>
                            </div>
                          )}
                            </>
                          )}

                          {myAdoptionRequest.status === 'delivered' && (
                            <div style={{ padding: 12, background: '#e0e7ff', borderRadius: 6, marginBottom: 12 }}>
                              <div style={{ fontWeight: 600, color: '#4338ca', marginBottom: 4 }}>đŸ‰ ÄĂ£ nháº­n mĂ¨o thĂ nh cĂ´ng!</div>
                              <div style={{ fontSize: 13, color: '#4338ca', marginBottom: 8 }}>
                                Giao lĂºc: {new Date(myAdoptionRequest.delivered_at).toLocaleString('vi-VN')}
                              </div>

                              {/* Next Action Block - Requester */}
                              {!myAdoptionRequest.receiver_confirmed_checkin && (
                                <div style={{ marginBottom: 12, padding: 14, background: '#fef3c7', borderRadius: 8, border: '2px solid #f59e0b' }}>
                                  <div style={{ fontSize: 16, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
                                    đŸ¯ Nhiá»‡m vá»¥ káº¿ tiáº¿p
                                  </div>
                                  <div style={{ fontSize: 14, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                                    <strong>XĂ¡c nháº­n mĂ¨o Ä‘ang á»•n</strong> sau {myAdoptionRequest.checkin_days || 30} ngĂ y. Kiá»ƒm tra sá»©c khá»e, hĂ nh vi, khĂ´ng cĂ³ váº¥n Ä‘á» gĂ¬.
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

                                        alert('ÄĂ£ xĂ¡c nháº­n hoĂ n thĂ nh! Chá» chá»§ bĂ i xĂ¡c nháº­n.');

                                        const { data: updated } = await supabase
                                          .from('adoption_requests')
                                          .select('*')
                                          .eq('id', myAdoptionRequest.id)
                                          .single();
                                        if (updated) setMyAdoptionRequest(updated);
                                      } catch (err) {
                                        alert('Lá»—i: ' + err.message);
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
                                    âœ“ XĂ¡c nháº­n hĂ´m nay
                                  </button>
                                </div>
                              )}

                              {myAdoptionRequest.receiver_confirmed_checkin && !myAdoptionRequest.owner_confirmed_checkin && (
                                <div style={{ marginBottom: 12, padding: 14, background: '#dbeafe', borderRadius: 8, border: '2px solid #3b82f6' }}>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e40af', marginBottom: 4 }}>
                                    â³ Chá» chá»§ bĂ i xĂ¡c nháº­n
                                  </div>
                                  <div style={{ fontSize: 13, color: '#374151' }}>
                                    Báº¡n Ä‘Ă£ xĂ¡c nháº­n. Chá»§ bĂ i sáº½ kiá»ƒm tra vĂ  xĂ¡c nháº­n láº¡i Ä‘á»ƒ hoĂ n táº¥t.
                                  </div>
                                </div>
                              )}

                              {/* Task Description */}
                              <div style={{ marginBottom: 8, padding: 10, background: '#dbeafe', borderRadius: 6, border: '1px solid #93c5fd' }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: '#1e3a8a', marginBottom: 4 }}>
                                  đŸ“ Nhiá»‡m vá»¥: XĂ¡c nháº­n mĂ¨o á»•n sau {myAdoptionRequest.checkin_days || 30} ngĂ y
                                </div>
                                <div style={{ fontSize: 11, color: '#1e40af', lineHeight: 1.5 }}>
                                  Báº¡n cáº§n xĂ¡c nháº­n ráº±ng mĂ¨o Ä‘ang khá»e máº¡nh, an toĂ n, khĂ´ng cĂ³ váº¥n Ä‘á» gĂ¬. Sau Ä‘Ă³ chá»§ bĂ i sáº½ xĂ¡c nháº­n láº¡i.
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
                                  if (t.total === 0) return 'â±ï¸ Háº¾T Háº N';
                                  return `${t.days}d ${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`;
                                };
                                
                                return (
                                  <div style={{ marginBottom: 12, display: 'grid', gap: 8 }}>
                                    {/* Milestone 1 ngĂ y */}
                                    <div style={{ padding: 12, background: time1d.total === 0 ? '#fee2e2' : '#fef3c7', borderRadius: 8, border: time1d.total === 0 ? '2px solid #ef4444' : '2px solid #fbbf24' }}>
                                      <div style={{ fontSize: 11, fontWeight: 600, color: time1d.total === 0 ? '#991b1b' : '#92400e', marginBottom: 4 }}>
                                        â° Nhiá»‡m vá»¥ 1 ngĂ y
                                      </div>
                                      <div style={{ fontSize: 24, fontWeight: 900, color: time1d.total === 0 ? '#991b1b' : '#d97706', fontFamily: 'monospace', lineHeight: 1 }}>
                                        {formatTime(time1d)}
                                      </div>
                                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                                        Háº¡n: {milestone1d.toLocaleString('vi-VN')}
                                      </div>
                                    </div>
                                    
                                    {/* Milestone 7 ngĂ y */}
                                    <div style={{ padding: 12, background: time7d.total === 0 ? '#fee2e2' : (time7d.days <= 1 ? '#fed7aa' : '#fef3c7'), borderRadius: 8, border: time7d.total === 0 ? '2px solid #ef4444' : (time7d.days <= 1 ? '2px solid #f97316' : '2px solid #fbbf24') }}>
                                      <div style={{ fontSize: 11, fontWeight: 600, color: time7d.total === 0 ? '#991b1b' : (time7d.days <= 1 ? '#ea580c' : '#92400e'), marginBottom: 4 }}>
                                        â° Nhiá»‡m vá»¥ 7 ngĂ y
                                      </div>
                                      <div style={{ fontSize: 24, fontWeight: 900, color: time7d.total === 0 ? '#991b1b' : (time7d.days <= 1 ? '#ea580c' : '#d97706'), fontFamily: 'monospace', lineHeight: 1 }}>
                                        {formatTime(time7d)}
                                      </div>
                                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                                        Háº¡n: {milestone7d.toLocaleString('vi-VN')}
                                      </div>
                                    </div>
                                    
                                    {/* Milestone 30 ngĂ y */}
                                    <div style={{ padding: 12, background: time30d.total === 0 ? '#fee2e2' : (time30d.days <= 3 ? '#fed7aa' : '#dcfce7'), borderRadius: 8, border: time30d.total === 0 ? '2px solid #ef4444' : (time30d.days <= 3 ? '2px solid #f97316' : '2px solid #22c55e') }}>
                                      <div style={{ fontSize: 11, fontWeight: 600, color: time30d.total === 0 ? '#991b1b' : (time30d.days <= 3 ? '#ea580c' : '#166534'), marginBottom: 4 }}>
                                        â° Nhiá»‡m vá»¥ 30 ngĂ y (ChĂ­nh thá»©c)
                                      </div>
                                      <div style={{ fontSize: 24, fontWeight: 900, color: time30d.total === 0 ? '#991b1b' : (time30d.days <= 3 ? '#ea580c' : '#166534'), fontFamily: 'monospace', lineHeight: 1 }}>
                                        {formatTime(time30d)}
                                      </div>
                                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                                        Háº¡n: {milestone30d.toLocaleString('vi-VN')}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Milestones 1/7/30 ngĂ y */}
                              <div style={{ padding: 10, background: '#fff', borderRadius: 8, border: '1px solid #c7d2fe', marginBottom: 8 }}>
                                <div style={{ fontWeight: 600, color: '#1e3a8a', marginBottom: 6 }}>đŸ—“ï¸ Má»‘c sau nháº­n mĂ¨o</div>
                                {[
                                  { label: 'NgĂ y 1: BĂ¡o mĂ¨o Ä‘Ă£ an toĂ n', done: !!myAdoptionRequest.receiver_confirmed_checkin },
                                  { label: 'NgĂ y 7: áº¢nh / video mĂ¨o', done: !!myAdoptionRequest.receiver_confirmed_checkin },
                                  { label: 'NgĂ y 30: XĂ¡c nháº­n chĂ­nh thá»©c', done: !!myAdoptionRequest.receiver_confirmed_checkin }
                                ].map((step, idx) => (
                                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: step.done ? '#166534' : '#374151', marginBottom: 4 }}>
                                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: step.done ? '#dcfce7' : '#e5e7eb', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: step.done ? '#166534' : '#6b7280', fontWeight: 700, fontSize: 11 }}>
                                      {step.done ? 'âœ“' : idx + 1}
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
                              <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>âŒ YĂªu cáº§u Ä‘Ă£ bá»‹ tá»« chá»‘i</div>
                              <div style={{ fontSize: 13, color: '#7f1d1d' }}>
                                Tá»« chá»‘i lĂºc: {new Date(myAdoptionRequest.rejected_at).toLocaleString('vi-VN')}
                              </div>
                            </div>
                          )}

                          {myAdoptionRequest.status === 'completed' && (
                            <div style={{ padding: 12, background: '#dcfce7', borderRadius: 6, marginBottom: 12 }}>
                              <div style={{ fontWeight: 600, color: '#166534', marginBottom: 8 }}>âœ… Giao dá»‹ch hoĂ n táº¥t!</div>
                              <div style={{ fontSize: 13, color: '#14532d', marginBottom: 12 }}>
                                Cáº£m Æ¡n báº¡n Ä‘Ă£ hoĂ n thĂ nh quy trĂ¬nh nháº­n nuĂ´i thĂ nh cĂ´ng.
                              </div>
                              
                              {/* Rating Section */}
                              {!myAdoptionRequest.has_rated && (
                                <div style={{ padding: 12, background: '#fff', borderRadius: 6, border: '1px solid #86efac' }}>
                                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>â­ ÄĂ¡nh giĂ¡ chá»§ bĂ i</div>
                                  <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                                    {[
                                      { type: 'good', label: 'đŸ‘ Tá»‘t', color: '#10b981' },
                                      { type: 'neutral', label: 'đŸ˜ Trung bĂ¬nh', color: '#f59e0b' },
                                      { type: 'bad', label: 'đŸ‘ Xáº¥u', color: '#ef4444' }
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

                                            alert('ÄĂ£ ghi nháº­n Ä‘Ă¡nh giĂ¡ cá»§a báº¡n!');
                                            
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
                                            alert('Lá»—i: ' + err.message);
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
                                  âœ… Báº¡n Ä‘Ă£ gá»­i Ä‘Ă¡nh giĂ¡
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

                                    alert('ÄĂ£ gá»­i láº¡i yĂªu cáº§u nháº­n mĂ¨o. Chá» chá»§ bĂ i pháº£n há»“i!');

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
                                    alert('Lá»—i: ' + err.message);
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
                                đŸ”„ YĂªu cáº§u láº¡i
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm('Há»§y yĂªu cáº§u nĂ y? Báº¡n sáº½ pháº£i yĂªu cáº§u láº¡i tá»« Ä‘áº§u.')) return;
                                  try {
                                    const { error } = await supabase
                                      .from('adoption_requests')
                                      .update({ status: 'cancelled' })
                                      .eq('id', myAdoptionRequest.id);

                                    if (error) throw error;

                                    alert('ÄĂ£ há»§y yĂªu cáº§u.');
                                    setMyAdoptionRequest(null);
                                  } catch (err) {
                                    alert('Lá»—i: ' + err.message);
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
                                âœ• Há»§y
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
                            đŸ¯ Nhiá»‡m vá»¥ káº¿ tiáº¿p
                          </div>
                          {needsReceiverConfirm && (
                            <>
                              <div style={{ fontSize: 14, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                                Chá» ngÆ°á»i nháº­n xĂ¡c nháº­n mĂ¨o Ä‘ang á»•n sau giao. Náº¿u quĂ¡ 48h khĂ´ng pháº£n há»“i, báº¡n cĂ³ thá»ƒ nháº¯c hoáº·c bĂ¡o admin.
                              </div>
                              <button
                                onClick={() => alert('TĂ­nh nÄƒng nháº¯c Ä‘ang phĂ¡t triá»ƒn')}
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
                                đŸ”” Nháº¯c ngÆ°á»i nháº­n
                              </button>
                            </>
                          )}
                          {needsOwnerConfirm && (
                            <>
                              <div style={{ fontSize: 14, color: '#374151', marginBottom: 12, lineHeight: 1.5 }}>
                                NgÆ°á»i nháº­n Ä‘Ă£ xĂ¡c nháº­n mĂ¨o á»•n. Báº¡n cáº§n xĂ¡c nháº­n láº¡i Ä‘á»ƒ hoĂ n táº¥t giao dá»‹ch.
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
                                âœ“ XĂ¡c nháº­n ngay
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
                            đŸ‘¥ NgÆ°á»i muá»‘n nháº­n ({adoptionRequests.length})
                            {loadingRequests && <span style={{ fontSize: 12, color: '#6b7280' }}>Äang táº£i...</span>}
                          </h4>
                          {adoptionRequests.length > 0 && (
                            <div style={{ fontSize: 12, color: '#374151', background: '#e0f2fe', padding: '6px 10px', borderRadius: 999, border: '1px solid #93c5fd' }}>
                              đŸ“Œ Nhiá»‡m vá»¥ cĂ²n láº¡i: {adoptionRequests.filter(r => r.status === 'delivered' && !r.receiver_confirmed_checkin).length} cáº§n ngÆ°á»i nháº­n xĂ¡c nháº­n
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
                              đŸ• Má»›i nháº¥t
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
                              đŸ’° Cá»c cao
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
                              â­ Uy tĂ­n
                            </button>
                          </div>
                        )}

                        {!loadingRequests && adoptionRequests.length === 0 && (
                          <div style={{ padding: 16, background: '#f9fafb', borderRadius: 8, textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
                            ChÆ°a cĂ³ ai liĂªn há»‡ nháº­n
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
                                    {requester?.display_name || 'NgÆ°á»i dĂ¹ng'}
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
                                      <div style={{ color: '#6b7280', fontSize: 11 }}>Cá»c</div>
                                      <div style={{ fontWeight: 600, color: '#10b981' }}>
                                        {deposit.toLocaleString('vi-VN')}Ä‘
                                      </div>
                                    </div>
                                    <div style={{ padding: 6, background: '#fef3c7', borderRadius: 4, textAlign: 'center' }}>
                                      <div style={{ color: '#6b7280', fontSize: 11 }}>Uy tĂ­n</div>
                                      <div style={{ fontWeight: 600, color: '#f59e0b' }}>
                                        â­ {okTrades}/{totalTrades}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div style={{ marginBottom: 8 }}>
                                {isPending && (
                                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#92400e' }}>
                                    â³ Chá» báº¡n pháº£n há»“i
                                  </span>
                                )}
                                {isAccepted && (
                                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#166534' }}>
                                    âœ… ÄĂ£ cháº¥p nháº­n
                                  </span>
                                )}
                                {isReadyToDeliver && (
                                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#dbeafe', color: '#1e40af' }}>
                                    đŸ“¦ Sáºµn sĂ ng giao
                                  </span>
                                )}
                                {isDelivered && (
                                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#e0e7ff', color: '#4338ca' }}>
                                    đŸ‰ ÄĂ£ giao
                                  </span>
                                )}
                                {request.status === 'completed' && (
                                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#166534' }}>
                                    âœ… HoĂ n táº¥t
                                  </span>
                                )}
                                {isRejected && (
                                  <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, background: '#fee2e2', color: '#991b1b' }}>
                                    âŒ ÄĂ£ tá»« chá»‘i
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
                                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e40af' }}>đŸ“‹ Nhiá»‡m vá»¥ sau khi giao mĂ¨o</div>
                                  
                                  {/* Task Description */}
                                  <div style={{ marginBottom: 8, padding: 10, background: '#dbeafe', borderRadius: 6, border: '1px solid #93c5fd' }}>
                                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e3a8a', marginBottom: 4 }}>
                                      đŸ“ XĂ¡c nháº­n mĂ¨o Ä‘ang á»•n sau {deliveredDays} ngĂ y
                                    </div>
                                    <div style={{ fontSize: 11, color: '#1e40af', lineHeight: 1.5 }}>
                                      Cáº£ báº¡n vĂ  ngÆ°á»i nháº­n cáº§n xĂ¡c nháº­n mĂ¨o Ä‘Ă£ an toĂ n, khá»e máº¡nh, khĂ´ng cĂ³ váº¥n Ä‘á» gĂ¬ sau khi giao.
                                    </div>
                                  </div>
                                  
                                  {/* Countdown */}
                                  {due && (
                                    <div style={{ marginBottom: 8, padding: 16, background: overdue ? '#fee2e2' : (daysLeft <= 3 ? '#fed7aa' : '#fef3c7'), borderRadius: 8, border: overdue ? '3px solid #ef4444' : (daysLeft <= 3 ? '2px solid #f97316' : '2px solid #fbbf24'), textAlign: 'center' }}>
                                      <div style={{ fontSize: 42, fontWeight: 900, color: overdue ? '#991b1b' : (daysLeft <= 3 ? '#ea580c' : '#d97706'), marginBottom: 8, lineHeight: 1 }}>
                                        {overdue ? 'đŸŸ¥ QUĂ Háº N' : `â° ${daysLeft}`}
                                      </div>
                                      <div style={{ fontSize: 16, fontWeight: 700, color: overdue ? '#991b1b' : (daysLeft <= 3 ? '#ea580c' : '#d97706'), marginBottom: 6 }}>
                                        {overdue ? '' : 'NGĂ€Y CĂ’N Láº I'}
                                      </div>
                                      <div style={{ color: overdue ? '#991b1b' : '#6b7280', fontSize: 12, fontWeight: 500 }}>
                                        Háº¡n: {due.toLocaleDateString('vi-VN')} {due.toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'})}
                                      </div>
                                    </div>
                                  )}

                                  {/* Progress checklist */}
                                  <div style={{ marginBottom: 10, padding: 10, background: '#fff', borderRadius: 6, display: 'grid', gap: 6, fontSize: 11 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4, color: '#374151' }}>Tiáº¿n trĂ¬nh xĂ¡c nháº­n:</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 16 }}>{request.receiver_confirmed_checkin ? 'âœ…' : 'â³'}</span>
                                        <span style={{ color: request.receiver_confirmed_checkin ? '#166534' : '#6b7280' }}>
                                          <strong>{requester?.display_name || 'NgÆ°á»i nháº­n'}</strong>: {request.receiver_confirmed_checkin ? 'ÄĂ£ xĂ¡c nháº­n mĂ¨o á»•n' : 'ChÆ°a xĂ¡c nháº­n'}
                                        </span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 16 }}>{request.owner_confirmed_checkin ? 'âœ…' : 'â³'}</span>
                                        <span style={{ color: request.owner_confirmed_checkin ? '#166534' : '#6b7280' }}>
                                          <strong>Báº¡n (chá»§ bĂ i)</strong>: {request.owner_confirmed_checkin ? 'ÄĂ£ xĂ¡c nháº­n' : 'ChÆ°a xĂ¡c nháº­n'}
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
                                            petName: selectedPost?.name || 'mĂ¨o cá»§a báº¡n',
                                            ownerName: profile?.display_name || 'Chá»§ bĂ i',
                                            receiverName: requester?.display_name || 'Báº¡n',
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
                                              description: `Chá»§ bĂ i gá»­i nháº¯c xĂ¡c nháº­n tĂ¬nh hĂ¬nh mĂ¨o`,
                                              created_at: new Date().toISOString()
                                            })
                                            .catch(() => {});

                                          alert('ÄĂ£ gá»­i nháº¯c tá»›i ngÆ°á»i nháº­n qua email!');
                                        } catch (err) {
                                          alert('Lá»—i: ' + err.message);
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
                                      đŸ”” Nháº¯c ngÆ°á»i nháº­n
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

                                        alert('ÄĂ£ xĂ¡c nháº­n hoĂ n thĂ nh! Giao dá»‹ch sáº½ hoĂ n táº¥t.');

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
                                        alert('Lá»—i: ' + err.message);
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
                                    {request.owner_confirmed_checkin ? 'âœ… Báº¡n Ä‘Ă£ xĂ¡c nháº­n' : request.receiver_confirmed_checkin ? 'âœ“ XĂ¡c nháº­n hoĂ n thĂ nh' : 'đŸ”’ Chá» ngÆ°á»i nháº­n xĂ¡c nháº­n trÆ°á»›c'}
                                  </button>

                                  {request.owner_confirmed_checkin && request.receiver_confirmed_checkin && (
                                    <div style={{ padding: 8, background: '#dcfce7', borderRadius: 4, color: '#166534', fontSize: 11, fontWeight: 500, marginTop: 8 }}>
                                      âœ… Giao dá»‹ch hoĂ n táº¥t thĂ nh cĂ´ng!
                                    </div>
                                  )}
                                </div>
                                );
                              })()}

                              {/* Contact Info (only show if accepted or beyond) */}
                              {(isAccepted || isReadyToDeliver || isDelivered) && request.requester && (
                                <div style={{ padding: 8, background: '#f0fdf4', borderRadius: 6, marginBottom: 8, fontSize: 13 }}>
                                  <div style={{ fontWeight: 600, marginBottom: 4 }}>đŸ“ ThĂ´ng tin liĂªn há»‡:</div>
                                  <div>Email: {request.requester.email || 'ChÆ°a cáº­p nháº­t'}</div>
                                  <div>SÄT: {request.requester.phone || 'ChÆ°a cáº­p nháº­t'}</div>
                                  {request.requester.zalo && <div>Zalo: {request.requester.zalo}</div>}
                                </div>
                              )}

                              {/* Meeting Confirmation */}
                              {isAccepted && (
                                <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 6, marginBottom: 8, fontSize: 13, border: '1px solid #93c5fd' }}>
                                  <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e40af' }}>âœ‹ XĂ¡c nháº­n háº¹n gáº·p:</div>
                                  <div style={{ display: 'grid', gap: 6 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                      <input
                                        type="checkbox"
                                        checked={request.owner_confirmed_meet || false}
                                        onChange={() => handleConfirmMeeting(request.id, true)}
                                      />
                                      <span style={{ color: request.owner_confirmed_meet ? '#166534' : '#374151', fontWeight: 500 }}>
                                        {request.owner_confirmed_meet ? 'âœ… TĂ´i Ä‘Ă£ xĂ¡c nháº­n' : 'TĂ´i Ä‘Ă£ xĂ¡c nháº­n háº¹n gáº·p'}
                                      </span>
                                    </label>
                                    <div style={{ paddingLeft: 28, color: request.receiver_confirmed_meet ? '#166534' : '#6b7280', fontSize: 12 }}>
                                      {request.receiver_confirmed_meet ? 'âœ… NgÆ°á»i nháº­n Ä‘Ă£ xĂ¡c nháº­n' : 'â³ Chá» ngÆ°á»i nháº­n xĂ¡c nháº­n'}
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
                                    âœ“ Cháº¥p nháº­n
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
                                    âœ— Tá»« chá»‘i
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
                                      đŸ“± QuĂ©t mĂ£ âœ“
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
                                    â›” Há»§y & chá»n láº¡i
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
                          alert(`Chá»‰nh sá»­a bĂ i: ${selectedPost.name}`);
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
                        âœï¸ Chá»‰nh sá»­a
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`XĂ³a bĂ i ${selectedPost.name}?`)) {
                            alert("XĂ³a bĂ i thĂ nh cĂ´ng (TODO: implement API call)");
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
                        đŸ—‘ XĂ³a
                      </button>
                      <button
                        onClick={() => {
                          alert(`Hiá»‡n QR cho bĂ i: ${selectedPost.name}`);
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
                        đŸ“± Hiá»‡n QR
                      </button>
                      <button
                        onClick={() => {
                          const token = prompt("Nháº­p token:");
                          if (token) {
                            alert(`Gá»­i token cho bĂ i: ${selectedPost.name}`);
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
                        đŸ”‘ Nháº­p Token
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
                  đŸ“± QuĂ©t mĂ£ xĂ¡c nháº­n giao mĂ¨o
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, color: '#6b7280', marginBottom: 6, display: 'block' }}>
                    Nháº­p hoáº·c quĂ©t mĂ£:
                  </label>
                  <input
                    type="text"
                    value={scanInput}
                    onChange={(e) => {
                      setScanInput(e.target.value);
                      setScanError('');
                    }}
                    placeholder="QuĂ©t mĂ£ QR hoáº·c nháº­p token"
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
                    âœ“ XĂ¡c nháº­n
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
                    âœ— Há»§y
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
