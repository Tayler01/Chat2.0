import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar_color: string;
  avatar_url?: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  const fetchUserProfile = useCallback(async (authUser: User) => {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('username, avatar_color, avatar_url')
        .eq('id', authUser.id)
        .single();

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        username: profile?.username || authUser.email?.split('@')[0] || 'User',
        avatar_color: profile?.avatar_color || '#3B82F6',
        avatar_url: profile?.avatar_url || null,
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser({
        id: authUser.id,
        email: authUser.email || '',
        username: authUser.email?.split('@')[0] || 'User',
        avatar_color: '#3B82F6',
        avatar_url: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      await supabase.auth.refreshSession();
    } catch (error) {
      console.error('Error refreshing session:', error);
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      await fetchUserProfile(session.user);
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
      setHasCheckedSession(true);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && hasCheckedSession) {
        await fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

  }, [hasCheckedSession, fetchUserProfile]);

  useEffect(() => {

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshSession();
      }
    };

    window.addEventListener('focus', refreshSession);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', refreshSession);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshSession]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = (updatedUser: AuthUser) => {
    setUser(updatedUser);
  };

  return {
    user,
    loading,
    refreshSession,
    signOut,
    updateUser,
  };
}
