import React, { useEffect, useRef, useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
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
  activeUserIds: string[];
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
  activeUserIds,

}: ChatAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);
  const isFetchingRef = useRef(false);

  const latestMessageByUser = React.useMemo(() => {
    const map = new Map<string, string>();
    messages.forEach((m) => {
      map.set(m.user_id, m.id);
    });
    return map;
  }, [messages]);

  type VirtualItem =
    | { type: 'date'; label: string }
    | { type: 'message'; message: Message; showTimestamp: boolean; showActiveDot: boolean };

  const virtualItems = React.useMemo(() => {
    const items: VirtualItem[] = [];
    let lastDateLabel: string | null = null;

    messages.forEach((message, index) => {
      const dateLabel = formatDateGroup(message.created_at);
      const nextMessage = messages[index + 1];
      const nextDateLabel = nextMessage ? formatDateGroup(nextMessage.created_at) : null;

      if (dateLabel !== lastDateLabel) {
        items.push({ type: 'date', label: dateLabel });
        lastDateLabel = dateLabel;
      }

      items.push({
        type: 'message',
        message,
        showActiveDot: latestMessageByUser.get(message.user_id) === message.id,
        showTimestamp:
          !nextMessage || nextMessage.user_id !== message.user_id || dateLabel !== nextDateLabel,
      });
    });

    return items;
  }, [messages, latestMessageByUser]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || virtualItems.length === 0) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;

    if (!hasAutoScrolled.current) {
      virtuosoRef.current?.scrollToIndex({ index: virtualItems.length - 1 });
      hasAutoScrolled.current = true;
    } else if (isNearBottom) {
      virtuosoRef.current?.scrollToIndex({
        index: virtualItems.length - 1,
        align: 'end',
        behavior: 'smooth',
      });
    }

  }, [virtualItems.length]);

  const handleScroll = useCallback(() => {
  const container = containerRef.current;
  if (!container || !hasMore || isFetchingRef.current) return;

  // Allow a small threshold to improve touch scrolling experience
  if (container.scrollTop <= 20) {
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
    <>
      <Virtuoso
        ref={virtuosoRef}
        data={virtualItems}
        scrollerRef={(ref) => {
          containerRef.current = ref as HTMLDivElement | null;
        }}
        className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 bg-gray-900 relative"
        followOutput="smooth"
        itemContent={(_, item) => {
          if (item.type === 'date') {
            return (
              <div className="my-4">
                <DateDivider label={item.label} />
              </div>
            );
          }

          return (
            <MessageBubble
              message={item.message}
              isOwnMessage={item.message.user_id === currentUserId}
              currentUserId={currentUserId}
              onUserClick={onUserClick}
              activeUserIds={activeUserIds}
              showActiveDot={item.showActiveDot}
              showTimestamp={item.showTimestamp}
            />
          );
        }}
        components={{ Footer: () => <div ref={messagesEndRef} /> }}
      />

    </>
  );
}


