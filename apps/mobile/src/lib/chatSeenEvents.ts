/** PWA `chat-seen-updated` — clears unread on Messages list when thread marks seen. */

const listeners = new Set<(chatId: string) => void>();

export function subscribeChatSeenUpdated(onSeen: (chatId: string) => void): () => void {
  listeners.add(onSeen);
  return () => listeners.delete(onSeen);
}

export function emitChatSeenUpdated(chatId: string): void {
  for (const cb of listeners) {
    cb(chatId);
  }
}
