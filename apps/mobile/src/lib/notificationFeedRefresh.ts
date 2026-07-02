type NotificationFeedRefreshListener = () => void;

const listeners = new Set<NotificationFeedRefreshListener>();

export function subscribeNotificationFeedRefresh(listener: NotificationFeedRefreshListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function bumpNotificationFeedRefresh(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* listener */
    }
  });
}
