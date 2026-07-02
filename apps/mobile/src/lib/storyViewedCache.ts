/** Session cache — avoids story rings flashing `unseen` before `story_views` returns. */
let cachedViewerId = "";
let cachedStoryKey = "";
let cachedViewedIds = new Set<string>();

function storyKey(storyIds: string[]): string {
  return Array.from(new Set(storyIds.filter(Boolean))).sort().join(",");
}

export function getCachedViewedStoryIds(
  viewerId: string,
  storyIds: string[]
): Set<string> | null {
  if (!viewerId) return null;
  const key = storyKey(storyIds);
  if (!key) return new Set();
  if (cachedViewerId !== viewerId || cachedStoryKey !== key) return null;
  return new Set(cachedViewedIds);
}

export function setCachedViewedStoryIds(
  viewerId: string,
  storyIds: string[],
  viewed: ReadonlySet<string>
): void {
  if (!viewerId) return;
  cachedViewerId = viewerId;
  cachedStoryKey = storyKey(storyIds);
  cachedViewedIds = new Set(viewed);
}

export function mergeCachedViewedStoryId(viewerId: string, storyId: string): void {
  if (!viewerId || !storyId || cachedViewerId !== viewerId) return;
  cachedViewedIds.add(storyId);
}

export function clearCachedViewedStoryIds(): void {
  cachedViewerId = "";
  cachedStoryKey = "";
  cachedViewedIds = new Set();
}
