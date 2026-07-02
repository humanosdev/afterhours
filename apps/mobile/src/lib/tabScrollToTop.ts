/** Tab re-press scroll-to-top — mirrors PWA bottom-nav “already on tab” behavior. */

export type TabScrollTarget = "hub" | "chat" | "profile";

type TabScrollListener = () => void;

const listeners: Record<TabScrollTarget, Set<TabScrollListener>> = {
  hub: new Set(),
  chat: new Set(),
  profile: new Set(),
};

export function emitTabScrollToTop(tab: TabScrollTarget): void {
  listeners[tab].forEach((fn) => {
    try {
      fn();
    } catch {
      /* listener */
    }
  });
}

export function subscribeTabScrollToTop(tab: TabScrollTarget, listener: TabScrollListener): () => void {
  listeners[tab].add(listener);
  return () => {
    listeners[tab].delete(listener);
  };
}
