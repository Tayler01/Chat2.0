import React, { useState } from 'react';
import { LogOut, User, UserCircle, Users, MessageCircle, Menu, X } from 'lucide-react';

type PageType = 'group-chat' | 'dms' | 'profile';

interface ChatHeaderProps {
  userName: string;
  onClearUser: () => void;
  onShowProfile: () => void;
  currentPage: PageType;
  onPageChange: (page: PageType) => void;
}

export function ChatHeader({ userName, onClearUser, onShowProfile, currentPage, onPageChange }: ChatHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const handleClearUser = () => {
    onClearUser();
    setShowMenu(false);
  };

  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4 shadow-lg relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-6 sm:ml-8">
          {/* Logo */}
          <img 
            src="https://ik.imagekit.io/cryptolord17/ShadowMessage/ChatGPT%20Image%20Jun%2018,%202025,%2009_32_24%20AM.png?updatedAt=1750253867456"
            alt="ShadowMessage Logo"
            className="hidden sm:block w-10 h-10 rounded-lg shadow-lg object-cover"
            style={{ 
              objectFit: 'cover',
              objectPosition: 'center',
              transform: 'scale(4)',
              transformOrigin: 'center'
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
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                currentPage === 'dms'
                  ? 'bg-gray-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
              title="Direct Messages"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">DMs</span>
            </button>
          </div>
          
          {/* Mobile Navigation Toggle */}
          <button
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="md:hidden p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors ml-2"
          >
            {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
              <MessageCircle className="w-5 h-5" />
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