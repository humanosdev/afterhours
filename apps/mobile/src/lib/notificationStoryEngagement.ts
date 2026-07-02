import { isStoryRowShareFlag } from "./hubFeedSemantics";
import { fetchActiveMomentsForUser } from "./fetchActiveMoments";
import { supabase } from "./supabase/client";
import type { StoryEngagementSurface } from "@intencity/shared";
import { storyEngagementSurfaceFromShareFlag } from "@intencity/shared";
import type { StoryViewerGroup } from "./storyViewerTypes";
import type { NotificationWithMeta } from "../types/notification";
import type { Router } from "expo-router";

export async function resolveStoryEngagementSurface(
  storyId: string,
  hint?: boolean | null
): Promise<StoryEngagementSurface | null> {
  if (hint === true) return "share";
  if (hint === false) return "moment";

  const { data, error } = await supabase
    .from("stories")
    .select("is_share")
    .eq("id", storyId)
    .maybeSingle();

  if (error || !data) return null;
  return storyEngagementSurfaceFromShareFlag(isStoryRowShareFlag(data.is_share));
}

export async function buildOwnMomentViewerGroup(
  meId: string,
  focusStoryId?: string | null
): Promise<{ group: StoryViewerGroup; storyIndex: number } | null> {
  const { data: prof } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", meId)
    .maybeSingle();

  const stories = await fetchActiveMomentsForUser(meId, { viewerId: meId });
  if (!stories.length) return null;

  let storyIndex = 0;
  if (focusStoryId) {
    const idx = stories.findIndex((s) => s.id === focusStoryId);
    if (idx >= 0) storyIndex = idx;
  }

  return {
    group: {
      user_id: meId,
      username: prof?.username ?? null,
      avatar_url: prof?.avatar_url ?? null,
      stories,
    },
    storyIndex,
  };
}

export async function buildActorMomentViewerGroup(
  actorUserId: string,
  viewerId: string
): Promise<StoryViewerGroup | null> {
  const { data: prof } = await supabase
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", actorUserId)
    .maybeSingle();

  const stories = await fetchActiveMomentsForUser(actorUserId, { viewerId });
  if (!stories.length) return null;

  return {
    user_id: actorUserId,
    username: prof?.username ?? null,
    avatar_url: prof?.avatar_url ?? null,
    stories,
  };
}

type NavigateStoryEngagementParams = {
  n: NotificationWithMeta;
  meId: string;
  router: Router;
  openShareComments?: (storyId: string) => void;
  openStoryViewer?: (group: StoryViewerGroup, options?: { storyIndex?: number }) => void;
};

/** Route story engagement notifications — share detail vs moment viewer (no cross-surface). */
export async function navigateStoryEngagementNotification({
  n,
  meId,
  router,
  openShareComments,
  openStoryViewer,
}: NavigateStoryEngagementParams): Promise<void> {
  if (!n.story_id) return;

  if (n.type === "friend_story") {
    if (openStoryViewer && n.actor_user_id) {
      const group = await buildActorMomentViewerGroup(n.actor_user_id, meId);
      if (group) {
        openStoryViewer(group, { storyIndex: 0 });
        return;
      }
    }
    const username = n.actor_username?.trim();
    if (username) {
      router.push(`/u/${encodeURIComponent(username)}`);
    }
    return;
  }

  const surface =
    n.story_is_share === true || n.story_is_share === false
      ? storyEngagementSurfaceFromShareFlag(n.story_is_share)
      : await resolveStoryEngagementSurface(n.story_id, n.story_is_share);

  if (!surface) {
    router.push(`/moments/${encodeURIComponent(n.story_id)}`);
    return;
  }

  if (n.type === "story_comment" || surface === "share") {
    router.push(`/moments/${encodeURIComponent(n.story_id)}`);
    if (n.type === "story_comment") {
      openShareComments?.(n.story_id);
    }
    return;
  }

  if (openStoryViewer) {
    const own = await buildOwnMomentViewerGroup(meId, n.story_id);
    if (own) {
      openStoryViewer(own.group, { storyIndex: own.storyIndex });
      return;
    }
  }

  router.push("/profile");
}
