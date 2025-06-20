import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
    }
  }, [message]);

  return (
    <div className="border-t border-gray-700 bg-gray-800 px-2 sm:px-4 py-3 safe-area-inset-bottom">
      <form onSubmit={handleSubmit} className="flex justify-center">
        <div className="relative w-full max-w-2xl min-w-0">
          <div className="bg-gray-700 border border-gray-600 rounded-3xl px-3 sm:px-4 pr-12 sm:pr-14 py-2 text-white focus-within:ring-2 focus-within:ring-blue-500 shadow-md transition-all duration-150">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="ShadowMessage..."
              className="w-full bg-transparent resize-none overflow-y-auto placeholder-gray-400 text-sm sm:text-base focus:outline-none max-h-32 sm:max-h-40"
              rows={1}
              disabled={disabled}
              style={{
                fontSize: '16px', // Prevents zoom on iOS
                lineHeight: '1.5'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!message.trim() || disabled}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 sm:p-2.5 rounded-full hover:scale-105 active:scale-95 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}