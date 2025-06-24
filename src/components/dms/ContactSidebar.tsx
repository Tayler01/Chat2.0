import React from 'react';
import { Search, MessageSquare, Clock, Users, ArrowLeft } from 'lucide-react';
import { AvatarImage } from '../AvatarImage';

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

interface ContactSidebarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  activeTab: 'recent' | 'all';
  setActiveTab: (tab: 'recent' | 'all') => void;
  loading: boolean;
  sortedConversations: DMConversation[];
  sortedUsers: User[];
  selectedConversationId: string | null;
  unreadConversations: string[];
  onSelectConversation: (conv: DMConversation) => void;
  startConversation: (user: User) => void;
  getOtherUser: (conv: DMConversation) => { id: string; username: string };
  getOtherUserData: (conv: DMConversation) => User;
  activeUserIds: string[];
  onBackToGroupChat?: () => void;
}

export function ContactSidebar({
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab,
  loading,
  sortedConversations,
  sortedUsers,
  selectedConversationId,
  unreadConversations,
  onSelectConversation,
  startConversation,
  getOtherUser,
  getOtherUserData,
  activeUserIds,
  onBackToGroupChat,
}: ContactSidebarProps) {
  return (
    <div className="w-full md:w-80 bg-gray-800 rounded-xl border border-gray-600/50 shadow-xl flex-col overflow-hidden">
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
            {activeTab === 'recent' && (
              <div className="p-3">
                {sortedConversations.filter((conv) => {
                  const otherUser = getOtherUser(conv);
                  return otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
                }).length > 0 ? (
                  sortedConversations
                    .filter((conv) => {
                      const otherUser = getOtherUser(conv);
                      return otherUser.username.toLowerCase().includes(searchQuery.toLowerCase());
                    })
                    .map((conversation) => {
                      const otherUserData = getOtherUserData(conversation);
                      const lastMessage = conversation.messages[conversation.messages.length - 1];
                      return (
                        <button
                          key={conversation.id}
                          onClick={() => onSelectConversation(conversation)}
                          className={`w-full p-3 text-left hover:bg-gray-700/60 rounded-xl transition-all duration-200 mb-2 border border-transparent hover:border-gray-600/30 ${
                            selectedConversationId === conversation.id ? 'bg-gray-700/60 border-emerald-500/30' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 flex-shrink-0 ring-2 ring-gray-600/30 rounded-full">
                              <div className="w-full h-full rounded-full overflow-hidden">
                                <AvatarImage
                                  src={otherUserData.avatar_url}
                                  alt={otherUserData.username}
                                  className="w-full h-full object-cover"
                                  fallbackColor={otherUserData.avatar_color}
                                  fallbackText={otherUserData.username.charAt(0).toUpperCase()}
                                />
                              </div>
                              {activeUserIds.includes(otherUserData.id) && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full ring-2 ring-gray-900 z-10" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate flex items-center gap-1">
                                {otherUserData.username}
                                {unreadConversations.includes(conversation.id) && <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 ml-1" />}
                              </p>
                              {lastMessage && <p className="text-sm text-gray-400 truncate">{lastMessage.content}</p>}
                            </div>
                            {unreadConversations.includes(conversation.id) && <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full" />}
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

            {activeTab === 'all' && (
              <div className="p-3">
                {sortedUsers.filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                  sortedUsers
                    .filter((u) => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => startConversation(user)}
                        className="w-full p-3 text-left hover:bg-gray-700/60 rounded-xl transition-all duration-200 mb-2 border border-transparent hover:border-gray-600/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 flex-shrink-0 ring-2 ring-gray-600/30 rounded-full">
                            <div className="w-full h-full rounded-full overflow-hidden">
                              <AvatarImage
                                src={user.avatar_url}
                                alt={user.username}
                                className="w-full h-full object-cover"
                                fallbackColor={user.avatar_color}
                                fallbackText={user.username.charAt(0).toUpperCase()}
                              />
                            </div>
                            {activeUserIds.includes(user.id) && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full ring-2 ring-gray-900 z-10" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate flex items-center gap-1">
                              {user.username}
                              {(() => {
                                const conv = sortedConversations.find((c) => c.user1_id === user.id || c.user2_id === user.id);
                                return conv && unreadConversations.includes(conv.id) ? <span className="w-2 h-2 bg-red-500 rounded-full" /> : null;
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
  );
}

