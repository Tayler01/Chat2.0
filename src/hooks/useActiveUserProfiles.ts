import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ActiveUserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  avatar_color: string;
}

export function useActiveUserProfiles(activeUserIds: string[]) {
  const [profiles, setProfiles] = useState<ActiveUserProfile[]>([]);

  useEffect(() => {
    if (activeUserIds.length === 0) {
      setProfiles([]);
      return;
    }

    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, avatar_color')
        .in('id', activeUserIds);
      if (error) {
        console.error('Error fetching active user profiles', error);
        setProfiles([]);
      } else {
        setProfiles(data || []);
      }
    };

    fetchProfiles();
  }, [activeUserIds]);

  return profiles;
}
