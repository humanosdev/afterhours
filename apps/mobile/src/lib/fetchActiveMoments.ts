import { isStoryRowShareFlag } from "./hubFeedSemantics";
import { isMomentStillActive } from "./momentWindow";
import { viewerCanSeeOwnerPosts } from "./pairBlockStatus";
import { storyImageUrlFromRow } from "./storyMediaUrl";
import { supabase } from "./supabase/client";
import type { StoryViewerStory } from "./storyViewerTypes";

/** PWA hub/profile — `image_url` only (no `media_url` in select; column may be absent). */
const MOMENT_COLUMNS = "id, user_id, image_url, created_at, expires_at, is_share" as const;

type FetchActiveMomentsOptions = {
  /** When set, skips fetch unless viewer may see this owner's moments (public / friend / self). */
  viewerId?: string | null;
};

/** Active (non-share) moments for one user — viewer modal payload. */
export async function fetchActiveMomentsForUser(
  userId: string,
  options: FetchActiveMomentsOptions = {}
): Promise<StoryViewerStory[]> {
  const { viewerId = null } = options;
  if (viewerId && viewerId !== userId) {
    const allowed = await viewerCanSeeOwnerPosts(viewerId, userId);
    if (!allowed) return [];
  }

  const { data, error } = await supabase
    .from("stories")
    .select(MOMENT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    if (__DEV__) {
      console.warn("[story-media] fetchActiveMomentsForUser", error.message);
    }
    return [];
  }
  if (!data) return [];

  const now = Date.now();
  return data
    .filter((row) => {
      if (isStoryRowShareFlag(row.is_share)) return false;
      if (!isMomentStillActive(row.created_at, row.expires_at, now)) return false;
      return Boolean(storyImageUrlFromRow(row));
    })
    .map((row) => ({
      id: row.id as string,
      user_id: row.user_id as string,
      media_url: storyImageUrlFromRow(row),
      created_at: row.created_at as string,
      expires_at: (row.expires_at ?? null) as string | null,
      is_share: false,
    }));
}

export type FriendMomentPreview = {
  userId: string;
  username: string | null;
  avatar_url: string | null;
  stories: StoryViewerStory[];
};

/** Batch active moments for hub rail (friends + self). */
export async function fetchActiveMomentsByUserIds(
  userIds: string[]
): Promise<Map<string, StoryViewerStory[]>> {
  const out = new Map<string, StoryViewerStory[]>();
  if (userIds.length === 0) return out;

  const { data, error } = await supabase
    .from("stories")
    .select(MOMENT_COLUMNS)
    .in("user_id", userIds)
    .order("created_at", { ascending: true });

  if (error) {
    if (__DEV__) {
      console.warn("[story-media] fetchActiveMomentsByUserIds", error.message);
    }
    return out;
  }
  if (!data) return out;

  const now = Date.now();
  for (const row of data) {
    if (isStoryRowShareFlag(row.is_share)) continue;
    if (!isMomentStillActive(row.created_at, row.expires_at, now)) continue;
    const url = storyImageUrlFromRow(row);
    if (!url) continue;
    const uid = row.user_id as string;
    const list = out.get(uid) ?? [];
    list.push({
      id: row.id as string,
      user_id: uid,
      media_url: url,
      created_at: row.created_at as string,
      expires_at: (row.expires_at ?? null) as string | null,
      is_share: false,
    });
    out.set(uid, list);
  }
  return out;
}
