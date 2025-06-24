import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Search,
  MessageSquare,
  Send,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toast';
import { Avatar } from './Avatar';
import { DMMessageRow } from './DMMessageRow';

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
  const c = conv as Partial<DMConversation> & { messages?: unknown };
  return {
    ...(c as DMConversation),
    messages: Array.isArray(c.messages) ? (c.messages as DMMessage[]) : []
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

export function DMsPage({ currentUser, unreadConversations = [], onConversationOpen, initialConversationId, onBackToGroupChat, activeUserIds }: DMsPageProps) {
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(initialConversationId);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<List>(null);
  const messagesWrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(0);
  const { show } = useToast();
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    const updateHeight = () => {
      if (messagesWrapperRef.current) {
        setListHeight(messagesWrapperRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && selectedConversation) {
      setShowSidebar(false);
    }
  }, [isMobile, selectedConversation]);


  const loadConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dms')
        .select('*')
        .or(`user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const normalizedConversations = (data || []).map(normalizeConversation);
      setConversations(normalizedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      show('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, show]);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, avatar_url, avatar_color, bio')
        .ilike('username', `%${query}%`)
        .neq('id', currentUser.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
      show('Failed to search users');
    } finally {
      setIsSearching(false);
    }
  }, [currentUser.id, show]);

  const startConversation = useCallback(async (otherUser: User) => {
    try {
      const user1Id =
        currentUser.id < otherUser.id ? currentUser.id : otherUser.id;
      const user2Id =
        currentUser.id < otherUser.id ? otherUser.id : currentUser.id;

      const { data: existingConv, error: checkError } = await supabase
        .from('dms')
        .select('id')
        .eq('user1_id', user1Id)
        .eq('user2_id', user2Id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingConv) {
        setSelectedConversation(existingConv.id);
        setSearchQuery('');
        setSearchResults([]);
        setShowSidebar(false);
        return;
      }

      const user1Username =
        currentUser.id < otherUser.id ? currentUser.username : otherUser.username;
      const user2Username =
        currentUser.id < otherUser.id ? otherUser.username : currentUser.username;

      const { data: newConv, error: insertError } = await supabase
        .from('dms')
        .insert({
          user1_id: user1Id,
          user2_id: user2Id,
          user1_username: user1Username,
          user2_username: user2Username,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newConversation: DMConversation = {
        ...newConv,
        messages: []
      };

      setConversations(prev => [newConversation, ...prev]);
      setSelectedConversation(newConv.id);
      setSearchQuery('');
      setSearchResults([]);
      setShowSidebar(false);
    } catch (error) {
      console.error('Error starting conversation:', error);
      show('Failed to start conversation');
    }
  }, [currentUser, show]);

  const currentConversation = useMemo(() => {
    return conversations.find(conv => conv.id === selectedConversation);
  }, [conversations, selectedConversation]);

  const scrollToBottom = useCallback(() => {
    if (listRef.current && currentConversation) {
      listRef.current.scrollToItem(currentConversation.messages.length - 1);
    }
  }, [currentConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [conversations, selectedConversation, scrollToBottom]);

  const getOtherUser = useCallback((conversation: DMConversation) => {
    return conversation.user1_id === currentUser.id
      ? { id: conversation.user2_id, username: conversation.user2_username }
      : { id: conversation.user1_id, username: conversation.user1_username };
  }, [currentUser.id]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('dm_messages')
        .insert({
          conversation_id: selectedConversation,
          sender_id: currentUser.id,
          content: newMessage.trim()
        })
        .select()
        .single();

      if (error) throw error;

      setConversations(prev => prev.map(conv => {
        if (conv.id === selectedConversation) {
          return {
            ...conv,
            messages: [...conv.messages, data],
            updated_at: new Date().toISOString()
          };
        }
        return conv;
      }));

      setNewMessage('');
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      show('Failed to send message');
    } finally {
      setSending(false);
    }
  }, [newMessage, selectedConversation, currentUser.id, sending, show, scrollToBottom]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation) return;
      const conv = conversations.find(c => c.id === selectedConversation);
      if (!conv || conv.messages.length > 0) return;

      try {
        const { data, error } = await supabase
          .from('dm_messages')
          .select('*')
          .eq('conversation_id', selectedConversation)
          .order('created_at');

        if (error) throw error;

        setConversations(prev =>
          prev.map(c =>
            c.id === selectedConversation ? { ...c, messages: data || [] } : c
          )
        );
      } catch (err) {
        console.error('Error loading messages:', err);
        show('Failed to load messages');
      }
    };

    fetchMessages();
  }, [selectedConversation, conversations, show]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchUsers]);

  useEffect(() => {
    if (initialConversationId) {
      setSelectedConversation(initialConversationId);
    }
  }, [initialConversationId]);


  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const isUserActive = useCallback((userId: string) => {
    return activeUserIds.includes(userId);
  }, [activeUserIds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-900">
      {isMobile && showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-10"
          onClick={() => setShowSidebar(false)}
        />
      )}
      {/* Sidebar */}
      <div
        className={`w-80 bg-gray-800 border-r border-gray-700 flex flex-col transform transition-transform duration-300 ${
          isMobile ? 'fixed inset-y-0 left-0 z-20' : ''
        } ${isMobile && !showSidebar ? '-translate-x-full' : 'translate-x-0'}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Direct Messages
            </h2>
            {onBackToGroupChat && (
              <button
                onClick={onBackToGroupChat}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                title="Back to group chat"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="border-b border-gray-700">
            <div className="p-3">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Search Results</h3>
              {isSearching ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => startConversation(user)}
                      className="w-full flex items-center p-2 rounded-lg hover:bg-gray-700 transition-colors text-left"
                    >
                      <div className="relative">
                        <Avatar
                          url={user.avatar_url}
                          alt={user.username}
                          color={user.avatar_color}
                          className="w-8 h-8 rounded-full"
                        />
                        {isUserActive(user.id) && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full"></div>
                        )}
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {user.username}
                        </p>
                        {user.bio && (
                          <p className="text-xs text-gray-400 truncate">
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 py-2">No users found</p>
              )}
            </div>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No conversations yet</p>
              <p className="text-gray-500 text-xs mt-1">Search for users to start chatting</p>
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conversation) => {
                const otherUser = getOtherUser(conversation);
                const lastMessage = conversation.messages[conversation.messages.length - 1];
                const isUnread = unreadConversations.includes(conversation.id);
                
                return (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      setSelectedConversation(conversation.id);
                      onConversationOpen?.(conversation.id, conversation.updated_at);
                      setShowSidebar(false);
                    }}
                    className={`w-full flex items-center p-3 rounded-lg transition-colors mb-1 ${
                      selectedConversation === conversation.id
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <div className="relative">
                      <Avatar
                        url={undefined}
                        alt={otherUser.username}
                        color="#3B82F6"
                        className="w-8 h-8 rounded-full"
                      />
                      {isUserActive(otherUser.id) && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full"></div>
                      )}
                    </div>
                    <div className="ml-3 flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${
                          selectedConversation === conversation.id ? 'text-white' : 'text-white'
                        }`}>
                          {otherUser.username}
                        </p>
                        {lastMessage && (
                          <span className={`text-xs ${
                            selectedConversation === conversation.id ? 'text-blue-200' : 'text-gray-400'
                          }`}>
                            {formatTime(lastMessage.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <p className={`text-xs truncate ${
                          selectedConversation === conversation.id ? 'text-blue-200' : 'text-gray-400'
                        }`}>
                          {lastMessage ? lastMessage.content : 'No messages yet'}
                        </p>
                        {isUnread && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-700 bg-gray-800">
              <div className="flex items-center">
                {isMobile && (
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="mr-2 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                )}
                <div className="relative">
                  <Avatar
                    url={undefined}
                    alt={getOtherUser(currentConversation).username}
                    color="#3B82F6"
                    className="w-8 h-8 rounded-full"
                  />
                  {isUserActive(getOtherUser(currentConversation).id) && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-800 rounded-full"></div>
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-white">
                    {getOtherUser(currentConversation).username}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {isUserActive(getOtherUser(currentConversation).id) ? 'Active now' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesWrapperRef} className="flex-1 overflow-hidden p-4">
              {currentConversation.messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No messages yet</p>
                  <p className="text-gray-500 text-sm mt-1">Start the conversation!</p>
                </div>
              ) : (
                listHeight > 0 && (
                  <List
                    height={listHeight}
                    itemCount={currentConversation.messages.length}
                    itemSize={80}
                    width="100%"
                    outerRef={containerRef}
                    ref={listRef}
                    itemData={{ messages: currentConversation.messages, currentUserId: currentUser.id, formatTime }}
                    className="overflow-x-hidden"
                  >
                    {DMMessageRow}
                  </List>
                )
              )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-700 bg-gray-800">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={1}
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Select a conversation</h3>
              <p className="text-gray-400">Choose a conversation from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}