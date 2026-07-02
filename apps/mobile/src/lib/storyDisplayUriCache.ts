import { storiesObjectPathFromUrl } from "./storiesObjectPath";

type CacheEntry = {
  displayUri: string;
  expiresAt: number;
};

/** In-memory signed URL cache — avoids per-swipe `createSignedUrl` round trips. */
const cache = new Map<string, CacheEntry>();

const TTL_MS = 50 * 60 * 1000;

function cacheKey(storedUrl: string): string {
  const path = storiesObjectPathFromUrl(storedUrl);
  return path ? `path:${path}` : `url:${storedUrl.trim()}`;
}

export function getCachedStoryDisplayUri(storedUrl: string | null | undefined): string | null {
  const raw = storedUrl?.trim() ?? "";
  if (!raw) return null;
  const hit = cache.get(cacheKey(raw));
  if (!hit || hit.expiresAt <= Date.now()) return null;
  return hit.displayUri;
}

export function setCachedStoryDisplayUri(storedUrl: string, displayUri: string): void {
  const raw = storedUrl.trim();
  if (!raw || !displayUri.trim()) return;
  cache.set(cacheKey(raw), {
    displayUri: displayUri.trim(),
    expiresAt: Date.now() + TTL_MS,
  });
}

export function clearStoryDisplayUriCache(): void {
  cache.clear();
}
