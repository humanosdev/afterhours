import type { StoryViewerGroup } from "./storyViewerTypes";

let cacheKey = "";
let cachedMap: Map<string, StoryViewerGroup["stories"]> | null = null;

export function hubMomentsCacheKey(userId: string, friendIds: string[], storyEpoch: number): string {
  return `${userId}:${friendIds.slice().sort().join(",")}:${storyEpoch}`;
}

export function getCachedHubMoments(
  key: string
): Map<string, StoryViewerGroup["stories"]> | null {
  if (key !== cacheKey || !cachedMap) return null;
  return new Map(cachedMap);
}

export function setCachedHubMoments(
  key: string,
  map: Map<string, StoryViewerGroup["stories"]>
): void {
  cacheKey = key;
  cachedMap = new Map(map);
}

export function clearCachedHubMoments(): void {
  cacheKey = "";
  cachedMap = null;
}
