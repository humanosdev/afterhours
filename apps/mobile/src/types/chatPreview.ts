/** Read-only Chat tab row (Phase 2N) — assembled from `chats`, `messages`, `profiles`. */
export type ChatConversationPreview = {
  chatId: string;
  peerId: string | null;
  title: string;
  preview: string;
  timeLabel: string;
  sortTime: number;
  unread: boolean;
  avatarUrl: string | null;
};
