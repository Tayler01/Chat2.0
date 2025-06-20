import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar_color: string;
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

  const fetchUserProfile = async (authUser: User) => {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('username, avatar_color')
        .eq('id', authUser.id)
        .single();

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        username: profile?.username || authUser.email?.split('@')[0] || 'User',
        avatar_color: profile?.avatar_color || '#3B82F6',
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUser({
        id: authUser.id,
        email: authUser.email || '',
        username: authUser.email?.split('@')[0] || 'User',
        avatar_color: '#3B82F6',
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
  };
}