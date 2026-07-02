import type { StoryViewerGroup } from "./storyViewerTypes";

/** Index of first unviewed slide; falls back to 0 when all seen. */
export function firstUnseenStoryIndex(
  stories: ReadonlyArray<{ id: string }>,
  viewedIds: ReadonlySet<string>
): number {
  const idx = stories.findIndex((s) => !viewedIds.has(s.id));
  return idx >= 0 ? idx : 0;
}

/** Hub moments rail order: own ring first, then friends (newest friend activity first). */
export function buildHubViewerQueue(
  ownGroup: StoryViewerGroup | null,
  friendGroups: StoryViewerGroup[]
): StoryViewerGroup[] {
  const queue: StoryViewerGroup[] = [];
  if (ownGroup?.stories.length) queue.push(ownGroup);
  for (const g of friendGroups) {
    if (g.stories.length > 0) queue.push(g);
  }
  return queue;
}
