import { useEffect, useState } from 'react';

/**
 * Returns a cached data URL for the given image URL. If no cached
 * version exists in localStorage, the image is fetched, cached and
 * then returned. When the URL changes the hook will fetch again.
 */
export function useCachedImage(url: string | null | undefined): string | null {
  const [cached, setCached] = useState<string | null>(null);

  useEffect(() => {
    if (!url) {
      setCached(null);
      return;
    }
    const key = `avatar:${url}`;
    const cachedValue = localStorage.getItem(key);
    if (cachedValue) {
      setCached(cachedValue);
      return;
    }

    let cancelled = false;
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          try {
            localStorage.setItem(key, dataUrl);
          } catch {
            // ignore quota errors
          }
          setCached(dataUrl);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        if (!cancelled) setCached(url);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return cached || url || null;
}
