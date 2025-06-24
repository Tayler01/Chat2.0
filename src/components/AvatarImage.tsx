import React from 'react';
import { useCachedImage } from '../hooks/useCachedImage';

interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  fallbackColor?: string;
  fallbackText?: string;
}

/**
 * Displays an avatar image using a client side cache. If no src is provided
 * a colored fallback circle with the supplied text is shown.
 */
export function AvatarImage({
  src,
  fallbackColor = '#666',
  fallbackText = '?',
  ...imgProps
}: AvatarImageProps) {
  const cachedSrc = useCachedImage(src);

  if (!cachedSrc) {
    return (
      <div
        style={{ backgroundColor: fallbackColor }}
        className="w-full h-full flex items-center justify-center text-white text-sm font-bold"
      >
        {fallbackText}
      </div>
    );
  }

  return <img src={cachedSrc} {...imgProps} />;
}
