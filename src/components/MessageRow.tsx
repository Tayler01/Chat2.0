import React from 'react';
import { DateDivider } from './DateDivider';
import { MessageBubble } from './MessageBubble';
import { Message } from '../types/message';

type VirtualItem =
  | { type: 'date'; label: string }
  | { type: 'message'; message: Message; showTimestamp: boolean; showActiveDot: boolean };

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    items: VirtualItem[];
    currentUserId: string;
    onUserClick?: (userId: string) => void;
    activeUserIds: string[];
  };
}

export function MessageRow({ index, style, data }: RowProps) {
  const item = data.items[index];
  if (item.type === 'date') {
    return (
      <div style={style} className="my-4">
        <DateDivider label={item.label} />
      </div>
    );
  }

  return (
    <div style={style}>
      <MessageBubble
        message={item.message}
        isOwnMessage={item.message.user_id === data.currentUserId}
        currentUserId={data.currentUserId}
        onUserClick={data.onUserClick}
        activeUserIds={data.activeUserIds}
        showActiveDot={item.showActiveDot}
        showTimestamp={item.showTimestamp}
      />
    </div>
  );
}
