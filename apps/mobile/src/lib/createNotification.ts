import {
  encodeFriendRequestNotificationPreview,
  type FriendRequestNotificationPreview,
} from "./notificationFriendPreview";
import { pushCopyForNotification } from "./notificationPushCopy";
import { requestPushNotify } from "./requestPushNotify";
import { resolvePushActorLabel } from "./resolvePushActorLabel";
import { supabase } from "./supabase/client";
import type { NotificationType } from "../types/notification";

type PreferenceRow = {
  user_id: string;
  friend_activity_enabled?: boolean | null;
  venue_pop_enabled?: boolean | null;
  friend_request_enabled?: boolean | null;
  stories_enabled?: boolean | null;
  messages_enabled?: boolean | null;
};

function typePreferenceEnabled(type: NotificationType, prefs?: PreferenceRow | null): boolean {
  if (!prefs) return true;
  switch (type) {
    case "friend_online":
    case "friend_nearby":
    case "friend_joined_venue":
    case "friends_active_bundle":
      return prefs.friend_activity_enabled ?? true;
    case "friend_request_received":
    case "friend_request_accepted":
      return prefs.friend_request_enabled ?? true;
    case "story_like":
    case "story_comment":
    case "friend_story":
      return prefs.stories_enabled ?? true;
    case "venue_popping":
      return prefs.venue_pop_enabled ?? true;
    case "message":
      return prefs.messages_enabled ?? true;
    default:
      return true;
  }
}

export type CreateNotificationParams = {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  venueId?: string | null;
  storyId?: string | null;
  /** Pass for story_like / story_comment so push copy matches share vs moment. */
  storyIsShare?: boolean | null;
  commentId?: string | null;
  chatId?: string | null;
  messagePreview?: string | null;
  dedupeKey?: string | null;
  /** P2O-D presence notifications — override default push copy. */
  pushTitle?: string;
  pushBody?: string;
  route?: string;
};

/**
 * In-app row + device push via Supabase Edge Function `push-notify` (Phase 1).
 */
export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  const { recipientId, actorId, type } = params;
  if (!recipientId || !actorId || recipientId === actorId) return false;

  const { data: prefRow } = await supabase
    .from("notification_preferences")
    .select(
      "user_id, friend_activity_enabled, venue_pop_enabled, friend_request_enabled, stories_enabled, messages_enabled"
    )
    .eq("user_id", recipientId)
    .maybeSingle();

  const prefs = (prefRow ?? null) as PreferenceRow | null;
  if (!typePreferenceEnabled(type, prefs)) return false;

  const preview =
    params.messagePreview != null
      ? params.messagePreview.slice(0, 140)
      : null;

  const { error } = await supabase.from("notifications").insert({
    recipient_user_id: recipientId,
    actor_user_id: actorId,
    type,
    venue_id: params.venueId ?? null,
    story_id: params.storyId ?? null,
    comment_id: params.commentId ?? null,
    chat_id: params.chatId ?? null,
    message_preview: preview,
    dedupe_key: params.dedupeKey ?? null,
  });

  if (error?.code === "23505") return false;
  if (error) {
    console.warn("createNotification failed:", type, error.code, error.message);
    return false;
  }

  const actorLabel = await resolvePushActorLabel(actorId);
  const copy =
    params.pushTitle && params.pushBody
      ? {
          title: params.pushTitle,
          body: params.pushBody,
          route: params.route ?? "/notifications",
        }
      : pushCopyForNotification({
          type,
          storyId: params.storyId,
          storyIsShare: params.storyIsShare,
          chatId: params.chatId,
          messagePreview: params.messagePreview,
          actorLabel,
        });
  if (copy) {
    void requestPushNotify({
      recipientId,
      title: copy.title,
      body: copy.body,
      route: copy.route,
      notificationType: type,
      storyId: params.storyId,
    });
  }

  return true;
}

export async function createMessageNotification(params: {
  recipientId: string;
  actorId: string;
  chatId: string;
  messagePreview: string;
  dedupeKey: string;
}): Promise<void> {
  await createNotification({
    recipientId: params.recipientId,
    actorId: params.actorId,
    type: "message",
    chatId: params.chatId,
    messagePreview: params.messagePreview,
    dedupeKey: params.dedupeKey,
  });
}

export async function createStoryLikeNotification(params: {
  recipientId: string;
  actorId: string;
  storyId: string;
  isShare: boolean;
}): Promise<void> {
  const { recipientId, actorId, storyId, isShare } = params;
  if (recipientId === actorId) return;
  await createNotification({
    recipientId,
    actorId,
    type: "story_like",
    storyId,
    storyIsShare: isShare,
    dedupeKey: `story_like:${storyId}:${actorId}`,
  });
}

export async function createStoryCommentNotification(params: {
  recipientId: string;
  actorId: string;
  storyId: string;
  commentPreview: string;
  isShare?: boolean;
}): Promise<void> {
  const { recipientId, actorId, storyId } = params;
  if (recipientId === actorId) return;
  await createNotification({
    recipientId,
    actorId,
    type: "story_comment",
    storyId,
    storyIsShare: params.isShare ?? true,
    messagePreview: params.commentPreview.slice(0, 140),
  });
}

export async function createFriendRequestAcceptedNotification(params: {
  recipientId: string;
  actorId: string;
  actorPreview: FriendRequestNotificationPreview;
}): Promise<void> {
  const preview = encodeFriendRequestNotificationPreview(params.actorPreview);
  await createNotification({
    recipientId: params.recipientId,
    actorId: params.actorId,
    type: "friend_request_accepted",
    messagePreview: preview,
  });
}
