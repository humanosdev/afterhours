import type { SupabaseClient } from "@supabase/supabase-js";
import { acceptedFriendIdsExcludingBlocks } from "@/lib/pairBlockStatus";

export type ShareInteractionStats = {
  likesCount: number;
  commentsCount: number;
  liked: boolean;
};

export type HubShareFeedCardState = ShareInteractionStats & {
  likedByLine: string | null;
  commentPreviews: Array<{ id: string; username: string | null; content: string }>;
};

const PREVIEW_COMMENTS_PER_STORY = 4;

function buildLikedByFriendsLine(
  likerUserIds: string[],
  meId: string,
  friendIds: string[],
  usernameById: Record<string, string | null>
): string | null {
  const friendSet = new Set(friendIds);
  const eligible = Array.from(new Set(likerUserIds)).filter((uid) => uid === meId || friendSet.has(uid));
  if (!eligible.length) return null;
  eligible.sort((a, b) => {
    const la = a === meId ? "\u0000you" : (usernameById[a] ?? "\u007f").toLowerCase();
    const lb = b === meId ? "\u0000you" : (usernameById[b] ?? "\u007f").toLowerCase();
    return la.localeCompare(lb);
  });
  const labels = eligible.map((uid) => {
    if (uid === meId) return "You";
    const u = (usernameById[uid] ?? "").trim();
    return u ? `@${u}` : "@friend";
  });
  const head = labels.slice(0, 3).join(", ");
  const suffix = labels.length > 3 ? "…" : "";
  return `Liked by ${head}${suffix}`;
}

/** Hub share strip: counts, friend “liked by” line, read-only comment previews. */
export async function fetchHubShareFeedCardStates(
  supabase: SupabaseClient,
  storyIds: string[],
  meId: string | null,
  friendIds: string[]
): Promise<Record<string, HubShareFeedCardState>> {
  const out: Record<string, HubShareFeedCardState> = {};
  for (const sid of storyIds) {
    out[sid] = {
      likesCount: 0,
      commentsCount: 0,
      liked: false,
      likedByLine: null,
      commentPreviews: [],
    };
  }
  if (!storyIds.length) return out;

  const friendSet = new Set(friendIds);

  const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
    supabase.from("story_likes").select("story_id,user_id").in("story_id", storyIds),
    supabase
      .from("story_comments")
      .select("id, story_id, user_id, content, created_at")
      .in("story_id", storyIds)
      .order("created_at", { ascending: true }),
  ]);

  const likesByStory = new Map<string, string[]>();
  for (const row of likeRows ?? []) {
    const sid = row.story_id as string;
    const uid = row.user_id as string;
    if (!out[sid]) continue;
    if (!likesByStory.has(sid)) likesByStory.set(sid, []);
    likesByStory.get(sid)!.push(uid);
    out[sid].likesCount += 1;
    if (meId && uid === meId) out[sid].liked = true;
  }

  const commentsByStory = new Map<string, Array<{ id: string; user_id: string; content: string }>>();
  for (const row of commentRows ?? []) {
    const sid = row.story_id as string;
    if (!out[sid]) continue;
    if (!commentsByStory.has(sid)) commentsByStory.set(sid, []);
    commentsByStory.get(sid)!.push({
      id: row.id as string,
      user_id: row.user_id as string,
      content: String((row as { content?: string }).content ?? "").trim(),
    });
    out[sid].commentsCount += 1;
  }

  const profileIds = new Set<string>();
  for (const sid of storyIds) {
    for (const uid of likesByStory.get(sid) ?? []) {
      if (meId && (uid === meId || friendSet.has(uid))) profileIds.add(uid);
    }
    for (const c of commentsByStory.get(sid) ?? []) {
      profileIds.add(c.user_id);
    }
  }

  const usernameById: Record<string, string | null> = {};
  if (profileIds.size) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", Array.from(profileIds));
    for (const p of profs ?? []) {
      const row = p as { id: string; username?: string | null };
      usernameById[row.id] = row.username ?? null;
    }
  }

  for (const sid of storyIds) {
    const likers = likesByStory.get(sid) ?? [];
    if (meId) {
      out[sid].likedByLine = buildLikedByFriendsLine(likers, meId, friendIds, usernameById);
    }
    const pre = (commentsByStory.get(sid) ?? []).slice(0, PREVIEW_COMMENTS_PER_STORY);
    out[sid].commentPreviews = pre.map((c) => ({
      id: c.id,
      username: usernameById[c.user_id] ?? null,
      content: c.content,
    }));
  }

  return out;
}

/** “Liked by …” for a single share (viewer, etc.). */
export async function fetchLikedByFriendsLineForStory(
  supabase: SupabaseClient,
  storyId: string,
  meId: string
): Promise<string | null> {
  const friends = await acceptedFriendIdsExcludingBlocks(supabase, meId);
  const friendSet = new Set(friends);
  const { data: likes } = await supabase.from("story_likes").select("user_id").eq("story_id", storyId);
  const likers = (likes ?? []).map((r) => (r as { user_id: string }).user_id);
  const eligible = Array.from(new Set(likers)).filter((uid) => uid === meId || friendSet.has(uid));
  if (!eligible.length) return null;
  const { data: profs } = await supabase.from("profiles").select("id, username").in("id", eligible);
  const usernameById: Record<string, string | null> = {};
  for (const p of profs ?? []) {
    const row = p as { id: string; username?: string | null };
    usernameById[row.id] = row.username ?? null;
  }
  return buildLikedByFriendsLine(likers, meId, friends, usernameById);
}

/** Batch-load like counts, comment counts, and whether the current user liked each story. */
export async function fetchShareInteractionStatsByStoryId(
  supabase: SupabaseClient,
  storyIds: string[],
  meId: string | null
): Promise<Record<string, ShareInteractionStats>> {
  const full = await fetchHubShareFeedCardStates(supabase, storyIds, meId, []);
  const out: Record<string, ShareInteractionStats> = {};
  for (const id of storyIds) {
    const row = full[id];
    out[id] = { likesCount: row.likesCount, commentsCount: row.commentsCount, liked: row.liked };
  }
  return out;
}
