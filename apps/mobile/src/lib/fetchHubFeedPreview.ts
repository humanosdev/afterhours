import type { HubShareFeedItem } from "../types/hubFeed";
import { normalizeShareAspect } from "./shareAspect";
import { isStoryRowShareFlag } from "./hubFeedSemantics";
import { profileUsernameLabel } from "./profileDisplay";
import { supabase } from "./supabase/client";

/**
 * Hub “Shares” use `public.stories` (see web `apps/web/src/app/hub/page.tsx` `loadHubFriendShares`).
 * Phase 2M — no writes, no `user_presence`, no realtime.
 * Production `stories` uses `image_url` only — do not select `media_url` (column may not exist in DB).
 */
const STORY_COLUMN_VARIANTS = [
  "id, user_id, image_url, created_at, expires_at, is_share, share_visible, share_hidden, share_aspect",
  "id, user_id, image_url, created_at, expires_at, is_share, share_visible, share_hidden",
] as const;

const PROFILE_COLUMNS = "id, username, display_name, avatar_url" as const;
const STORY_LIMIT = 200;
const ID_CHUNK_SIZE = 80;

export type FetchHubFeedPreviewResult = {
  shares: HubShareFeedItem[];
  error: string | null;
};

type RawStory = {
  id: string;
  user_id: string;
  image_url?: string | null;
  created_at: string;
  expires_at?: string | null;
  is_share?: unknown;
  share_visible?: boolean | null;
  share_hidden?: boolean | null;
  share_aspect?: string | null;
};

function shareImageUrlFromRow(row: RawStory): string {
  return String(row.image_url ?? "").trim();
}

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export async function fetchHubFeedPreview(meId: string, friendIds: string[]): Promise<FetchHubFeedPreviewResult> {
  const allowedIds = Array.from(new Set([meId, ...friendIds]));
  if (allowedIds.length === 0) {
    return { shares: [], error: null };
  }

  let rows: RawStory[] = [];
  let fetchError: string | null = null;

  for (const columns of STORY_COLUMN_VARIANTS) {
    const { data, error } = await supabase
      .from("stories")
      .select(columns)
      .in("user_id", allowedIds)
      .order("created_at", { ascending: false })
      .limit(STORY_LIMIT);

    if (!error) {
      rows = (data ?? []) as unknown as RawStory[];
      fetchError = null;
      break;
    }
    fetchError = error.message;
    if (!/column\s+.+\s+does not exist/i.test(fetchError)) {
      return { shares: [], error: fetchError };
    }
  }

  if (fetchError) {
    return { shares: [], error: fetchError };
  }

  const shareRows = rows.filter((row) => {
    if (!row?.id || !row.user_id) return false;
    if (!isStoryRowShareFlag(row.is_share)) return false;
    if (row.share_hidden === true) return false;
    const isOwn = row.user_id === meId;
    if (!isOwn && row.share_visible === false) return false;
    const img = shareImageUrlFromRow(row);
    return !!img;
  });

  const ownerIds = Array.from(new Set(shareRows.map((r) => r.user_id).filter(Boolean)));
  const profileById = new Map<string, ProfileRow>();

  for (let i = 0; i < ownerIds.length; i += ID_CHUNK_SIZE) {
    const chunk = ownerIds.slice(i, i + ID_CHUNK_SIZE);
    const { data: profData, error: profError } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .in("id", chunk);

    if (profError) {
      return { shares: [], error: profError.message };
    }
    for (const p of (profData ?? []) as ProfileRow[]) {
      if (p?.id) profileById.set(p.id, p);
    }
  }

  const shares: HubShareFeedItem[] = shareRows.map((row) => {
    const prof = profileById.get(row.user_id);
    return {
      id: row.id,
      user_id: row.user_id,
      image_url: shareImageUrlFromRow(row),
      created_at: row.created_at,
      username: prof ? profileUsernameLabel(prof, "Member") : "Member",
      avatar_url: prof?.avatar_url ?? null,
      share_hidden: row.share_hidden === true,
      share_aspect: normalizeShareAspect(row.share_aspect),
      profile_slug: prof?.username?.trim().replace(/^@/, "") ?? null,
    };
  });

  shares.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { shares, error: null };
}
