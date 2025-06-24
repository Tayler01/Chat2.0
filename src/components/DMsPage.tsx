import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, X, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { updatePresence } from '../utils/updatePresence';
import { useToast } from './Toast';
import { useDirectMessages, User, DMConversation, DMMessage } from '../hooks/useDirectMessages';
import { ContactSidebar } from './dms/ContactSidebar';
import { DMMessageItem } from './dms/DMMessageItem';


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
  const { users, conversations, currentUserData, loading, fetchConversations, fetchUsers, setConversations } = useDirectMessages(currentUser.id);
  const [selectedConversation, setSelectedConversation] = useState<DMConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recent' | 'all'>('all');
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
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [cleanupConnections, selectedConversation?.id, currentUser.id]);

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

    if (
      container.scrollTop === 0 &&
      messageLimit < selectedConversation.messages.length &&
      !isLoadingMoreRef.current
    ) {
      const previousHeight = container.scrollHeight;
      isLoadingMoreRef.current = true;
      setMessageLimit((limit) =>
        Math.min(limit + DM_PAGE_SIZE, selectedConversation.messages.length)
      );

      setTimeout(() => {
        requestAnimationFrame(() => {
          const newHeight = container.scrollHeight;
          container.scrollTop = newHeight - previousHeight;
          isLoadingMoreRef.current = false;
        });
      }, 100);
    }
  }, [messageLimit, selectedConversation]);

  useEffect(() => {
    if (initialConversationId && conversations.length > 0 && !selectedConversation) {
      const conv = conversations.find(c => c.id === initialConversationId);
      if (conv) {
        const normalized = normalizeConversation(conv);
        setSelectedConversation(normalized);
        setMessageLimit(Math.min(DM_PAGE_SIZE, normalized.messages.length));
        hasAutoScrolledRef.current = false;
        if (onConversationOpen) {
          onConversationOpen(normalized.id, normalized.updated_at);
        }
      }
    }
  }, [initialConversationId, conversations, selectedConversation, onConversationOpen]);

  useEffect(() => {
    setupRealtimeSubscription();
    return () => {
      cleanupConnections();
    };
  }, [selectedConversation?.id, setupRealtimeSubscription, cleanupConnections]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchUsers();
      fetchConversations();
      updatePresence();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    };

    window.addEventListener('focus', handleRefresh);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleRefresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchUsers, fetchConversations]);


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
        .select('*')
        .eq('id', conversationId)
        .single();

      if (fetchError) throw fetchError;

      const normalized = normalizeConversation(conversation);
      setSelectedConversation(normalized);
      setMessageLimit(Math.min(DM_PAGE_SIZE, normalized.messages.length));
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

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    try {
      await supabase.rpc('append_dm_message', {
        conversation_id: selectedConversation.id,
        sender_id: currentUser.id,
        message_text: newMessage.trim()
      });

      setNewMessage('');
      await updatePresence();
    } catch (err) {
      console.error('Error sending message:', err);
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

  const getReactionCount = (reactions: Record<string, string[]> | undefined, emoji: string) => {
    if (!reactions) return 0;
    const users = reactions[emoji] || [];
    return Array.isArray(users) ? users.length : 0;
  };

  const hasUserReacted = (reactions: Record<string, string[]> | undefined, emoji: string) => {
    if (!reactions) return false;
    const users = reactions[emoji] || [];
    return Array.isArray(users) && users.includes(currentUser.id);
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


  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  return (
    <div className="h-screen md:h-screen overflow-hidden bg-gray-900">
      <div className="flex px-2 sm:px-8 lg:px-16 py-2 sm:py-6 h-full gap-2 sm:gap-6 relative min-h-0">
        {/* Contacts Sidebar */}
        <ContactSidebar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          loading={loading}
          conversations={conversations}
          users={users}
          unreadConversations={unreadConversations}
          activeUserIds={activeUserIds}
          selectedConversation={selectedConversation}
          onSelectConversation={(conv) => {
            setSelectedConversation(conv);
            setMessageLimit(Math.min(DM_PAGE_SIZE, conv.messages.length));
            hasAutoScrolledRef.current = false;
            if (onConversationOpen) {
              onConversationOpen(conv.id, conv.updated_at);
            }
          }}
          startConversation={startConversation}
          getOtherUserData={getOtherUserData}
          getOtherUser={getOtherUser}
          onBackToGroupChat={onBackToGroupChat}
        />

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
                              {otherUserData.avatar_url ? (
                                <img
                                  src={otherUserData.avatar_url}
                                  alt={otherUserData.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                                  style={{ backgroundColor: otherUserData.avatar_color }}
                                >
                                  {otherUserData.username.charAt(0).toUpperCase()}
                                </div>
                              )}
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
                      otherUser={getOtherUserData(selectedConversation)}
                      onUserClick={onUserClick}
                      showReactionPicker={showReactionPicker}
                      setShowReactionPicker={setShowReactionPicker}
                      handleReaction={handleDMReaction}
                      isReacting={isReacting}
                      getReactionCount={getReactionCount}
                      hasUserReacted={hasUserReacted}
                      formatTime={formatTime}
                      latestMessageByUser={latestMessageByUser}
                      activeUserIds={activeUserIds}
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
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="flex justify-center w-full"
                >
                  <div className="relative w-full max-w-2xl min-w-0">
                    <div className="bg-gray-700/80 border border-gray-600/50 rounded-3xl px-3 sm:px-4 pr-12 sm:pr-14 py-2.5 text-white focus-within:ring-2 focus-within:ring-blue-500 shadow-lg transition-all duration-150 backdrop-blur-sm">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
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