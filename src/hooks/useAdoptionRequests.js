import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook để load và manage adoption requests + deposits
 * @param {Object} selectedPost - Post hiện tại được chọn
 * @param {Object} user - Current user object
 * @returns {Object} Adoption requests data + handlers
 */
export const useAdoptionRequests = (selectedPost, user) => {
  const [adoptionRequests, setAdoptionRequests] = useState([]);
  const [myAdoptionRequest, setMyAdoptionRequest] = useState(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [deposits, setDeposits] = useState({}); // Map: requester_id -> deposit info

  // Load adoption requests khi selectedPost thay đổi
  useEffect(() => {
    if (!selectedPost) {
      setAdoptionRequests([]);
      setDeposits({});
      return;
    }

    const loadRequests = async () => {
      setLoadingRequests(true);
      try {
        // Load adoption requests for this pet
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
            req.requester_rep = repMap[req.requester_id] || { 
              ok_trades: 0, 
              bad_trades: 0, 
              total_trades: 0 
            };
          });
        }

        setAdoptionRequests(data || []);

        // Check if current user has request for this pet
        if (user) {
          const myRequest = data?.find(r => r.requester_id === user.id);
          setMyAdoptionRequest(myRequest || null);
        }

        // Load deposits for each requester
        if (data && data.length > 0) {
          const requesterIds = data.map(r => r.requester_id);
          const { data: depositData } = await supabase
            .from('deposits')
            .select('*')
            .eq('pet_id', selectedPost.id)
            .in('receiver_id', requesterIds);

          if (depositData) {
            const depositMap = {};
            depositData.forEach(dep => {
              depositMap[dep.receiver_id] = {
                amount: dep.amount,
                status: dep.status,
                locked_until: dep.locked_until,
                rating_type: dep.rating_type
              };
            });
            setDeposits(depositMap);
          }
        }
      } catch (err) {
        console.error('Load adoption requests failed:', err);
        setAdoptionRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    };

    loadRequests();
  }, [selectedPost, user]);

  // Handler: Accept adoption request
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

      // Reload requests
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
          setAdoptionRequests(data);
        }
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Handler: Reject adoption request
  const handleRejectRequest = async (requestId) => {
    if (!confirm('Từ chối yêu cầu này?')) return;

    try {
      const { error } = await supabase
        .from('adoption_requests')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      alert('Đã từ chối yêu cầu');

      // Reload requests
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
          setAdoptionRequests(data);
        }
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  // Handler: Confirm meeting with requester
  const handleConfirmMeeting = async (requestId, isOwner) => {
    try {
      const updateField = isOwner ? 'owner_confirmed_meet' : 'receiver_confirmed_meet';
      const { error } = await supabase
        .from('adoption_requests')
        .update({
          [updateField]: true,
          [`${updateField}_at`]: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Reload requests
      if (selectedPost) {
        const { data, error: loadError } = await supabase
          .from('adoption_requests')
          .select('*')
          .eq('pet_id', selectedPost.id)
          .order('created_at', { ascending: false });

        if (!loadError && data) {
          setAdoptionRequests(data);
        }
      }
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  return {
    adoptionRequests,
    myAdoptionRequest,
    deposits,
    loadingRequests,
    setAdoptionRequests,
    handleAcceptRequest,
    handleRejectRequest,
    handleConfirmMeeting
  };
};
