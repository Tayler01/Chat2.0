import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ActiveUserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  avatar_color: string;
}

// Simple in-memory cache for user profiles keyed by user id. Profiles are kept
// for the lifetime of the application. They are updated whenever a
// `postgres_changes` event comes through, which effectively invalidates stale
// data. We do not remove entries when a user goes inactive; keeping them around
// avoids unnecessary refetches if they become active again later in the same
// session.
const profileCache: Record<string, ActiveUserProfile> = {};

export function useActiveUserProfiles(activeUserIds: string[]) {
  const [profiles, setProfiles] = useState<ActiveUserProfile[]>([]);
  const prevIdsRef = useRef<string[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  // Stable key representing the set of active user ids. Sorting ensures we do
  // not react to changes in array order.
  const idsKey = useMemo(
    () => Array.from(new Set(activeUserIds)).sort().join(','),
    [activeUserIds]
  );

  useEffect(() => {
    prevIdsRef.current = activeUserIds;

    // Clean up previous subscription before creating a new one.
    channelRef.current?.unsubscribe();
    channelRef.current = null;

    if (activeUserIds.length === 0) {
      setProfiles([]);
      return;
    }

    const missingIds = activeUserIds.filter((id) => !profileCache[id]);

    const fetchProfiles = async (ids: string[]) => {
      if (ids.length === 0) {
        setProfiles(
          activeUserIds
            .map((id) => profileCache[id])
            .filter((p): p is ActiveUserProfile => Boolean(p))
        );
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, avatar_color')
        .in('id', ids);
      if (error) {
        console.error('Error fetching active user profiles', error);
        setProfiles([]);
      } else {
        (data || []).forEach((p) => {
          profileCache[p.id] = p;
        });
        setProfiles(
          activeUserIds
            .map((id) => profileCache[id])
            .filter((p): p is ActiveUserProfile => Boolean(p))
        );
      }
    };
    fetchProfiles(missingIds);

    channelRef.current = supabase
      .channel('user-profile-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          const updated = payload.new as ActiveUserProfile & { id: string };
          if (!prevIdsRef.current.includes(updated.id)) return;

          // Update cache and local state with the new profile data.
          profileCache[updated.id] = {
            ...(profileCache[updated.id] || {}),
            ...updated,
          } as ActiveUserProfile;

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
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return profiles;
}
