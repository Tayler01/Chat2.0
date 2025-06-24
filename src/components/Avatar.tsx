import React from 'react';
import { useCachedImage } from '../hooks/useImageCache';

interface AvatarProps {
  url?: string | null;
  alt: string;
  className?: string;
  color?: string;
}

export function Avatar({ url, alt, className = '', color }: AvatarProps) {
  const src = useCachedImage(url);

  if (!url) {
    return (
      <div className={className + ' flex items-center justify-center text-white font-bold'} style={{ backgroundColor: color }}>
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  return <img src={src || url} alt={alt} className={className} />;
}
