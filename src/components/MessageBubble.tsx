import React, { useState } from 'react';
import { Message } from '../types/message';

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onUserClick?: (userId: string) => void;
}

export function MessageBubble({ message, isOwnMessage, onUserClick }: MessageBubbleProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [showPicker, setShowPicker] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);

  const togglePicker = () => setShowPicker((p) => !p);
  const selectReaction = (emoji: string) => {
    setReaction(emoji);
    setShowPicker(false);
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
              // If image fails to load, hide it and show initials
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
        <div
          className={`px-4 py-2 rounded-2xl relative cursor-pointer ${
            isOwnMessage
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md shadow-lg'
              : 'bg-gray-700 text-gray-100 rounded-bl-md shadow-lg border border-gray-600'
          }`}
          onClick={togglePicker}
        >
          {showPicker && (
            <div
              className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-700 border border-gray-500 rounded-lg px-2 py-1 flex gap-1 shadow-lg z-10"
            >
              {['❤️', '👍', '😂', '👎'].map((emo) => (
                <button
                  key={emo}
                  className="hover:scale-110 transition-transform"
                  onClick={(e) => {
                    e.stopPropagation();
                    selectReaction(emo);
                  }}
                >
                  {emo}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs sm:text-sm leading-relaxed break-words overflow-wrap-anywhere">{message.content}</p>
          {reaction && (
            <span
              className={`absolute -top-3 ${
                isOwnMessage ? 'right-0' : 'left-0'
              } text-xl select-none`}
            >
              {reaction}
            </span>
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
    </div>
  );
}