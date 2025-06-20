import React from 'react';

export function DateDivider({ label }: { label: string }) {
  return (
    <div className="sticky top-0 z-10 -mx-4 px-4 py-1 text-xs text-gray-400 bg-gray-900/95 backdrop-blur-sm text-center font-medium">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700/50"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-900 px-2 text-gray-400">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}