import type { ShareAspectFormat } from "../lib/shareAspect";

/** Read-only share row for Hub “Shares” section (Phase 2M) — backed by `public.stories`. */
export type HubShareFeedItem = {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  username: string;
  avatar_url: string | null;
  share_hidden?: boolean;
  /** Hub frame: portrait 4:5 (default) or square 1:1. */
  share_aspect?: ShareAspectFormat | null;
  /** Raw `profiles.username` for `/u/[username]` navigation. */
  profile_slug: string | null;
};
