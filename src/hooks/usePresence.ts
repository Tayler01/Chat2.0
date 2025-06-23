import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const INTERVAL = Number(import.meta.env.VITE_PRESENCE_INTERVAL_MS) || 30000;

export function usePresence() {
  const [activeUserIds, setActiveUserIds] = useState<string[]>([]);
  const intervalRef = useRef<number | null>(null);

  const updatePresence = async () => {
    try {
      await supabase.rpc('update_user_last_active');
    } catch (err) {
      console.error('Failed to update last_active', err);
    }
  };

  useEffect(() => {
    updatePresence();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    window.addEventListener('focus', updatePresence);
    document.addEventListener('visibilitychange', handleVisibility);

    intervalRef.current = window.setInterval(updatePresence, INTERVAL);

    return () => {
      window.removeEventListener('focus', updatePresence);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const FIVE_MIN = 5 * 60 * 1000;

    const fetchActive = async () => {
      const since = new Date(Date.now() - FIVE_MIN).toISOString();
      const { data } = await supabase
        .from('users')
        .select('id')
        .gte('last_active', since);
      setActiveUserIds((data || []).map((u) => u.id));
    };

    fetchActive();

    const channel = supabase
      .channel('presence-users')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          const user = payload.new as { id: string; last_active: string };
          const active =
            new Date(user.last_active).getTime() > Date.now() - FIVE_MIN;
          setActiveUserIds((prev) => {
            const set = new Set(prev);
            if (active) {
              set.add(user.id);
            } else {
              set.delete(user.id);
            }
            return Array.from(set);
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  return activeUserIds;
}
