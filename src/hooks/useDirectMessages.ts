import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { updatePresence } from '../utils/updatePresence';

export interface User {
  id: string;
  username: string;
  avatar_url?: string;
  avatar_color: string;
  bio?: string;
}

export interface DMMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reactions?: Record<string, string[]>;
}

export interface DMConversation {
  id: string;
  user1_id: string;
  user2_id: string;
  user1_username: string;
  user2_username: string;
  messages: DMMessage[];
  updated_at: string;
}

const normalizeConversation = (conv: unknown): DMConversation => {
  const c = conv as Partial<DMConversation>;
  return {
    ...(c as DMConversation),
    messages: Array.isArray(c?.messages) ? (c.messages as DMMessage[]) : []
  };
};

export function useDirectMessages(currentUserId: string | null) {
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUserData = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, avatar_color, bio')
        .eq('id', currentUserId)
        .single();
      if (error) throw error;
      setCurrentUserData(data);
    } catch (err) {
      console.error('Error fetching current user data:', err);
    }
  }, [currentUserId]);

  const fetchUsers = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, avatar_color, bio')
        .neq('id', currentUserId)
        .order('username');
      if (error) throw error;
      setUsers(data || []);
      await updatePresence();
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, [currentUserId]);

  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('dms')
        .select('*')
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setConversations((data || []).map(normalizeConversation));
      await updatePresence();
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchCurrentUserData();
    fetchUsers();
    fetchConversations();
  }, [fetchCurrentUserData, fetchUsers, fetchConversations]);

  return {
    users,
    conversations,
    currentUserData,
    loading,
    fetchUsers,
    fetchConversations,
    setConversations,
  };
}
