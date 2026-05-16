/** Read-only share row for Hub “Shares” section (Phase 2M) — backed by `public.stories`. */
export type HubShareFeedItem = {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
};
