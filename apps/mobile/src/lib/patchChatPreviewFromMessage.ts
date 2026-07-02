import { formatChatListTime } from "./formatChatListTime";
import type { ChatConversationPreview } from "../types/chatPreview";

export type ChatListMessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  seen: boolean;
  created_at: string;
};

/** PWA chat list — apply INSERT/UPDATE payload to one preview row. */
export function patchChatPreviewFromMessage(
  previews: ChatConversationPreview[],
  row: ChatListMessageRow,
  meId: string,
  mode: "insert" | "update"
): ChatConversationPreview[] | null {
  const idx = previews.findIndex((p) => p.chatId === row.chat_id);
  if (idx < 0) return null;

  if (mode === "update") {
    if (row.receiver_id === meId && row.seen) {
      return clearChatPreviewUnread(previews, row.chat_id);
    }
    return previews;
  }

  const existing = previews[idx];
  const nextTs = new Date(row.created_at).getTime();
  if (existing.sortTime > nextTs) {
    return previews;
  }

  const content = typeof row.content === "string" ? row.content.trim() : "";
  const next: ChatConversationPreview = {
    ...existing,
    preview: content || existing.preview,
    timeLabel: formatChatListTime(row.created_at),
    sortTime: nextTs,
    unread: row.receiver_id === meId && row.seen === false,
  };

  const copy = [...previews];
  copy[idx] = next;
  copy.sort((a, b) => b.sortTime - a.sortTime);
  return copy;
}

export function clearChatPreviewUnread(
  previews: ChatConversationPreview[],
  chatId: string
): ChatConversationPreview[] {
  const idx = previews.findIndex((p) => p.chatId === chatId);
  if (idx < 0) return previews;
  if (!previews[idx].unread) return previews;
  const copy = [...previews];
  copy[idx] = { ...copy[idx], unread: false };
  return copy;
}
