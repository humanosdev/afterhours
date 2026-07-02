import type { HubShareFeedItem } from "../types/hubFeed";

const cache = new Map<string, HubShareFeedItem[]>();

export function hubFeedPreviewCacheKey(userId: string, friendKey: string): string {
  return `${userId}:${friendKey}`;
}

export function getCachedHubFeedPreview(
  userId: string,
  friendKey: string
): HubShareFeedItem[] | null {
  return cache.get(hubFeedPreviewCacheKey(userId, friendKey)) ?? null;
}

export function setCachedHubFeedPreview(
  userId: string,
  friendKey: string,
  shares: HubShareFeedItem[]
): void {
  cache.set(hubFeedPreviewCacheKey(userId, friendKey), shares);
}

export function clearCachedHubFeedPreview(userId?: string): void {
  if (!userId) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`)) cache.delete(key);
  }
}
