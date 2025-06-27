import React from 'react';

export interface DMMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  reactions?: Record<string, string[]>;
}

interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    messages: DMMessage[];
    currentUserId: string;
    formatTime: (timestamp: string) => string;
  };
}

export function DMMessageRow({ index, style, data }: RowProps) {
  const message = data.messages[index];
  const isOwn = message.sender_id === data.currentUserId;
  return (
    <div style={style} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwn ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'
        }`}
      >
        <p className="text-sm">{message.content}</p>
        <p className={`text-xs mt-1 ${isOwn ? 'text-blue-200' : 'text-gray-400'}`}>
          {data.formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
