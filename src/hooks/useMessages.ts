import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { updatePresence } from '../utils/updatePresence';
import { withTimeout } from '../utils/withTimeout';
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

    console.log('📡 [subscribeToMessages] Setting up realtime subscription for userId:', userId);

    channelRef.current?.unsubscribe();

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('📨 [subscribeToMessages] Received new message via realtime:', payload);
          const newMessage = payload.new as Message;
          console.log('📋 [subscribeToMessages] Parsed message:', {
            id: newMessage.id,
            content: newMessage.content.substring(0, 50),
            user_name: newMessage.user_name,
            user_id: newMessage.user_id,
            created_at: newMessage.created_at
          });

          setMessages((prev) =>
            {
              const exists = prev.some((msg) => msg.id === newMessage.id);
              console.log('🔍 [subscribeToMessages] Message exists check:', {
                messageId: newMessage.id,
                exists,
                currentMessageCount: prev.length
              });
              
              if (exists) {
                console.log('⚠️ [subscribeToMessages] Message already exists, skipping');
                return prev;
              } else {
                console.log('✅ [subscribeToMessages] Adding new message to state');
                const newState = [...prev, newMessage];
                console.log('📊 [subscribeToMessages] New message count:', newState.length);
                return newState;
              }
            }
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          console.log('🔄 [subscribeToMessages] Received message update via realtime:', payload);
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

    console.log('🎯 [subscribeToMessages] Subscription created and subscribed');
    channelRef.current = channel;
  };

  const refresh = () => {
    subscribeToMessages();
    fetchLatestMessages();
  };

  useEffect(() => {
    if (!userId) return;

    console.log('🎬 [useMessages] Initial setup for userId:', userId);
    externalMessagesRefresh = refresh;

    fetchLatestMessages();
    subscribeToMessages();

    return () => {
      if (externalMessagesRefresh === refresh) {
        externalMessagesRefresh = null;
      }
      console.log('🧹 [useMessages] Cleaning up subscription');
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
      console.log('📥 [fetchLatestMessages] Fetching latest messages');
      setLoading(true);

      const { data, error } = await supabase
        .from('messages')
        .select('id, content, user_name, user_id, avatar_color, avatar_url, created_at, reactions')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (error) throw error;
      console.log('📦 [fetchLatestMessages] Received data:', {
        messageCount: data?.length || 0,
        messages: data?.map(m => ({ id: m.id, content: m.content.substring(0, 30), user_name: m.user_name })) || []
      });

      const sorted = [...(data || [])].reverse();
      console.log('📋 [fetchLatestMessages] Setting messages state with count:', sorted.length);
      setMessages(sorted);

      if (sorted.length > 0) {
        oldestTimestampRef.current = sorted[0].created_at;
      }

      setHasMore((data || []).length === PAGE_SIZE);
      await updatePresence();
      console.log('✅ [fetchLatestMessages] Messages loaded successfully');
    } catch (err) {
      console.error('❌ [fetchLatestMessages] Error fetching messages:', err);
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
    console.log('🚀 [sendMessage] Starting message send process', {
      content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
      userName,
      userId,
      avatarColor,
      avatarUrl,
      timestamp: new Date().toISOString()
    });

    // Quick auth check with timeout so we don't hang indefinitely
    console.log('🔐 [sendMessage] Checking auth session');
    let session = null;
    try {
      const { data } = await withTimeout(supabase.auth.getSession(), 5000);
      session = data.session;
      console.log('📋 [sendMessage] Auth check result:', {
        hasSession: !!session,
        userId: session?.user?.id
      });
      if (!session) {
        console.log('🔄 [sendMessage] No session found, refreshing');
        await withTimeout(supabase.auth.refreshSession(), 5000);
        const { data: refreshed } = await withTimeout(supabase.auth.getSession(), 5000);
        session = refreshed.session;
        console.log('📋 [sendMessage] Session after refresh:', {
          hasSession: !!session,
          userId: session?.user?.id
        });
      }
    } catch (authErr) {
      console.warn('⚠️ [sendMessage] Auth check failed, proceeding anyway:', authErr);
    }

    const attempt = async () => {
      console.log('📤 [sendMessage] Attempting to insert message into database');
      
      const insertData = {
        content,
        user_name: userName,
        user_id: userId,
        avatar_color: avatarColor,
        avatar_url: avatarUrl,
      };
      console.log('📦 [sendMessage] Insert data prepared:', insertData);
      
      const startTime = Date.now();
      const { error } = await supabase.from('messages').insert({
        content,
        user_name: userName,
        user_id: userId,
        avatar_color: avatarColor,
        avatar_url: avatarUrl,
      });
      const endTime = Date.now();
      console.log('⏱️ [sendMessage] Database insert took:', endTime - startTime, 'ms');
      
      if (error) {
        console.error('❌ [sendMessage] Database insert failed:', error);
        throw error;
      }
      console.log('✅ [sendMessage] Message inserted successfully');
      
      console.log('🔄 [sendMessage] Updating user last active');
      const presenceStartTime = Date.now();
      await supabase.rpc('update_user_last_active');
      const presenceEndTime = Date.now();
      console.log('⏱️ [sendMessage] Presence update took:', presenceEndTime - presenceStartTime, 'ms');
      console.log('✅ [sendMessage] User last active updated');
    };

    try {
      console.log('🎯 [sendMessage] First attempt');
      await attempt();
      console.log('🎉 [sendMessage] First attempt successful');
      return true;
    } catch (err1) {
      console.warn('⚠️ [sendMessage] First attempt failed, trying reconnect:', err1);
      try {
        console.log('🔌 [sendMessage] Reconnecting realtime');
        supabase.realtime.connect();
        await new Promise((r) => setTimeout(r, 500));
        console.log('🎯 [sendMessage] Second attempt after reconnect');
        await attempt();
        console.log('🎉 [sendMessage] Second attempt successful');
        return true;
      } catch (err2) {
        console.warn('⚠️ [sendMessage] Second attempt failed, trying auth refresh:', err2);
        try {
          console.log('🔐 [sendMessage] Refreshing auth session');
          await supabase.auth.refreshSession();
          console.log('🎯 [sendMessage] Third attempt after auth refresh');
          await attempt();
          console.log('🎉 [sendMessage] Third attempt successful');
          return true;
        } catch (err3) {
          console.error('💥 [sendMessage] All attempts failed:', err3);
          setError(
            err3 instanceof Error ? err3.message : 'Failed to send message'
          );
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


