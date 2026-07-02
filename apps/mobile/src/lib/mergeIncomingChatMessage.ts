import type { ChatThreadMessage } from "../types/chatThread";

/** PWA `ChatConversationPage` INSERT merge — dedupe + replace optimistic twin. */
export function mergeIncomingChatMessage(
  curr: ChatThreadMessage[],
  next: ChatThreadMessage
): ChatThreadMessage[] {
  if (curr.some((m) => m.id === next.id)) return curr;

  const optimisticIdx = curr.findIndex(
    (m) =>
      m.optimistic &&
      m.sender_id === next.sender_id &&
      m.content === next.content &&
      (m.story_id ?? null) === (next.story_id ?? null) &&
      Math.abs(new Date(m.created_at).getTime() - new Date(next.created_at).getTime()) < 30_000
  );

  if (optimisticIdx >= 0) {
    const copy = [...curr];
    copy[optimisticIdx] = next;
    return copy;
  }

  return [...curr, next];
}
