/** Mirrors web `STORY_VIEWED_EVENT` — merge viewed state without full refetch. */
type StoryViewedListener = (storyId: string) => void;

const listeners = new Set<StoryViewedListener>();

export function subscribeStoryViewed(listener: StoryViewedListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitStoryViewed(storyId: string): void {
  if (!storyId) return;
  for (const listener of listeners) {
    listener(storyId);
  }
}
