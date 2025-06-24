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
    let channel: ReturnType<typeof supabase.channel> | null = null;

    fetchProfiles();

    channel = supabase
      .channel('user-profile-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          const updated = payload.new as ActiveUserProfile & { id: string };
          if (!activeUserIds.includes(updated.id)) return;
          setProfiles((prev) => {
            const idx = prev.findIndex((p) => p.id === updated.id);
            if (idx === -1) return prev;
            const next = [...prev];
            next[idx] = { ...next[idx], ...updated };
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      channel?.unsubscribe();
    };
  }, [activeUserIds]);

  return profiles;
}
