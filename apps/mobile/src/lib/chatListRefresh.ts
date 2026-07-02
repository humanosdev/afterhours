/** Bump when a thread sends a message so Messages tab refetches previews (CHAT-1). */

const listeners = new Set<() => void>();

export function subscribeChatListRefresh(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function bumpChatListRefresh(): void {
  for (const cb of listeners) {
    cb();
  }
}
