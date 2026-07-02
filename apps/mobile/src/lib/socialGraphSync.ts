import { clearCachedAcceptedFriends } from "./acceptedFriendsCache";
import { clearCachedPresencePreview } from "./presencePreviewCache";

type Listener = () => void;
const listeners = new Set<Listener>();

/** RN equivalent of PWA `friends-updated` / `friend-removed` window events. */
export function subscribeSocialGraphChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitSocialGraphChanged(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch (e) {
      console.warn("socialGraph listener:", e);
    }
  }
}

/** After friend/block graph changes — bust caches and notify hooks. */
export function invalidateSocialGraph(meId: string | undefined, opts?: { clearPresence?: boolean }) {
  if (meId) clearCachedAcceptedFriends(meId);
  if (opts?.clearPresence !== false) clearCachedPresencePreview();
  emitSocialGraphChanged();
}
