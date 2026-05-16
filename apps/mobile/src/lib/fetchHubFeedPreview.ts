import type { HubShareFeedItem } from "../types/hubFeed";
import { isStoryRowShareFlag } from "./hubFeedSemantics";
import { supabase } from "./supabase/client";

/**
 * Hub “Shares” use `public.stories` (see web `apps/web/src/app/hub/page.tsx` `loadHubFriendShares`).
 * Phase 2M — no writes, no `user_presence`, no realtime.
 * Production `stories` uses `image_url` only — do not select `media_url` (column may not exist in DB).
 */
const STORY_COLUMNS =
  "id, user_id, image_url, created_at, expires_at, is_share, share_visible, share_hidden" as const;

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

function displayHandle(p: ProfileRow): string {
  const d = p.display_name?.trim();
  if (d) return d;
  const u = p.username?.trim();
  if (u) return `@${u}`;
  return "Member";
}

export async function fetchHubFeedPreview(meId: string, friendIds: string[]): Promise<FetchHubFeedPreviewResult> {
  const allowedIds = Array.from(new Set([meId, ...friendIds]));
  if (allowedIds.length === 0) {
    return { shares: [], error: null };
  }

  const { data, error } = await supabase
    .from("stories")
    .select(STORY_COLUMNS)
    .in("user_id", allowedIds)
    .order("created_at", { ascending: false })
    .limit(STORY_LIMIT);

  if (error) {
    return { shares: [], error: error.message };
  }

  const rows = (data ?? []) as RawStory[];

  const shareRows = rows.filter((row) => {
    if (!row?.id || !row.user_id) return false;
    if (!isStoryRowShareFlag(row.is_share)) return false;
    if (row.share_hidden === true) return false;
    if (row.share_visible === false) return false;
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
      username: prof ? displayHandle(prof) : "Member",
      avatar_url: prof?.avatar_url ?? null,
    };
  });

  shares.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { shares, error: null };
}
