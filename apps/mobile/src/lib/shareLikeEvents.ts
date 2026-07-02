/**
 * Cross-surface share-like sync (PWA `ah-share-likes-updated`).
 * Hub feed patches instantly when detail/viewer toggles a like.
 */

export type ShareLikeUpdatedDetail = {
  storyId: string;
  liked: boolean;
};

type ShareLikeUpdatedListener = (detail: ShareLikeUpdatedDetail) => void;

const listeners = new Set<ShareLikeUpdatedListener>();

export function subscribeShareLikeUpdated(listener: ShareLikeUpdatedListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitShareLikeUpdated(detail: ShareLikeUpdatedDetail): void {
  for (const fn of listeners) {
    try {
      fn(detail);
    } catch {
      /* listener */
    }
  }
}
