import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook để load user và profile data khi ProfileDrawer mở
 * @param {boolean} isOpen - Trạng thái mở/đóng của drawer
 * @returns {Object} { user, profile, isLoading, error }
 */
export const useProfileData = (isOpen) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        // Get current user
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;

        if (!userData?.user) {
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }

        setUser(userData.user);

        // Get user profile
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.user.id)
          .single();

        if (profileErr) throw profileErr;
        setProfile(profileData);
      } catch (err) {
        console.error('Load profile failed:', err);
        setError(err.message || 'Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [isOpen]);

  return { user, profile, isLoading, error };
};
