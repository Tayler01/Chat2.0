import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar_color: string;
  avatar_url?: string | null;
}

let externalRefreshSession: (() => Promise<void>) | null = null;

export function triggerAuthRefresh() {
  return externalRefreshSession ? externalRefreshSession() : Promise.resolve();
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

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

    return () => subscription.unsubscribe();
  }, [hasCheckedSession]);

  const refreshSession = async () => {
    console.log('🔄 [useAuth] Refreshing session');
    
    try {
      // Add timeout to session refresh
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session refresh timeout')), 5000)
      );
      
      const { data: { session } } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as any;
      
      console.log('📋 [useAuth] Session refresh result:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });
      
      if (session?.user) {
        await fetchUserProfile(session.user);
      } else {
        console.log('❌ [useAuth] No session found during refresh');
        setUser(null);
        setLoading(false);
      }
    } catch (refreshErr) {
      console.error('❌ [useAuth] Session refresh failed or timed out:', refreshErr);
      // Try to recover by forcing a new auth state check
      try {
        console.log('🔄 [useAuth] Attempting auth recovery');
        await supabase.auth.refreshSession();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          setLoading(false);
        }
      } catch (recoveryErr) {
        console.error('💥 [useAuth] Auth recovery failed:', recoveryErr);
        setUser(null);
        setLoading(false);
      }
    }
  };

  const oldRefreshSession = refreshSession;
  
  // Override with timeout version
  const refreshSessionWithTimeout = async () => {
    console.log('📋 [useAuth] Session refresh result:', {
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email
    });
    if (session?.user) {
      await fetchUserProfile(session.user);
    } else {
      console.log('❌ [useAuth] No session found during refresh');
      setUser(null);
      setLoading(false);
    }
  };

  useEffect(() => {
    externalRefreshSession = refreshSession;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshSession();
      }
    };

    window.addEventListener('focus', refreshSession);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (externalRefreshSession === refreshSession) {
        externalRefreshSession = null;
      }
      window.removeEventListener('focus', refreshSession);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const fetchUserProfile = async (authUser: User) => {
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
  };

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
    signOut,
    updateUser,
    refreshSession,
  };
}
