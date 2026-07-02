import {
  shouldSendPushForStoryEngagement,
  type StoryEngagementGroupType,
} from "@intencity/shared";
import type { NotificationType } from "../../types/notifications";
import { supabase } from "@/lib/supabaseClient";
import { acceptedFriendIdsExcludingBlocks } from "@/lib/pairBlockStatus";

/** Stored in `notifications.message_preview` for friend-request types when profile RLS hides the actor. */
export type FriendRequestNotificationPreview = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

export function encodeFriendRequestNotificationPreview(
  p: FriendRequestNotificationPreview
): string | null {
  const payload = {
    dn: p.display_name?.trim() || null,
    un: p.username?.trim() || null,
    av: p.avatar_url?.trim() || null,
  };
  if (!payload.dn && !payload.un && !payload.av) return null;
  return JSON.stringify(payload);
}

export function decodeFriendRequestNotificationPreview(
  raw: string | null | undefined
): FriendRequestNotificationPreview {
  if (!raw?.trim()) return {};
  try {
    const o = JSON.parse(raw) as { dn?: unknown; un?: unknown; av?: unknown };
    return {
      display_name: typeof o.dn === "string" ? o.dn : null,
      username: typeof o.un === "string" ? o.un : null,
      avatar_url: typeof o.av === "string" ? o.av : null,
    };
  } catch {
    return {};
  }
}

/** Requester/recipient always reads their own row (not subject to addressee RLS). */
export async function fetchProfileForFriendRequestNotification(
  userId: string
): Promise<FriendRequestNotificationPreview> {
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return {};
  return {
    username: data.username ?? null,
    display_name: data.display_name ?? null,
    avatar_url: data.avatar_url ?? null,
  };
}

/** Distinct actors who already have a story like/comment row for this recipient. */
export async function countDistinctStoryEngagementActors(
  recipientId: string,
  storyId: string,
  type: StoryEngagementGroupType
): Promise<number> {
  const { data, error } = await supabase
    .from("notifications")
    .select("actor_user_id")
    .eq("recipient_user_id", recipientId)
    .eq("story_id", storyId)
    .eq("type", type);
  if (error) {
    console.warn("countDistinctStoryEngagementActors:", error.message);
    return 0;
  }
  return new Set((data ?? []).map((r) => r.actor_user_id)).size;
}

export async function createNotification(params: {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  venueId?: string | null;
  storyId?: string | null;
  commentId?: string | null;
  chatId?: string | null;
  messagePreview?: string | null;
  dedupeKey?: string | null;
  pushTitle?: string;
  pushBody?: string;
  route?: string;
}) {
  const { recipientId, actorId, type } = params;
  if (!recipientId || !actorId || recipientId === actorId) return;

  const preview =
    params.messagePreview != null ? params.messagePreview.slice(0, 140) : null;

  const { data: notificationId, error: insertError } = await supabase.rpc("create_notification_v1", {
    p_recipient_id: recipientId,
    p_type: type,
    p_venue_id: params.venueId ?? null,
    p_story_id: params.storyId ?? null,
    p_comment_id: params.commentId ?? null,
    p_chat_id: params.chatId ?? null,
    p_message_preview: preview,
    p_dedupe_key: params.dedupeKey ?? null,
  });

  if (insertError) {
    console.warn("createNotification insert failed:", insertError.code, insertError.message);
    return;
  }
  if (!notificationId || typeof notificationId !== "string") return;

  if (
    params.storyId &&
    (type === "story_like" || type === "story_comment")
  ) {
    const distinctActors = await countDistinctStoryEngagementActors(
      recipientId,
      params.storyId,
      type
    );
    if (!shouldSendPushForStoryEngagement(distinctActors)) {
      return;
    }
  }

  if (params.pushTitle && params.pushBody) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    await fetch("/api/push/notify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        userId: recipientId,
        notificationId,
        title: params.pushTitle,
        body: params.pushBody,
        route: params.route ?? "/notifications",
        notificationType: type,
        storyId: params.storyId ?? null,
      }),
    }).catch(() => {});
  }
}

export async function getMyFriendIds(userId: string) {
  try {
    return await acceptedFriendIdsExcludingBlocks(supabase, userId);
  } catch {
    return [] as string[];
  }
}

export async function getNotificationPreferences(userIds: string[]) {
  const prefs = new Map<string, { online: boolean; venue: boolean }>();
  if (userIds.length === 0) return prefs;
  const { data } = await supabase
    .from("notification_preferences")
    .select("user_id, friend_activity_enabled")
    .in("user_id", userIds);
  const rows = (data ?? []) as Array<{ user_id: string; friend_activity_enabled: boolean | null }>;
  for (const uid of userIds) {
    const row = rows.find((x) => x.user_id === uid);
    const enabled = row?.friend_activity_enabled ?? true;
    prefs.set(uid, { online: enabled, venue: enabled });
  }
  return prefs;
}

