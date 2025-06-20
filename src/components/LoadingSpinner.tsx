import React from 'react';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8 flex-1">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );
}