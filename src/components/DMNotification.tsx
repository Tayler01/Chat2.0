import React, { useEffect, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface DMNotificationProps {
  preview: { conversationId: string; sender: string; content: string } | null;
  onJump: (id: string) => void;
}

export function DMNotification({ preview, onJump }: DMNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (preview) {
      setShouldRender(true);
      // Small delay to trigger animation
      setTimeout(() => setIsVisible(true), 50);
      
      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        // Remove from DOM after animation completes
        setTimeout(() => setShouldRender(false), 300);
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), 300);
    }
  }, [preview]);

  const handleClick = () => {
    if (preview) {
      onJump(preview.conversationId);
      setIsVisible(false);
      setTimeout(() => setShouldRender(false), 300);
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(() => setShouldRender(false), 300);
  };

  if (!shouldRender || !preview) return null;

  return (
    <div
      className={`fixed z-50 transition-all duration-300 ease-out left-0 right-0 ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-full opacity-0'
      } top-12 md:top-20`}
    >
      {/* Desktop notification - positioned to the right */}
      <div className="hidden md:block">
        <div 
          className="ml-auto mr-4 lg:mr-8 max-w-sm bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600/50 rounded-xl shadow-2xl cursor-pointer hover:shadow-3xl transition-all duration-200 hover:scale-[1.02] backdrop-blur-sm"
          onClick={handleClick}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-white truncate">
                    New message from {preview.sender}
                  </p>
                  <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">
                  {preview.content}
                </p>
                
                <div className="mt-2 text-xs text-blue-300 font-medium">
                  Click to view conversation →
                </div>
              </div>
            </div>
          </div>
          
          {/* Subtle gradient border effect */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
        </div>
      </div>

      {/* Mobile notification - full width */}
      <div className="md:hidden px-4">
        <div 
          className="w-full bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600/50 rounded-xl shadow-2xl cursor-pointer active:scale-[0.98] transition-all duration-200 backdrop-blur-sm"
          onClick={handleClick}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {preview.sender}
                  </p>
                  <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed mb-2">
                  {preview.content}
                </p>
                
                <div className="text-xs text-blue-300 font-medium">
                  Tap to view conversation
                </div>
              </div>
            </div>
          </div>
          
          {/* Subtle gradient border effect */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 active:opacity-100 transition-opacity duration-200 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}