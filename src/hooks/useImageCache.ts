import { useState, useEffect } from 'react';

const memoryCache = new Map<string, string>();

const CACHE_PREFIX = 'image-cache-';
const CACHE_KEYS_KEY = `${CACHE_PREFIX}keys`;
const CACHE_LIMIT = 50;

let cacheKeys: string[] = [];

try {
  cacheKeys = JSON.parse(localStorage.getItem(CACHE_KEYS_KEY) || '[]');
} catch {
  cacheKeys = [];
}

function saveCacheKeys() {
  try {
    localStorage.setItem(CACHE_KEYS_KEY, JSON.stringify(cacheKeys));
  } catch {
    // ignore storage errors
  }
}

async function fetchAndCache(url: string): Promise<string> {
  if (memoryCache.has(url)) return memoryCache.get(url)!;

  const lsKey = `${CACHE_PREFIX}${url}`;
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
      if (!cacheKeys.includes(lsKey)) {
        cacheKeys.push(lsKey);
        if (cacheKeys.length > CACHE_LIMIT) {
          const removeCount = cacheKeys.length - CACHE_LIMIT;
          const removed = cacheKeys.splice(0, removeCount);
          removed.forEach((key) => {
            localStorage.removeItem(key);
            memoryCache.delete(key.slice(CACHE_PREFIX.length));
          });
        }
        saveCacheKeys();
      }
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

export function clearCache() {
  cacheKeys.forEach((key) => {
    localStorage.removeItem(key);
  });
  cacheKeys = [];
  localStorage.removeItem(CACHE_KEYS_KEY);
  memoryCache.clear();
}
