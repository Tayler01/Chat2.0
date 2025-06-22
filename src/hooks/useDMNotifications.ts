import { useState, useEffect, useRef } from 'react';

// Duration the notification stays visible in milliseconds
const DISPLAY_DURATION = 4000;
// Extra time to allow the hide animation in DMNotification to finish
const HIDE_ANIMATION_MS = 300;
import { supabase } from '../lib/supabase';

interface DMMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
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

    const lastRead = getLastRead();

    const handlePayload = (payload: { new: DMConversation }) => {
      const conversation = payload.new as DMConversation;
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      if (!lastMessage || lastMessage.sender_id === userId) return;

      const readAt = lastRead[conversation.id];
      if (!readAt || new Date(conversation.updated_at) > new Date(readAt)) {
        setUnreadIds((prev) => new Set(prev).add(conversation.id));
        setPreview({
          conversationId: conversation.id,
          sender:
            conversation.user1_id === userId
              ? conversation.user2_username
              : conversation.user1_username,
          content: lastMessage.content,
        });
        setTimeout(
          () => setPreview(null),
          DISPLAY_DURATION + HIDE_ANIMATION_MS
        );
      }
    };

    const channel = supabase
      .channel('dm_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dms' }, handlePayload)
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [userId]);

  const markAsRead = async (
    conversationId: string,
    timestamp: string,
    lastMessageId: string | null
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

    if (lastMessageId) {
      try {
        await supabase.rpc('update_dm_read', {
          p_conversation_id: conversationId,
          p_user_id: userId,
          p_message_id: lastMessageId,
        });
      } catch (err) {
        console.error('Error updating DM read:', err);
      }
    }
  };

  return {
    unreadConversations: Array.from(unreadIds),
    hasUnread: unreadIds.size > 0,
    preview,
    markAsRead,
  };
}
