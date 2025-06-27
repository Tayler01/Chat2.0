import { useState, useEffect } from 'react';

const memoryCache = new Map<string, string>();

async function fetchAndCache(url: string): Promise<string> {
  if (memoryCache.has(url)) return memoryCache.get(url)!;
  const lsKey = `image-cache-${url}`;
  const cached = localStorage.getItem(lsKey);
  if (cached) {
    memoryCache.set(url, cached);
    return cached;
  }
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    const blob = await res.blob();
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    try {
      localStorage.setItem(lsKey, dataUrl);
    } catch {
      // ignore storage errors (e.g., quota exceeded)
    }
    memoryCache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return url;
  }
}

export function useCachedImage(url?: string | null) {
  const [src, setSrc] = useState<string | undefined>(url || undefined);

  useEffect(() => {
    let active = true;
    if (!url) {
      setSrc(undefined);
      return;
    }
    fetchAndCache(url).then((cached) => {
      if (active) setSrc(cached);
    });
    return () => {
      active = false;
    };
  }, [url]);

  return src;
}
