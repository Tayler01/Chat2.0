import React, { useState } from 'react';
import { LogOut, UserCircle, Users, MessageCircle, Menu, X } from 'lucide-react';

type PageType = 'group-chat' | 'dms' | 'profile';

interface ChatHeaderProps {
  userName: string;
  onClearUser: () => void;
  onShowProfile: () => void;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
  hasUnreadDMs?: boolean;
  activeUsers?: { id: string; username: string; avatar_url: string | null; avatar_color: string; }[];
}

export function ChatHeader({ userName, onClearUser, onShowProfile, currentPage, onPageChange, hasUnreadDMs, activeUsers = [] }: ChatHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const handleClearUser = () => {
    onClearUser();
    setShowMenu(false);
  };

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 sm:p-4 shadow-lg fixed sm:sticky top-0 left-0 right-0 z-50 safe-area-inset-top">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-6 sm:ml-8">
          {/* Logo */}
          <img 
            src="https://ik.imagekit.io/cryptolord17/ShadowMessage/ChatGPT%20Image%20Jun%2018,%202025,%2009_32_24%20AM.png?updatedAt=1750267859499"
            alt="ShadowMessage Logo"
            className="hidden sm:block h-10 w-auto rounded-lg shadow-lg"
            style={{ 
              objectFit: 'contain',
              height: '42px'
            }}
          />
          
          {/* Desktop Navigation Icons */}
          <div className="hidden md:flex items-center gap-2 ml-8">
            <button
              onClick={() => onPageChange('group-chat')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                currentPage === 'group-chat'
                  ? 'bg-gray-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
              title="Group Chat"
            >
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium">Group Chat</span>
            </button>
            
            <button
              onClick={() => onPageChange('dms')}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                currentPage === 'dms'
                  ? 'bg-gray-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
              title="Direct Messages"
            >
              <MessageCircle className="w-5 h-5" />
              {hasUnreadDMs && (
                <span className="absolute -top-1 -right-1 block w-2 h-2 bg-red-500 rounded-full" />
              )}
              <span className="text-sm font-medium">DMs</span>
            </button>
          </div>
          
          {/* Mobile Navigation Toggle */}
          <button
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="relative md:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors ml-2"
          >
            {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            {hasUnreadDMs && !showMobileNav && (
              <span className="absolute -top-1 -right-1 block w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Profile Icon */}
          <button
            onClick={onShowProfile}
            className={`hidden sm:block p-2 rounded-lg transition-colors ${
              currentPage === 'profile'
                ? 'bg-gray-600 text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
            title="Profile"
          >
            <UserCircle className="w-6 h-6" />
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 sm:gap-3 text-sm text-gray-300 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
          >
            <span className="font-medium hidden sm:inline">{userName}</span>
            <LogOut className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-2 min-w-48 z-10 backdrop-blur-sm">
              <button
                onClick={handleClearUser}
                className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}

          {/* Overlay to close menu when clicking outside */}
          {showMenu && (
            <div 
              className="fixed inset-0 z-0" 
              onClick={() => setShowMenu(false)}
            />
          )}
          </div>
        </div>
      </div>

      {currentPage === 'group-chat' && activeUsers.length > 0 && (
        <>
          {/* Desktop active users */}
          <div className="hidden md:flex absolute inset-0 pointer-events-none items-center justify-center gap-2">
            {activeUsers.map((u) => (
              <div key={u.id} className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-gray-700">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-medium text-white" style={{ backgroundColor: u.avatar_color }}>
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile active users */}
          <div className="flex md:hidden absolute inset-0 pointer-events-none items-center justify-center gap-2 px-2">
            {activeUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-1 text-[10px] text-gray-300 bg-gray-800/70 px-1 rounded">
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="whitespace-nowrap">{u.username}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Mobile Navigation Menu */}
      {showMobileNav && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-gray-800 border-b border-gray-700 shadow-lg z-50">
          <div className="p-4 space-y-2">
            <button
              onClick={() => {
                onPageChange('group-chat');
                setShowMobileNav(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                currentPage === 'group-chat'
                  ? 'bg-gray-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">Group Chat</span>
            </button>
            
            <button
              onClick={() => {
                onPageChange('dms');
                setShowMobileNav(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                currentPage === 'dms'
                  ? 'bg-gray-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <div className="relative">
                <MessageCircle className="w-5 h-5" />
                {hasUnreadDMs && (
                  <span className="absolute -top-1 -right-1 block w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
              <span className="font-medium">Direct Messages</span>
            </button>
            
            <button
              onClick={() => {
                onShowProfile();
                setShowMobileNav(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                currentPage === 'profile'
                  ? 'bg-gray-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <UserCircle className="w-5 h-5" />
              <span className="font-medium">Profile</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Mobile overlay */}
      {showMobileNav && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 z-40" 
          onClick={() => setShowMobileNav(false)}
        />
      )}
    </div>
  );
}