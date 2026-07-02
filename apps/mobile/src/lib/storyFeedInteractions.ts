import { mergeShareStatsCache } from "./shareStatsCache";
import { supabase } from "./supabase/client";

export type ShareInteractionStats = {
  likesCount: number;
  commentsCount: number;
  liked: boolean;
};

export type HubShareFeedCardState = ShareInteractionStats & {
  likedByLine: string | null;
  commentPreviews: Array<{ id: string; username: string | null; content: string }>;
};

/** Optimistic hub card patch — instant like/unlike before network round-trip. */
export function patchHubShareLikeOptimistic(
  prev: HubShareFeedCardState,
  nextLiked: boolean
): HubShareFeedCardState {
  if (prev.liked === nextLiked) return prev;
  const likesCount = Math.max(0, prev.likesCount + (nextLiked ? 1 : -1));
  let likedByLine = prev.likedByLine;
  if (nextLiked) {
    if (!prev.likedByLine) likedByLine = "Liked by You";
    else if (!prev.likedByLine.includes("You")) {
      likedByLine = `Liked by You, ${prev.likedByLine.replace(/^Liked by /, "")}`;
    }
  } else if (prev.likedByLine?.includes("You")) {
    const rest = prev.likedByLine
      .replace(/^Liked by You,?\s*/, "")
      .replace(/^Liked by You$/, "")
      .trim();
    likedByLine = rest ? `Liked by ${rest}` : null;
  }
  return { ...prev, liked: nextLiked, likesCount, likedByLine };
}

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

/** Hub share strip — counts, liked-by line, comment previews (mirrors web `storyFeedInteractions`). */
export async function fetchHubShareFeedCardStates(
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
    const { data: profs } = await supabase.from("profiles").select("id, username").in("id", Array.from(profileIds));
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

  mergeShareStatsCache(out);
  return out;
}

/** “Liked by …” for a single share — mirrors web `fetchLikedByFriendsLineForStory`. */
export async function fetchLikedByFriendsLineForStory(
  storyId: string,
  meId: string,
  friendIds: string[]
): Promise<string | null> {
  const { data: likes } = await supabase.from("story_likes").select("user_id").eq("story_id", storyId);
  const likers = (likes ?? []).map((r) => r.user_id as string);
  const friendSet = new Set(friendIds);
  const eligible = Array.from(new Set(likers)).filter((uid) => uid === meId || friendSet.has(uid));
  if (!eligible.length) return null;

  const { data: profs } = await supabase.from("profiles").select("id, username").in("id", eligible);
  const usernameById: Record<string, string | null> = {};
  for (const p of profs ?? []) {
    usernameById[p.id] = p.username ?? null;
  }
  return buildLikedByFriendsLine(likers, meId, friendIds, usernameById);
}
