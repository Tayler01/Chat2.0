import { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!userId) return;

    fetchLatestMessages();

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
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const fetchLatestMessages = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('messages')
        .select('id, content, user_name, user_id, avatar_color, avatar_url, created_at')
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
  };

  const fetchOlderMessages = async () => {
    if (loadingOlder || !oldestTimestampRef.current || !hasMore) return;

    setLoadingOlder(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, user_name, user_id, avatar_color, avatar_url, created_at')
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

  return {
    messages,
    loading,
    error,
    sendMessage,
    fetchOlderMessages,
    hasMore,
  };
}


