import React from 'react';
import { Smile } from 'lucide-react';
import { DMMessage, User } from '../../hooks/useDirectMessages';

interface DMMessageItemProps {
  message: DMMessage;
  currentUser: User;
  currentUserData: User | null;
  otherUser: User;
  onUserClick?: (id: string) => void;
  showReactionPicker: string | null;
  setShowReactionPicker: (id: string | null) => void;
  handleReaction: (messageId: string, emoji: string) => void;
  isReacting: boolean;
  getReactionCount: (reactions: Record<string, string[]> | undefined, emoji: string) => number;
  hasUserReacted: (reactions: Record<string, string[]> | undefined, emoji: string) => boolean;
  formatTime: (timestamp: string) => string;
  latestMessageByUser: Map<string, string>;
  activeUserIds: string[];
}

export function DMMessageItem({
  message,
  currentUser,
  currentUserData,
  otherUser,
  onUserClick,
  showReactionPicker,
  setShowReactionPicker,
  handleReaction,
  isReacting,
  getReactionCount,
  hasUserReacted,
  formatTime,
  latestMessageByUser,
  activeUserIds,
}: DMMessageItemProps) {
  return (
    <div
      className={`flex gap-3 ${message.sender_id === currentUser.id ? 'flex-row-reverse' : ''}`}
    >
      <button
        className="relative w-8 h-8 flex-shrink-0 hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer rounded-full"
        onClick={() => onUserClick?.(message.sender_id)}
        title={`View ${message.sender_id === currentUser.id ? currentUser.username : otherUser.username}'s profile`}
      >
        <div className="w-full h-full rounded-full overflow-hidden">
          {message.sender_id === currentUser.id ? (
            currentUserData?.avatar_url ? (
              <img src={currentUserData.avatar_url} alt={currentUser.username} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: currentUserData?.avatar_color || currentUser.avatar_color }}
              >
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
            )
          ) : otherUser.avatar_url ? (
            <img src={otherUser.avatar_url} alt={otherUser.username} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: otherUser.avatar_color }}
            >
              {otherUser.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        {activeUserIds.includes(message.sender_id) && latestMessageByUser.get(message.sender_id) === message.id && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full ring-2 ring-gray-900 z-10" />
        )}
      </button>

      <div
        className={`flex flex-col max-w-xs sm:max-w-md relative ${
          message.sender_id === currentUser.id ? 'items-end' : 'items-start'
        }`}
      >
        <div className="relative">
          <div
            className={`px-4 py-2 rounded-2xl group ${
              message.sender_id === currentUser.id
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md shadow-lg border border-blue-500/20'
                : 'bg-gray-700 text-gray-100 rounded-bl-md shadow-lg border border-gray-600/50'
            }`}
          >
            <p className="text-sm leading-relaxed break-words">{message.content}</p>
            <button
              onClick={() => setShowReactionPicker(showReactionPicker === message.id ? null : message.id)}
              className={`absolute -bottom-2 ${
                message.sender_id === currentUser.id ? 'left-2' : 'right-2'
              } opacity-0 group-hover:opacity-100 transition-opacity bg-gray-600 hover:bg-gray-500 rounded-full p-1 shadow-lg`}
              title="Add reaction"
            >
              <Smile className="w-3 h-3 text-gray-200" />
            </button>
          </div>
          {showReactionPicker === message.id && (
            <div
              className={`absolute z-20 mt-1 ${
                message.sender_id === currentUser.id ? 'right-0' : 'left-0'
              } bg-gray-800 border border-gray-600 rounded-lg px-2 py-1 flex gap-1 shadow-xl`}
            >
              {['❤️', '👍', '😂', '😮', '😢', '😡'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(message.id, emoji)}
                  disabled={isReacting}
                  className="hover:scale-110 transition-transform p-1 hover:bg-gray-700 rounded disabled:opacity-50"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div
              className={`flex flex-wrap gap-1 mt-1 ${
                message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'
              }`}
            >
              {Object.entries(message.reactions).map(([emoji, users]) => {
                const count = getReactionCount(message.reactions, emoji);
                const userReacted = hasUserReacted(message.reactions, emoji);
                if (count === 0) return null;
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(message.id, emoji)}
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
        <span className="text-xs text-gray-400 mt-1">{formatTime(message.created_at)}</span>
      </div>
    </div>
  );
}
