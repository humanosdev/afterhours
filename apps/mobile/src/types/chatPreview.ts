/** Read-only Chat tab row (Phase 2N) — assembled from `chats`, `messages`, `profiles`. */
export type ChatConversationPreview = {
  chatId: string;
  peerId: string | null;
  /** From peer `profiles.username` — for local search (may differ from `title`). */
  peerUsername: string | null;
  /** From peer `profiles.display_name`. */
  peerDisplayName: string | null;
  title: string;
  preview: string;
  timeLabel: string;
  sortTime: number;
  unread: boolean;
  avatarUrl: string | null;
};
