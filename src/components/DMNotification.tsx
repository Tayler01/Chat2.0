import React from 'react';

interface DMNotificationProps {
  preview: { conversationId: string; sender: string; content: string } | null;
  onJump: (id: string) => void;
}

export function DMNotification({ preview, onJump }: DMNotificationProps) {
  if (!preview) return null;
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 mt-2 bg-gray-700 text-white px-4 py-2 rounded-lg shadow-lg cursor-pointer z-50"
      style={{ top: '4rem' }}
      onClick={() => onJump(preview.conversationId)}
    >
      <p className="text-sm font-semibold">{preview.sender}</p>
      <p className="text-xs truncate max-w-xs">{preview.content}</p>
    </div>
  );
}
