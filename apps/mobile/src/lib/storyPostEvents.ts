/**
 * Mirrors PWA `window` event `story-posted` — local invalidation only (no realtime).
 * `CreateComposerProvider.bumpStoryEpoch()` increments epoch and emits this.
 */

type StoryPostedListener = () => void;

const listeners = new Set<StoryPostedListener>();

/** Subscribe to own-user story/share mutations (post, delete, hide, restore). */
export function subscribeStoryPosted(listener: StoryPostedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitStoryPosted(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* listener */
    }
  });
}
