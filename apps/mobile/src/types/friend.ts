/** Read-only friend row for Hub / social surfaces (Phase 2K). Mirrors web `ProfileLite` subset. */
export type AcceptedFriendPublic = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};
