import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import { Message } from '../types/message';
import { supabase } from '../lib/supabase';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onUserClick?: (userId: string) => void;
  currentUserId?: string;
}

export function MessageBubble({ message, isOwnMessage, onUserClick, currentUserId }: MessageBubbleProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [isReacting, setIsReacting] = useState(false);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const reactions = message.reactions || {};
  const emojis = ['❤️', '👍', '😂', '😮', '😢', '😡'];

  const handleReaction = async (emoji: string) => {
    if (!currentUserId || isReacting) return;

    setIsReacting(true);
    try {
      await supabase.rpc('toggle_message_reaction', {
        message_id: message.id,
        user_id: currentUserId,
        emoji: emoji
      });
      setShowPicker(false);
    } catch (error) {
      console.error('Error toggling reaction:', error);
      // Show user-friendly error message
      alert('Failed to add reaction. Please try again.');
    } finally {
      setIsReacting(false);
    }
  };

  const getReactionCount = (emoji: string) => {
    const users = reactions[emoji] || [];
    return Array.isArray(users) ? users.length : 0;
  };

  const hasUserReacted = (emoji: string) => {
    const users = reactions[emoji] || [];
    return Array.isArray(users) && users.includes(currentUserId);
  };

  const getReactionUsers = (emoji: string) => {
    const users = reactions[emoji] || [];
    return Array.isArray(users) ? users : [];
  };

  return (
    <div className={`flex gap-2 sm:gap-3 mb-3 sm:mb-4 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <button
        onClick={() => onUserClick?.(message.user_id)}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer overflow-hidden relative"
        style={{ backgroundColor: message.avatar_color }}
        title={`View ${message.user_name}'s profile`}
      >
        {message.avatar_url ? (
          <img
            src={message.avatar_url}
            alt={message.user_name}
            className="w-full h-full rounded-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallback = parent.querySelector('.avatar-fallback') as HTMLElement;
                if (fallback) {
                  fallback.style.display = 'flex';
                }
              }
            }}
          />
        ) : (
          message.user_name.charAt(0).toUpperCase()
        )}
        {message.avatar_url && (
          <span className="avatar-fallback absolute inset-0 flex items-center justify-center text-white text-xs sm:text-sm font-medium" style={{ display: 'none' }}>
            {message.user_name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>
      
      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[200px] sm:max-w-xs md:max-w-md min-w-0`}>
        <div className="relative">
          <div
            className={`px-4 py-2 rounded-2xl group ${
              isOwnMessage
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md shadow-lg'
                : 'bg-gray-700 text-gray-100 rounded-bl-md shadow-lg border border-gray-600'
            }`}
          >
            <p className="text-xs sm:text-sm leading-relaxed break-words overflow-wrap-anywhere">{message.content}</p>
            
            {/* Reaction button */}
            <button
              onClick={() => setShowPicker(!showPicker)}
              className={`absolute -bottom-2 ${isOwnMessage ? 'left-2' : 'right-2'} opacity-0 group-hover:opacity-100 transition-opacity bg-gray-600 hover:bg-gray-500 rounded-full p-1 shadow-lg`}
              title="Add reaction"
            >
              <Smile className="w-3 h-3 text-gray-200" />
            </button>
          </div>

          {/* Reaction picker */}
          {showPicker && (
            <div
              className={`absolute z-20 mt-1 ${isOwnMessage ? 'right-0' : 'left-0'} bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 flex gap-1 shadow-xl`}
            >
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
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
          {Object.keys(reactions).length > 0 && (
            <div className={`flex flex-wrap gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(reactions).map(([emoji, users]) => {
                const count = getReactionCount(emoji);
                const userReacted = hasUserReacted(emoji);
                const reactionUsers = getReactionUsers(emoji);
                
                if (count === 0) return null;
                
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    disabled={isReacting}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all hover:scale-105 disabled:opacity-50 ${
                      userReacted
                        ? 'bg-blue-600 text-white border border-blue-500'
                        : 'bg-gray-600 text-gray-200 border border-gray-500 hover:bg-gray-500'
                    }`}
                    title={`${reactionUsers.length} reaction${reactionUsers.length !== 1 ? 's' : ''}`}
                  >
                    <span>{emoji}</span>
                    <span className="font-medium">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        
        <div className={`flex items-center gap-1 sm:gap-2 mt-1 text-xs text-gray-400 ${
          isOwnMessage ? 'flex-row-reverse' : ''
        }`}>
          <span className="font-medium text-xs">{message.user_name}</span>
          <span>•</span>
          <span className="text-xs">{formatTime(message.created_at)}</span>
        </div>
      </div>

      {/* Click outside to close picker */}
      {showPicker && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}