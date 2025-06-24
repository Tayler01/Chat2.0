import React, { useEffect, useRef, useCallback, useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { formatDateGroup } from '../utils/formatDateGroup';
import { Message } from '../types/message';
import { MessageRow } from './MessageRow';

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);
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

  const [listHeight, setListHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      if (wrapperRef.current) {
        setListHeight(wrapperRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || virtualItems.length === 0) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 200;

    if (!hasAutoScrolled.current) {
      listRef.current?.scrollToItem(virtualItems.length - 1);
      hasAutoScrolled.current = true;
    } else if (isNearBottom) {
      listRef.current?.scrollToItem(virtualItems.length - 1, 'end');
    }
  }, [virtualItems.length]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !hasMore || isFetchingRef.current) return;

    if (container.scrollTop <= 20) {
      const previousHeight = container.scrollHeight;
      isFetchingRef.current = true;

      fetchOlderMessages();

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
    <div ref={wrapperRef} className="flex-1 overflow-hidden bg-gray-900 relative p-2 sm:p-4">
      {listHeight > 0 && (
        <List
          height={listHeight}
          itemCount={virtualItems.length}
          itemSize={80}
          width="100%"
          outerRef={containerRef}
          itemData={{ items: virtualItems, currentUserId, onUserClick, activeUserIds }}
          ref={listRef}
          onScroll={handleScroll}
          className="overflow-x-hidden"
        >
          {MessageRow}
        </List>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}


