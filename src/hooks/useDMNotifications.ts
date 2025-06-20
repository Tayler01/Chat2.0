import { useState, useEffect, useRef } from 'react';
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
    const getLastRead = (): Record<string, string> => {
      try {
        return JSON.parse(localStorage.getItem(storageKey) || '{}');
      } catch {
        return {};
      }
    };

    const lastRead = getLastRead();

    const handlePayload = (payload: any) => {
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
        setTimeout(() => setPreview(null), 2000);
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

  const markAsRead = (conversationId: string, timestamp: string) => {
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
