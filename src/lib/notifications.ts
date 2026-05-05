import type { NotificationType } from "../../types/notifications";
import { supabase } from "@/lib/supabaseClient";

type PreferenceRow = {
  user_id: string;
  push_enabled: boolean | null;
  friend_activity_enabled: boolean | null;
  venue_pop_enabled: boolean | null;
  friend_request_enabled: boolean | null;
  stories_enabled: boolean | null;
  messages_enabled?: boolean | null;
};

function typePreferenceEnabled(type: NotificationType, prefs?: PreferenceRow | null) {
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

  const { data: prefRow } = await supabase
    .from("notification_preferences")
    .select(
      "user_id, push_enabled, friend_activity_enabled, venue_pop_enabled, friend_request_enabled, stories_enabled, messages_enabled"
    )
    .eq("user_id", recipientId)
    .maybeSingle();

  const prefs = (prefRow ?? null) as PreferenceRow | null;
  if (!typePreferenceEnabled(type, prefs)) return;

  const insertPayload = {
    recipient_user_id: recipientId,
    actor_user_id: actorId,
    type,
    venue_id: params.venueId ?? null,
    story_id: params.storyId ?? null,
    comment_id: params.commentId ?? null,
    chat_id: params.chatId ?? null,
    message_preview: params.messagePreview ?? null,
    dedupe_key: params.dedupeKey ?? null,
  };

  const { error: insertError } = await supabase.from("notifications").insert(insertPayload);
  // Dedupe: unique index on dedupe_key — skip quietly (no duplicate push).
  if (insertError?.code === "23505") return;
  if (insertError) return;

  if ((prefs?.push_enabled ?? true) === false) return;

  if (params.pushTitle && params.pushBody) {
    await fetch("/api/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: recipientId,
        title: params.pushTitle,
        body: params.pushBody,
        route: params.route ?? "/notifications",
      }),
    }).catch(() => {});
  }
}

export async function getMyFriendIds(userId: string) {
  const { data, error } = await supabase
    .from("friend_requests")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) return [] as string[];
  const rows = (data ?? []) as Array<{ requester_id: string; addressee_id: string }>;
  const ids = new Set<string>();
  for (const row of rows) {
    ids.add(row.requester_id === userId ? row.addressee_id : row.requester_id);
  }
  return Array.from(ids);
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

