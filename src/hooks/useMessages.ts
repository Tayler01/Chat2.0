import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Message } from '../types/message';

const PAGE_SIZE = 20;

export function useMessages(userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const oldestTimestampRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const subscribeToMessages = useCallback(() => {
    if (!userId) return;

    channelRef.current?.unsubscribe();

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as Message;

          setMessages((prev) =>
            prev.some((msg) => msg.id === newMessage.id)
              ? prev
              : [...prev, newMessage]
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updatedMessage = payload.new as Message;
          
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMessage.id
                ? { ...msg, reactions: updatedMessage.reactions }
                : msg
            )
          );
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetchLatestMessages();
    subscribeToMessages();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [userId, fetchLatestMessages, subscribeToMessages]);

  useEffect(() => {
    if (!userId) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        subscribeToMessages();
        fetchLatestMessages();
      }
    };

    const handleFocus = () => {
      subscribeToMessages();
      fetchLatestMessages();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId, fetchLatestMessages, subscribeToMessages]);

  const fetchLatestMessages = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('messages')
        .select('id, content, user_name, user_id, avatar_color, avatar_url, created_at, reactions')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const sorted = [...(data || [])].reverse();
      setMessages(sorted);

      if (sorted.length > 0) {
        oldestTimestampRef.current = sorted[0].created_at;
      }

      setHasMore((data || []).length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOlderMessages = async () => {
    if (loadingOlder || !oldestTimestampRef.current || !hasMore) return;

    setLoadingOlder(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, user_name, user_id, avatar_color, avatar_url, created_at, reactions')
        .lt('created_at', oldestTimestampRef.current)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;

      const sorted = [...(data || [])].reverse();

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newUnique = sorted.filter((m) => !existingIds.has(m.id));
        return [...newUnique, ...prev];
      });

      if (sorted.length > 0) {
        oldestTimestampRef.current = sorted[0].created_at;
      }

      setHasMore((data || []).length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load older messages');
    } finally {
      setLoadingOlder(false);
    }
  };

  const sendMessage = async (
    content: string,
    userName: string,
    userId: string,
    avatarColor: string,
    avatarUrl?: string | null
  ) => {
    try {
      const { error } = await supabase.from('messages').insert({
        content,
        user_name: userName,
        user_id: userId,
        avatar_color: avatarColor,
        avatar_url: avatarUrl,
      });

      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  const markLastRead = async () => {
    if (!userId || messages.length === 0) return;
    const last = messages[messages.length - 1];
    try {
      await supabase.rpc('upsert_message_read', {
        p_message_id: last.id,
        p_user_id: userId,
      });
    } catch (err) {
      console.error('Error updating read receipt:', err);
    }
  };

  const getSeenCount = async (messageId: string) => {
    const { data, error } = await supabase
      .from('message_reads')
      .select('user_id', { count: 'exact', head: true })
      .eq('message_id', messageId);
    if (error) {
      console.error('Error fetching read receipts:', error);
      return 0;
    }
    return data?.count ?? 0;
  };

  const getSeenUsers = async (messageId: string) => {
    const { data, error } = await supabase
      .from('message_reads')
      .select(`
        user_id,
        users!message_reads_user_id_fkey (
          username,
          avatar_url
        )
      `)
      .eq('message_id', messageId);

    if (error) {
      console.error('Error fetching users who read message:', error);
      return [] as { username: string; avatar_url: string | null }[];
    }

    return (
      (data as { users: { username: string; avatar_url: string | null } | null }[] | null)
        ?.filter((row) => row.users !== null)
        ?.map((row) => ({
          username: row.users!.username,
          avatar_url: row.users!.avatar_url,
        })) ?? []
    );
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    fetchOlderMessages,
    hasMore,
    markLastRead,
    getSeenCount,
    getSeenUsers,
  };
}


