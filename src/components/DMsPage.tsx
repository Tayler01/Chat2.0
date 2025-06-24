import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MessageSquare, Send, X, ArrowLeft } from 'lucide-react';
import { AvatarImage } from './AvatarImage';
import { ContactSidebar } from './dms/ContactSidebar';
import { DMMessageItem } from './dms/DMMessageItem';
import { ErrorMessage } from './ErrorMessage';
import { useDirectMessages } from '../hooks/useDirectMessages';
import { supabase } from '../lib/supabase';
import { updatePresence } from '../utils/updatePresence';
import { useToast } from './Toast';

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
    messages: Array.isArray(c?.messages) ? (c.messages as DMMessage[]) : []
  };
};

interface DMsPageProps {
  currentUser: {
    id: string;
    username: string;
    avatar_color: string;
    avatar_url?: string;
  };
  onUserClick?: (userId: string) => void;
  unreadConversations?: string[];
  onConversationOpen?: (
    id: string,
    lastTimestamp: string
  ) => void;
  initialConversationId?: string | null;
  onBackToGroupChat?: () => void;
  activeUserIds: string[];
}

export function DMsPage({ currentUser, onUserClick, unreadConversations = [], onConversationOpen, initialConversationId, onBackToGroupChat, activeUserIds }: DMsPageProps) {
  const { users, conversations, loading, fetchConversationMessages, setConversations, error, refresh } = useDirectMessages(currentUser.id);
  const [selectedConversation, setSelectedConversation] = useState<DMConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const ensureConnection = () => {
    updatePresence().catch(() => {});
  };
  const getDraftKey = (id: string) => `dm_draft_${id}`;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'all'>('all');
  const [currentUserData, setCurrentUserData] = useState<User | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingMoreRef = useRef(false);
  const hasAutoScrolledRef = useRef(false);
  const DM_PAGE_SIZE = 20;
  const [messageLimit, setMessageLimit] = useState(DM_PAGE_SIZE);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [isReacting, setIsReacting] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    if (!selectedConversation) return;
    const saved = localStorage.getItem(getDraftKey(selectedConversation.id));
    setNewMessage(saved || '');
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (selectedConversation) {
      localStorage.setItem(getDraftKey(selectedConversation.id), newMessage);
    }
  }, [newMessage, selectedConversation?.id]);

  const getConversationWithUser = useCallback(
    (userId: string) =>
      conversations.find(
        (c) =>
          (c.user1_id === currentUser.id && c.user2_id === userId) ||
          (c.user2_id === currentUser.id && c.user1_id === userId)
      ) || null,
    [conversations, currentUser.id]
  );

  const sortedConversations = useMemo(() => {
    return [...conversations].sort((a, b) => {
      const aUnread = unreadConversations.includes(a.id);
      const bUnread = unreadConversations.includes(b.id);
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
  }, [conversations, unreadConversations]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const convA = getConversationWithUser(a.id);
      const convB = getConversationWithUser(b.id);
      const aUnread = convA ? unreadConversations.includes(convA.id) : false;
      const bUnread = convB ? unreadConversations.includes(convB.id) : false;
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      return a.username.localeCompare(b.username);
    });
  }, [users, unreadConversations, getConversationWithUser]);

  const displayedMessages = useMemo(() => {
    if (!selectedConversation) return [] as DMMessage[];
    const msgs = selectedConversation.messages || [];
    const start = Math.max(0, msgs.length - messageLimit);
    return msgs.slice(start);
  }, [selectedConversation, messageLimit]);

  const latestMessageByUser = useMemo(() => {
    const map = new Map<string, string>();
    if (selectedConversation) {
      (selectedConversation.messages || []).forEach((m) => {
        map.set(m.sender_id, m.id);
      });
    }
    return map;
  }, [selectedConversation?.messages]);

  const cleanupConnections = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  const oldestTimestampRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const loadingOlderRef = useRef(false);

  const loadConversationMessages = useCallback(
    async (conversationId: string) => {
      const msgs = await fetchConversationMessages(conversationId);
      if (msgs.length > 0) {
        oldestTimestampRef.current = msgs[0].created_at;
        hasMoreRef.current = msgs.length === DM_PAGE_SIZE;
        setMessageLimit(Math.min(DM_PAGE_SIZE, msgs.length));
      } else {
        oldestTimestampRef.current = null;
        hasMoreRef.current = false;
      }
    },
    [fetchConversationMessages]
  );


  const fetchOlderMessages = useCallback(async () => {
    if (!selectedConversation || !oldestTimestampRef.current || !hasMoreRef.current || loadingOlderRef.current) return;

    loadingOlderRef.current = true;
    try {
      const { data, error } = await supabase
        .from('dm_messages')
        .select('id, sender_id, content, created_at, reactions')
        .eq('conversation_id', selectedConversation.id)
        .lt('created_at', oldestTimestampRef.current)
        .order('created_at', { ascending: false })
        .limit(DM_PAGE_SIZE);

      if (error) throw error;

      const sorted = [...(data || [])].reverse();
      if (sorted.length > 0) {
        oldestTimestampRef.current = sorted[0].created_at;
      }
      hasMoreRef.current = (data || []).length === DM_PAGE_SIZE;

      setSelectedConversation(conv =>
        conv ? { ...conv, messages: [...sorted, ...conv.messages] } : null
      );
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, messages: [...sorted, ...(c.messages || [])] }
            : c
        )
      );
      setMessageLimit(limit => limit + sorted.length);
    } catch (err) {
      console.error('Error fetching older DM messages:', err);
    } finally {
      loadingOlderRef.current = false;
    }
  }, [selectedConversation]);

  const setupRealtimeSubscription = useCallback(() => {
    cleanupConnections();

    const channel = supabase
      .channel('dms_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dms' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const updatedConversation = normalizeConversation(payload.new);
            
            // Check if this conversation involves the current user
            const isUserInvolved = updatedConversation.user1_id === currentUser.id || 
                                 updatedConversation.user2_id === currentUser.id;
            
            if (!isUserInvolved) return;
            
            setConversations(prev => {
              const existingIndex = prev.findIndex(conv => conv.id === updatedConversation.id);
              if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = updatedConversation;
                return updated.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
              } else {
                return [updatedConversation, ...prev];
              }
            });

            // Update selected conversation if it's the same one
            if (selectedConversation?.id === updatedConversation.id) {
              setSelectedConversation(updatedConversation);
              loadConversationMessages(updatedConversation.id);
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [cleanupConnections, selectedConversation?.id, currentUser.id, loadConversationMessages]);

  // Handle scroll detection to prevent auto-scroll when user is manually scrolling
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || !selectedConversation) return;

    isUserScrollingRef.current = true;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 1000);

    if (container.scrollTop === 0 && hasMoreRef.current && !isLoadingMoreRef.current) {
      const previousHeight = container.scrollHeight;
      isLoadingMoreRef.current = true;

      fetchOlderMessages().then(() => {
        requestAnimationFrame(() => {
          const newHeight = container.scrollHeight;
          container.scrollTop = newHeight - previousHeight;
          isLoadingMoreRef.current = false;
        });
      });
    }
  }, [selectedConversation, fetchOlderMessages]);

  const fetchCurrentUserData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, avatar_color, bio')
        .eq('id', currentUser.id)
        .single();

      if (error) throw error;
      setCurrentUserData(data);
    } catch (err) {
      console.error('Error fetching current user data:', err);
    }
  }, [currentUser.id]);


  useEffect(() => {
    const openInitial = async () => {
      if (initialConversationId && conversations.length > 0 && !selectedConversation) {
        const conv = conversations.find(c => c.id === initialConversationId);
        if (conv) {
          const normalized = normalizeConversation(conv);
          setSelectedConversation({ ...normalized, messages: [] });
          await loadConversationMessages(normalized.id);
          hasAutoScrolledRef.current = false;
          if (onConversationOpen) {
            onConversationOpen(normalized.id, normalized.updated_at);
          }
        }
      }
    };
    openInitial();
  }, [initialConversationId, conversations, selectedConversation, onConversationOpen, loadConversationMessages]);

  useEffect(() => {
    fetchCurrentUserData();
    setupRealtimeSubscription();

    return () => {
      cleanupConnections();
    };
  }, [fetchCurrentUserData, setupRealtimeSubscription, cleanupConnections]);

  useEffect(() => {
    if (!selectedConversation) return;
    setMessageLimit((limit) =>
      Math.min(
        Math.max(limit, DM_PAGE_SIZE),
        selectedConversation.messages.length
      )
    );
  }, [selectedConversation?.messages.length]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !selectedConversation) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;

    if (!hasAutoScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      hasAutoScrolledRef.current = true;
    } else if (isNearBottom && !isUserScrollingRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    if (onConversationOpen && selectedConversation.messages.length > 0) {
      onConversationOpen(
        selectedConversation.id,
        selectedConversation.updated_at
      );
    }
    updatePresence();
  }, [selectedConversation?.messages, messageLimit, selectedConversation, onConversationOpen]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);


  const startConversation = async (user: User) => {
    try {
      // Get or create conversation
      const { data: conversationId, error } = await supabase.rpc('get_or_create_dm_conversation', {
        current_user_id: currentUser.id,
        other_user_id: user.id,
        current_username: currentUser.username,
        other_username: user.username
      });

      if (error) throw error;

      // Fetch the conversation
      const { data: conversation, error: fetchError } = await supabase
        .from('dms')
        .select('id, user1_id, user2_id, user1_username, user2_username, updated_at')
        .eq('id', conversationId)
        .single();

      if (fetchError) throw fetchError;

      const normalized = normalizeConversation(conversation);
      setSelectedConversation({ ...normalized, messages: [] });
      await loadConversationMessages(normalized.id);
      hasAutoScrolledRef.current = false;
      if (onConversationOpen) {
        onConversationOpen(normalized.id, normalized.updated_at);
      }
      
      // Add to conversations if not already there
      setConversations(prev => {
        const exists = prev.find(conv => conv.id === normalized.id);
        if (exists) return prev;
        return [normalized, ...prev];
      });
      await updatePresence();
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  const sendMessage = async (): Promise<boolean> => {
    if (!selectedConversation || !newMessage.trim()) return false;

    try {
      await supabase.rpc('append_dm_message', {
        conversation_id: selectedConversation.id,
        sender_id: currentUser.id,
        message_text: newMessage.trim()
      });

      await updatePresence();
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      return false;
    }
  };

  const handleDMReaction = async (messageId: string, emoji: string) => {
    if (!selectedConversation || !currentUser.id || isReacting) return;

    setIsReacting(true);
    try {
      await supabase.rpc('toggle_dm_reaction', {
        conversation_id: selectedConversation.id,
        message_id: messageId,
        user_id: currentUser.id,
        emoji: emoji
      });
      setShowReactionPicker(null);
    } catch (error) {
      console.error('Error toggling DM reaction:', error);
      // Show user-friendly error message
      show('Failed to add reaction. Please try again.');
    } finally {
      setIsReacting(false);
    }
  };


  const getOtherUser = (conversation: DMConversation) => {
    if (conversation.user1_id === currentUser.id) {
      return {
        id: conversation.user2_id,
        username: conversation.user2_username
      };
    } else {
      return {
        id: conversation.user1_id,
        username: conversation.user1_username
      };
    }
  };

  const getOtherUserData = (conversation: DMConversation) => {
    const otherUser = getOtherUser(conversation);
    return users.find(u => u.id === otherUser.id) || {
      id: otherUser.id,
      username: otherUser.username,
      avatar_color: '#3B82F6'
    };
  };

  if (error) {
    return (
      <ErrorMessage message={error} onRetry={refresh} />
    );
  }




  return (
    <div className="h-screen md:h-screen overflow-hidden bg-gray-900">
      <div className="flex px-2 sm:px-8 lg:px-16 py-2 sm:py-6 h-full gap-2 sm:gap-6 relative min-h-0">
        {/* Contacts Sidebar */}
        <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'}`}> 
          <ContactSidebar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            loading={loading}
            sortedConversations={sortedConversations}
            sortedUsers={sortedUsers}
            selectedConversationId={selectedConversation?.id || null}
            unreadConversations={unreadConversations}
            onSelectConversation={async (conversation) => {
              setSelectedConversation({ ...conversation, messages: [] });
              await loadConversationMessages(conversation.id);
              hasAutoScrolledRef.current = false;
              if (onConversationOpen) {
                onConversationOpen(conversation.id, conversation.updated_at);
              }
            }}
            startConversation={startConversation}
            getOtherUser={getOtherUser}
            getOtherUserData={getOtherUserData}
            activeUserIds={activeUserIds}
            onBackToGroupChat={onBackToGroupChat}
          />
        </div>

        {/* Chat Area */}
        <div className={`${
          selectedConversation ? 'flex' : 'hidden md:flex'
        } flex-1 bg-gray-800 rounded-xl border border-gray-600/50 shadow-xl flex-col overflow-hidden min-h-0 ${
          selectedConversation ? 'fixed md:relative inset-0 md:inset-auto z-10 md:z-auto h-screen w-screen md:h-full md:w-full' : ''
        }`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-600/50 flex items-center justify-between backdrop-blur-sm">
                {/* Mobile back button */}
                <button
                  onClick={() => {
                    setSelectedConversation(null);
                  }}
                  className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-xl transition-colors mr-3"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-3">
                  {(() => {
                    const otherUserData = getOtherUserData(selectedConversation);
                    return (
                      <>
                          <div className="relative w-10 h-10 ring-2 ring-blue-400/30 rounded-full">
                          <div className="w-full h-full rounded-full overflow-hidden">
                              <AvatarImage
                                src={otherUserData.avatar_url}
                                alt={otherUserData.username}
                                className="w-full h-full object-cover"
                                fallbackColor={otherUserData.avatar_color}
                                fallbackText={otherUserData.username.charAt(0).toUpperCase()}
                              />
                            </div>
                            {activeUserIds.includes(otherUserData.id) && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full ring-2 ring-gray-900 z-10" />
                            )}
                          </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {otherUserData.username}
                          </h3>
                          <p className="text-xs text-blue-300/80">Direct Message</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="hidden md:block p-2 text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div 
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {displayedMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg mb-2">Start a conversation</p>
                      <p className="text-gray-500">
                        Send a message to {getOtherUser(selectedConversation).username}
                      </p>
                    </div>
                  </div>
                ) : (
                  displayedMessages.map((message) => (
                    <DMMessageItem
                      key={message.id}
                      message={message}
                      currentUser={currentUser}
                      currentUserData={currentUserData}
                      otherUserData={getOtherUserData(selectedConversation)}
                      onUserClick={onUserClick}
                      onReact={handleDMReaction}
                      showReactionPicker={showReactionPicker}
                      setShowReactionPicker={setShowReactionPicker}
                      isReacting={isReacting}
                      activeUserIds={activeUserIds}
                      latestMessageByUser={latestMessageByUser}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Click outside to close reaction picker */}
              {showReactionPicker && (
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowReactionPicker(null)}
                />
              )}

              {/* Message Input */}
              <div className="p-3 sm:p-4 border-t border-gray-600/50 bg-gray-800/50 safe-area-inset-bottom">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const ok = await sendMessage();
                    if (ok && selectedConversation) {
                      setNewMessage('');
                      localStorage.removeItem(getDraftKey(selectedConversation.id));
                    }
                  }}
                  className="flex justify-center w-full"
                >
                  <div className="relative w-full max-w-2xl min-w-0">
                    <div className="bg-gray-700/80 border border-gray-600/50 rounded-3xl px-3 sm:px-4 pr-12 sm:pr-14 py-2.5 text-white focus-within:ring-2 focus-within:ring-blue-500 shadow-lg transition-all duration-150 backdrop-blur-sm">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value);
                          ensureConnection();
                        }}
                        onFocus={ensureConnection}
                        placeholder={`Message ${getOtherUser(selectedConversation).username}...`}
                        className="w-full bg-transparent placeholder-gray-400 text-sm sm:text-base focus:outline-none"
                        style={{
                          fontSize: '16px', // Prevents zoom on iOS
                          lineHeight: '1.5'
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 sm:p-2.5 rounded-full hover:scale-105 active:scale-95 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <MessageSquare className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Select a conversation</h3>
                <p className="text-gray-400">
                  Choose a user from the contacts list to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}