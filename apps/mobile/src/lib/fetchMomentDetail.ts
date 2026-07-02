import { normalizeShareAspect, type ShareAspectFormat } from "./shareAspect";
import { isStoryRowShareFlag } from "./hubFeedSemantics";
import { viewerCanSeeOwnerPosts } from "./pairBlockStatus";
import { fetchLikedByFriendsLineForStory, fetchHubShareFeedCardStates } from "./storyFeedInteractions";
import { supabase } from "./supabase/client";

export type MomentComment = {
  id: string;
  user_id: string;
  content: string;
  username: string | null;
  avatar_url: string | null;
};

export type MomentDetail = {
  id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  is_share: boolean;
  share_visible: boolean;
  share_hidden: boolean;
  share_aspect: ShareAspectFormat;
};

export type MomentOwner = {
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type FetchMomentDetailResult = {
  moment: MomentDetail | null;
  owner: MomentOwner | null;
  likesCount: number;
  liked: boolean;
  likedByLine: string | null;
  comments: MomentComment[];
  error: string | null;
};

const STORY_COLUMN_VARIANTS = [
  "id, user_id, image_url, created_at, is_share, share_visible, share_hidden, share_aspect",
  "id, user_id, image_url, created_at, is_share, share_visible, share_hidden",
] as const;

export async function fetchMomentDetail(
  storyId: string,
  meId: string | null,
  friendIds: string[],
  archiveView = false
): Promise<FetchMomentDetailResult> {
  const empty = {
    moment: null,
    owner: null,
    likesCount: 0,
    liked: false,
    likedByLine: null,
    comments: [] as MomentComment[],
    error: null,
  };

  let row: Record<string, unknown> | null = null;
  let storyError: string | null = null;

  for (const columns of STORY_COLUMN_VARIANTS) {
    const { data, error } = await supabase.from("stories").select(columns).eq("id", storyId).maybeSingle();
    if (!error) {
      row = data as Record<string, unknown> | null;
      storyError = null;
      break;
    }
    storyError = error.message;
    if (!/column\s+.+\s+does not exist/i.test(storyError)) {
      return { ...empty, error: storyError };
    }
  }

  if (storyError) {
    return { ...empty, error: storyError };
  }
  if (!row?.id || !row.user_id) {
    return empty;
  }

  const ownerId = row.user_id as string;
  const isShare = isStoryRowShareFlag(row.is_share);
  const shareVisible = row.share_visible !== false;
  const shareHidden = row.share_hidden === true;
  const imageUrl = String(row.image_url ?? "").trim();

  if (!imageUrl) {
    return empty;
  }

  if (archiveView && meId !== ownerId) {
    return empty;
  }

  const canSee = await viewerCanSeeOwnerPosts(meId, ownerId);
  if (!canSee) {
    return empty;
  }

  if (isShare && !archiveView && meId !== ownerId && (shareHidden || !shareVisible)) {
    return empty;
  }

  const moment: MomentDetail = {
    id: row.id as string,
    user_id: ownerId,
    image_url: imageUrl,
    created_at: row.created_at as string,
    is_share: isShare,
    share_visible: shareVisible,
    share_hidden: shareHidden,
    share_aspect: normalizeShareAspect(row.share_aspect),
  };

  const { data: ownerRow } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", ownerId)
    .maybeSingle();

  const owner: MomentOwner = {
    username: ownerRow?.username ?? null,
    display_name: ownerRow?.display_name ?? null,
    avatar_url: ownerRow?.avatar_url ?? null,
  };

  const stats = await fetchHubShareFeedCardStates([storyId], meId, friendIds);
  const card = stats[storyId];
  const likesCount = card?.likesCount ?? 0;
  const liked = card?.liked ?? false;

  let comments: MomentComment[] = [];
  let likedByLine: string | null = null;

  if (isShare && !archiveView) {
    const { data: commentRows } = await supabase
      .from("story_comments")
      .select("id, user_id, content, created_at")
      .eq("story_id", storyId)
      .order("created_at", { ascending: true });

    const rows = (commentRows ?? []) as Array<{ id: string; user_id: string; content: string }>;
    const ids = Array.from(new Set(rows.map((c) => c.user_id)));
    const profileById: Record<string, { username: string | null; avatar_url: string | null }> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", ids);
      for (const p of profs ?? []) {
        profileById[p.id] = { username: p.username ?? null, avatar_url: p.avatar_url ?? null };
      }
    }
    comments = rows.map((c) => ({
      id: c.id,
      user_id: c.user_id,
      content: c.content,
      username: profileById[c.user_id]?.username ?? null,
      avatar_url: profileById[c.user_id]?.avatar_url ?? null,
    }));

    if (meId) {
      likedByLine = await fetchLikedByFriendsLineForStory(storyId, meId, friendIds);
    }
  }

  return {
    moment,
    owner,
    likesCount,
    liked,
    likedByLine,
    comments,
    error: null,
  };
}

/** Lightweight comments refresh for detail — no full-page loading gate. */
export async function fetchMomentShareComments(storyId: string): Promise<MomentComment[]> {
  const { data: commentRows } = await supabase
    .from("story_comments")
    .select("id, user_id, content, created_at")
    .eq("story_id", storyId)
    .order("created_at", { ascending: true });

  const rows = (commentRows ?? []) as Array<{ id: string; user_id: string; content: string }>;
  const ids = Array.from(new Set(rows.map((c) => c.user_id)));
  const profileById: Record<string, { username: string | null; avatar_url: string | null }> = {};
  if (ids.length) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", ids);
    for (const p of profs ?? []) {
      profileById[p.id] = { username: p.username ?? null, avatar_url: p.avatar_url ?? null };
    }
  }
  return rows.map((c) => ({
    id: c.id,
    user_id: c.user_id,
    content: c.content,
    username: profileById[c.user_id]?.username ?? null,
    avatar_url: profileById[c.user_id]?.avatar_url ?? null,
  }));
}
