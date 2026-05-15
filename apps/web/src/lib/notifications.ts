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
  if (insertError) {
    console.warn("createNotification insert failed:", insertError.code, insertError.message);
    return;
  }

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

