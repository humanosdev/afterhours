import type { ChatConversationPreview } from "../types/chatPreview";

const cache = new Map<string, ChatConversationPreview[]>();

export function getCachedChatPreviews(userId: string): ChatConversationPreview[] | null {
  return cache.get(userId) ?? null;
}

export function setCachedChatPreviews(userId: string, previews: ChatConversationPreview[]): void {
  cache.set(userId, previews);
}

export function clearCachedChatPreviews(userId?: string): void {
  if (userId) cache.delete(userId);
  else cache.clear();
}
