import React, { useEffect, useRef, useCallback } from 'react';
import { MessageBubble } from './MessageBubble';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { DateDivider } from './DateDivider';
import { formatDateGroup } from '../utils/formatDateGroup';
import { Message } from '../types/message';

interface ChatAreaProps {
  messages: Message[];
  currentUserId: string;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  fetchOlderMessages: () => void;
  hasMore: boolean;
  onUserClick?: (userId: string) => void;
}

export function ChatArea({
  messages,
  currentUserId,
  loading,
  error,
  onRetry,
  fetchOlderMessages,
  hasMore,
  onUserClick,
}: ChatAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;

    if (!hasAutoScrolled.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      hasAutoScrolled.current = true;
    } else if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = useCallback(() => {
  const container = containerRef.current;
  if (!container || !hasMore || isFetchingRef.current) return;

  if (container.scrollTop === 0) {
    const previousHeight = container.scrollHeight;
    isFetchingRef.current = true;

    fetchOlderMessages();
    
    // Use a timeout to restore scroll position after messages load
    setTimeout(() => {
      requestAnimationFrame(() => {
        const newHeight = container.scrollHeight;
        container.scrollTop = newHeight - previousHeight;

        isFetchingRef.current = false;
      });
    }, 100);
  }
  }, [fetchOlderMessages, hasMore]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  if (loading && messages.length === 0) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={onRetry} />;
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center flex-1">
        <div>
          <p className="text-gray-400 text-lg mb-2">No messages yet</p>
          <p className="text-gray-500">Be the first to say hello! 👋</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 space-y-1 bg-gray-900 relative"
    >
      {(() => {
        const items: JSX.Element[] = [];
        let lastDateLabel: string | null = null;

        messages.forEach((message) => {
          const dateLabel = formatDateGroup(message.created_at);

          if (dateLabel !== lastDateLabel) {
            items.push(
              <div key={`date-${dateLabel}`} className="my-4">
                <DateDivider label={dateLabel} />
              </div>
            );
            lastDateLabel = dateLabel;
          }

          items.push(
            <MessageBubble
              key={message.id}
              message={message}
              isOwnMessage={message.user_id === currentUserId}
              onUserClick={onUserClick}
            />
          );
        });

        return items;
      })()}
      <div ref={messagesEndRef} />
    </div>
  );
}


