/**
 * Instagram-style story like/comment feed grouping (display + push policy).
 *
 * - Rows 1–3 distinct actors on the same post: separate lines in the activity feed.
 * - 4+ distinct actors: one bundled row — "{latest} and others liked your post".
 * - Push/toast: only for the first three distinct actors; 4+ are feed-only (no OS spam).
 */

export const STORY_ENGAGEMENT_FEED_GROUP_MIN_DISTINCT_ACTORS = 4;

export const STORY_ENGAGEMENT_GROUP_TYPES = ["story_like", "story_comment"] as const;
export type StoryEngagementGroupType = (typeof STORY_ENGAGEMENT_GROUP_TYPES)[number];

/** Hub share post vs ephemeral moment ring — same `story_id` table, different surfaces. */
export type StoryEngagementSurface = "share" | "moment";

export function storyEngagementSurfaceFromShareFlag(
  isShare: boolean | null | undefined
): StoryEngagementSurface {
  return isShare ? "share" : "moment";
}

export function storyEngagementLikeLine(
  actorName: string,
  surface: StoryEngagementSurface
): string {
  const who = actorName.trim() || "Someone";
  return `${who} liked your ${surface === "share" ? "share" : "moment"}`;
}

export function storyEngagementCommentLine(
  actorName: string,
  surface: StoryEngagementSurface,
  preview?: string | null
): string {
  const who = actorName.trim() || "Someone";
  const noun = surface === "share" ? "share" : "moment";
  const tail = preview?.trim() ? `: "${preview.trim()}"` : "";
  return `${who} commented on your ${noun}${tail}`;
}

export function isStoryEngagementGroupType(type: string): type is StoryEngagementGroupType {
  return (STORY_ENGAGEMENT_GROUP_TYPES as readonly string[]).includes(type);
}

/** Bundled feed row (4+ distinct actors on same story + type). */
export function isGroupedStoryEngagementFeedRow(item: { group_actor_count?: number }): boolean {
  return (item.group_actor_count ?? 0) >= STORY_ENGAGEMENT_FEED_GROUP_MIN_DISTINCT_ACTORS;
}

/** OS push / in-app toast for story likes & comments (feed still gets a row). */
export function shouldSendPushForStoryEngagement(distinctActorCount: number): boolean {
  return distinctActorCount < STORY_ENGAGEMENT_FEED_GROUP_MIN_DISTINCT_ACTORS;
}

export function storyEngagementGroupKey(type: StoryEngagementGroupType, storyId: string): string {
  return `${type}:${storyId}`;
}

export function resolveActorDisplayName(meta: {
  actor_label?: string | null;
  actor_display_name?: string | null;
  actor_username?: string | null;
}): string {
  return (
    meta.actor_label?.trim() ||
    meta.actor_display_name?.trim() ||
    meta.actor_username?.trim() ||
    "Someone"
  );
}

/** Secondary line under the actor name on a bundled row. */
export function storyEngagementGroupedSubtext(
  type: StoryEngagementGroupType,
  surface: StoryEngagementSurface
): string {
  if (type === "story_like") {
    return surface === "share" ? "and others liked your share" : "and others liked your moment";
  }
  return surface === "share"
    ? "and others commented on your share"
    : "and others commented on your moment";
}

/** Single-line copy (e.g. push or accessibility). */
export function storyEngagementGroupedMessage(
  type: StoryEngagementGroupType,
  latestActorName: string,
  surface: StoryEngagementSurface
): string {
  const name = latestActorName.trim() || "Someone";
  if (type === "story_like") {
    return `${name} and others liked your ${surface === "share" ? "share" : "moment"}`;
  }
  return `${name} and others commented on your ${surface === "share" ? "share" : "moment"}`;
}

export type StoryEngagementFeedItem = {
  id: string;
  actor_user_id: string;
  story_id?: string | null;
  /** From `stories.is_share` — separates share vs moment copy and navigation. */
  story_is_share?: boolean | null;
  type: string;
  created_at: string;
  read: boolean;
  message_preview?: string | null;
  actor_label?: string | null;
  actor_display_name?: string | null;
  actor_username?: string | null;
  actor_avatar_url?: string | null;
  grouped_row_ids?: string[];
  group_preview_avatars?: (string | null)[];
  group_preview_usernames?: (string | null)[];
  group_actor_count?: number;
};

/**
 * Collapse story_like / story_comment rows per story when 4+ distinct actors.
 * PWA + native notifications feed share this logic.
 */
export function groupStoryEngagementFeedItems<T extends StoryEngagementFeedItem>(
  items: T[]
): T[] {
  const bundleMap = new Map<string, T[]>();
  const passthrough: T[] = [];

  for (const n of items) {
    if (isStoryEngagementGroupType(n.type) && n.story_id) {
      const key = storyEngagementGroupKey(n.type, n.story_id);
      const arr = bundleMap.get(key) ?? [];
      arr.push(n);
      bundleMap.set(key, arr);
    } else {
      passthrough.push(n);
    }
  }

  const bundles: T[] = [];
  for (const [key, arr] of bundleMap.entries()) {
    const distinctActorIds = Array.from(new Set(arr.map((x) => x.actor_user_id)));
    if (distinctActorIds.length >= STORY_ENGAGEMENT_FEED_GROUP_MIN_DISTINCT_ACTORS) {
      const sorted = arr.slice().sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      const latest = sorted[0]!;
      const latestName = resolveActorDisplayName(latest);

      const previewIds = distinctActorIds.slice(0, 3);
      const group_preview_avatars = previewIds.map((id) => {
        const hit = arr.find((r) => r.actor_user_id === id);
        return hit?.actor_avatar_url ?? null;
      });
      const group_preview_usernames = previewIds.map((id) => {
        const hit = arr.find((r) => r.actor_user_id === id);
        return hit?.actor_username ?? hit?.actor_display_name ?? null;
      });
      const anyUnread = arr.some((r) => !r.read);

      bundles.push({
        ...latest,
        id: `group:${key}`,
        read: !anyUnread,
        grouped_row_ids: arr.map((r) => r.id),
        group_preview_avatars,
        group_preview_usernames,
        group_actor_count: distinctActorIds.length,
        actor_display_name: latestName,
        actor_username: latest.actor_username ?? null,
        actor_label: latestName,
        actor_avatar_url: latest.actor_avatar_url ?? group_preview_avatars[0] ?? null,
        message_preview: null,
        story_is_share: latest.story_is_share ?? null,
      });
    } else {
      bundles.push(...arr);
    }
  }

  return [...passthrough, ...bundles].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
  );
}
