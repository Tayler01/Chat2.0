import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, MessageSquare, Send, X, Clock, Users, ArrowLeft } from 'lucide-react';
import { Smile } from 'lucide-react';
import { supabase } from '../lib/supabase';
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
}

export function DMsPage({ currentUser, onUserClick, unreadConversations = [], onConversationOpen, initialConversationId, onBackToGroupChat }: DMsPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<DMConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
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

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, avatar_color, bio')
        .neq('id', currentUser.id)
        .order('username');

      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, [currentUser.id]);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('dms')
        .select('*')
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations((data || []).map(normalizeConversation));
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

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
    fetchCurrentUserData();
    fetchUsers();
    fetchConversations();

    setupRealtimeSubscription();

    return () => {
      cleanupConnections();
    };
  }, [
    selectedConversation?.id,
    fetchCurrentUserData,
    fetchUsers,
    fetchConversations,
    setupRealtimeSubscription,
    cleanupConnections
  ]);

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
    <div className="h-screen md:h-[calc(100vh-5rem)] overflow-hidden bg-gray-900">
      <div className="flex px-2 sm:px-8 lg:px-16 py-2 sm:py-6 h-full gap-2 sm:gap-6 relative min-h-0">
        {/* Contacts Sidebar */}
        <div className={`${
          selectedConversation ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 bg-gray-800 rounded-xl border border-gray-600/50 shadow-xl flex-col overflow-hidden`}>
          {/* Search */}
          <div className="p-4 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border-b border-gray-600/50 backdrop-blur-sm">
            <div className="flex items-center mb-3">
              <button
                onClick={() => onBackToGroupChat?.()}
                className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-700/60 rounded-xl transition-colors mr-3"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                Contacts
              </h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-700/80 border border-gray-600/50 text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder-gray-400 backdrop-blur-sm"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-600/50 bg-gray-800/50">
            <button
              onClick={() => setActiveTab('recent')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'recent'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              Recent
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'all'
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-500/10'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              All Users
            </button>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {/* Recent Conversations Tab */}
                {activeTab === 'recent' && (
                  <div className="p-3">
                    {sortedConversations.filter(conv => {
                      const otherUser = getOtherUser(conv);
                      return otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
                    }).length > 0 ? (
                      sortedConversations.filter(conv => {
                        const otherUser = getOtherUser(conv);
                        return otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
                      }).map(conversation => {
                        const otherUserData = getOtherUserData(conversation);
                        const lastMessage = conversation.messages[conversation.messages.length - 1];
                        
                        return (
                          <button
                            key={conversation.id}
                            onClick={() => {
                              setSelectedConversation(conversation);
                              setMessageLimit(Math.min(DM_PAGE_SIZE, conversation.messages.length));
                              hasAutoScrolledRef.current = false;
                              if (onConversationOpen) {
                                onConversationOpen(
                                  conversation.id,
                                  conversation.updated_at
                                );
                              }
                            }}
                            className={`w-full p-3 text-left hover:bg-gray-700/60 rounded-xl transition-all duration-200 mb-2 border border-transparent hover:border-gray-600/30 ${
                              selectedConversation?.id === conversation.id ? 'bg-gray-700/60 border-emerald-500/30' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-600/30">
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
                              <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate flex items-center gap-1">
                                  {otherUserData.username}
                                  {unreadConversations.includes(conversation.id) && (
                                    <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 ml-1" />
                                  )}
                                </p>
                                {lastMessage && (
                                  <p className="text-sm text-gray-400 truncate">
                                    {lastMessage.content}
                                  </p>
                                )}
                              </div>
                              {unreadConversations.includes(conversation.id) && (
                                <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <Clock className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No recent conversations</p>
                        <p className="text-gray-500 text-xs mt-1">Start chatting to see conversations here</p>
                      </div>
                    )}
                  </div>
                )}

                {/* All Users Tab */}
                {activeTab === 'all' && (
                  <div className="p-3">
                    {sortedUsers.filter(user =>
                      user.username.toLowerCase().includes(searchQuery.toLowerCase())
                    ).length > 0 ? (
                      sortedUsers.filter(user =>
                        user.username.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map(user => (
                        <button
                          key={user.id}
                          onClick={() => {
                            startConversation(user);
                          }}
                          className="w-full p-3 text-left hover:bg-gray-700/60 rounded-xl transition-all duration-200 mb-2 border border-transparent hover:border-gray-600/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-600/30">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.username}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div 
                                  className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                                  style={{ backgroundColor: user.avatar_color }}
                                >
                                  {user.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate flex items-center gap-1">
                                {user.username}
                                {(() => {
                                  const conv = getConversationWithUser(user.id);
                                  return conv && unreadConversations.includes(conv.id) ? (
                                    <span className="w-2 h-2 bg-red-500 rounded-full" />
                                  ) : null;
                                })()}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Users className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No users found</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
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
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-blue-400/30">
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
                  displayedMessages.map(message => (
                    <div 
                      key={message.id}
                      className={`flex gap-3 ${
                        message.sender_id === currentUser.id ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <button
                        className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer"
                        onClick={() => {
                          onUserClick?.(message.sender_id);
                        }}
                        title={`View ${message.sender_id === currentUser.id ? currentUser.username : getOtherUser(selectedConversation).username}'s profile`}
                      >
                        {message.sender_id === currentUser.id ? (
                          currentUserData?.avatar_url ? (
                            <img
                              src={currentUserData.avatar_url}
                              alt={currentUser.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                              style={{ backgroundColor: currentUserData?.avatar_color || currentUser.avatar_color }}
                            >
                              {currentUser.username.charAt(0).toUpperCase()}
                            </div>
                          )
                        ) : (() => {
                          const otherUserData = getOtherUserData(selectedConversation);
                          return otherUserData.avatar_url ? (
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
                          );
                        })()}
                      </button>
                      
                      <div className={`flex flex-col max-w-xs sm:max-w-md relative ${
                        message.sender_id === currentUser.id ? 'items-end' : 'items-start'
                      }`}>
                        <div className="relative">
                          <div className={`px-4 py-2 rounded-2xl group ${
                            message.sender_id === currentUser.id
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md shadow-lg border border-blue-500/20'
                              : 'bg-gray-700 text-gray-100 rounded-bl-md shadow-lg border border-gray-600/50'
                          }`}>
                            <p className="text-sm leading-relaxed break-words">{message.content}</p>
                            
                            {/* Reaction button */}
                            <button
                              onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
                              className={`absolute -bottom-2 ${message.sender_id === currentUser.id ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-opacity bg-gray-600 hover:bg-gray-500 rounded-full p-1 shadow-lg`}
                              title="Add reaction"
                            >
                              <Smile className="w-3 h-3 text-gray-200" />
                            </button>
                          </div>

                          {/* Reaction picker */}
                          {showReactionPicker === message.id && (
                            <div
                              className={`absolute z-20 mt-1 ${message.sender_id === currentUser.id ? 'right-0' : 'left-0'} bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 flex gap-1 shadow-xl`}
                            >
                              {['❤️', '👍', '😂', '😮', '😢', '😡'].map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleDMReaction(message.id, emoji)}
                                  disabled={isReacting}
                                  className="hover:scale-110 transition-transform p-1 hover:bg-gray-700 rounded disabled:opacity-50"
                                  title={`React with ${emoji}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Existing reactions */}
                          {message.reactions && Object.keys(message.reactions).length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-1 ${message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                              {Object.entries(message.reactions).map(([emoji, users]) => {
                                const count = getReactionCount(message.reactions, emoji);
                                const userReacted = hasUserReacted(message.reactions, emoji);
                                
                                if (count === 0) return null;
                                
                                return (
                                  <button
                                    key={emoji}
                                    onClick={() => handleDMReaction(message.id, emoji)}
                                    disabled={isReacting}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all hover:scale-105 disabled:opacity-50 ${
                                      userReacted
                                        ? 'bg-blue-600 text-white border border-blue-500'
                                        : 'bg-gray-600 text-gray-200 border border-gray-500 hover:bg-gray-500'
                                    }`}
                                    title={`${users.length} reaction${users.length !== 1 ? 's' : ''}`}
                                  >
                                    <span>{emoji}</span>
                                    <span className="font-medium">{count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        
                        <span className="text-xs text-gray-400 mt-1">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                    </div>
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