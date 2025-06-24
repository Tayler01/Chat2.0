import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { updatePresence } from '../utils/updatePresence';
import { Message } from '../types/message';

const PAGE_SIZE = 20;

let externalMessagesRefresh: (() => void) | null = null;

export function triggerMessagesRefresh() {
  externalMessagesRefresh?.();
}

export function useMessages(userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const oldestTimestampRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const subscribeToMessages = () => {
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
  };

  const refresh = () => {
    subscribeToMessages();
    fetchLatestMessages();
  };

  useEffect(() => {
    if (!userId) return;

    externalMessagesRefresh = refresh;

    fetchLatestMessages();
    subscribeToMessages();

    return () => {
      if (externalMessagesRefresh === refresh) {
        externalMessagesRefresh = null;
      }
      channelRef.current?.unsubscribe();
    };
  }, [userId]);

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
  }, [userId]);


  const fetchLatestMessages = async () => {
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
      await updatePresence();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

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
      await updatePresence();
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
  ): Promise<boolean> => {
    // Always check session validity before attempting to send
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      setError('Session expired. Please refresh the page.');
      return false;
    }

    const attempt = async () => {
      const { error } = await supabase.from('messages').insert({
        content,
        user_name: userName,
        user_id: userId,
        avatar_color: avatarColor,
        avatar_url: avatarUrl,
      });
      if (error) throw error;
      await supabase.rpc('update_user_last_active');
    };

    try {
      await attempt();
      return true;
    } catch (err1) {
      try {
        // Force reconnect realtime
        await supabase.auth.refreshSession();
        supabase.realtime.connect();
        await new Promise((r) => setTimeout(r, 500));
        await attempt();
        return true;
      } catch (err2) {
        try {
          // Force a complete reconnection
          const { data: { session: freshSession } } = await supabase.auth.getSession();
          if (!freshSession) {
            setError('Session expired. Please refresh the page.');
            return false;
          }
          
          // Disconnect and reconnect realtime
          supabase.realtime.disconnect();
          await new Promise((r) => setTimeout(r, 200));
          supabase.realtime.connect();
          await new Promise((r) => setTimeout(r, 800));
          await attempt();
          return true;
        } catch (err3) {
          setError('Connection lost. Please refresh the page to continue.');
          return false;
        }
      }
    }
  };


  return {
    messages,
    loading,
    error,
    sendMessage,
    fetchOlderMessages,
    hasMore,
    refresh,
  };
}


