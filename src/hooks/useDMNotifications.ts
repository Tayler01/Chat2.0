import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface DMMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface DMPreview {
  conversationId: string;
  sender: string;
  content: string;
}

export function useDMNotifications(userId: string | null) {
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<DMPreview | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const storageKey = `dm_last_read_${userId}`;
    let lastRead: Record<string, string> = {};
    try {
      lastRead = JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      lastRead = {};
    }

    const fetchUnread = async () => {
      try {
        const { data, error } = await supabase
          .from('dms')
          .select('id, updated_at')
          .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

        if (error) throw error;

        const unread = new Set<string>();
        (data || []).forEach((conv) => {
          const readAt = lastRead[conv.id];
          if (!readAt || new Date(conv.updated_at) > new Date(readAt)) {
            unread.add(conv.id);
          }
        });
        setUnreadIds(unread);
      } catch (err) {
        console.error('Error fetching unread conversations:', err);
      }
    };

    fetchUnread();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const storageKey = `dm_last_read_${userId}`;
    const getLastRead = (): Record<string, string> => {
      try {
        return JSON.parse(localStorage.getItem(storageKey) || '{}');
      } catch {
        return {};
      }
    };

    const handlePayload = async (
      payload: { new: DMMessage & { conversation_id: string } }
    ) => {
      const message = payload.new as DMMessage & { conversation_id: string };
      if (message.sender_id === userId) return;

      const { data: conversation, error } = await supabase
        .from('dms')
        .select('id, user1_id, user2_id, user1_username, user2_username')
        .eq('id', message.conversation_id)
        .single();

      if (error || !conversation) return;

      const lastRead = getLastRead();
      const readAt = lastRead[conversation.id];
      if (!readAt || new Date(message.created_at) > new Date(readAt)) {
        setUnreadIds((prev) => new Set(prev).add(conversation.id));
        setPreview({
          conversationId: conversation.id,
          sender:
            conversation.user1_id === message.sender_id
              ? conversation.user1_username
              : conversation.user2_username,
          content: message.content,
        });
        // Keep preview visible for 4 seconds to match the notification display
        setTimeout(() => setPreview(null), 4000);
      }
    };

    const channel = supabase
      .channel('dm_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'dm_messages' },
        handlePayload
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId]);

  const markAsRead = (
    conversationId: string,
    timestamp: string
  ) => {
    if (!userId) return;
    setUnreadIds((prev) => {
      const next = new Set(prev);
      next.delete(conversationId);
      return next;
    });
    const storageKey = `dm_last_read_${userId}`;
    let data: Record<string, string> = {};
    try {
      data = JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      data = {};
    }
    data[conversationId] = timestamp;
    localStorage.setItem(storageKey, JSON.stringify(data));
  };

  return {
    unreadConversations: Array.from(unreadIds),
    hasUnread: unreadIds.size > 0,
    preview,
    markAsRead,
  };
}
