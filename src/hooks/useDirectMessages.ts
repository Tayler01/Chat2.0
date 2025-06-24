import { useState, useEffect, useCallback } from 'react';

let externalDMRefresh: (() => void) | null = null;

export function triggerDMsRefresh() {
  externalDMRefresh?.();
}
import { supabase } from '../lib/supabase';
import { updatePresence } from '../utils/updatePresence';

interface User {
  id: string;
  username: string;
  avatar_url?: string;
  avatar_color: string;
  bio?: string;
}

interface DMMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reactions?: Record<string, string[]>;
}

interface DMConversation {
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
    messages: Array.isArray(c?.messages) ? (c.messages as DMMessage[]) : [],
  };
};

export function useDirectMessages(currentUserId: string) {
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
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
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('dms')
        .select('id, user1_id, user2_id, user1_username, user2_username, updated_at')
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

  const fetchConversationMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('dm_messages')
        .select('id, sender_id, content, created_at, reactions')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setConversations((prev) =>
        prev.map((conv) => (conv.id === conversationId ? { ...conv, messages: data || [] } : conv))
      );
      return data || [];
    } catch (err) {
      console.error('Error fetching DM messages:', err);
      return [] as DMMessage[];
    }
  }, []);

  const refresh = () => {
    fetchUsers();
    fetchConversations();
  };

  useEffect(() => {
    externalDMRefresh = refresh;
    refresh();

    return () => {
      if (externalDMRefresh === refresh) {
        externalDMRefresh = null;
      }
    };
  }, [refresh]);

  return {
    users,
    conversations,
    loading,
    fetchUsers,
    fetchConversations,
    fetchConversationMessages,
    setConversations,
    refresh,
  };
}

