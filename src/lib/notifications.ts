import { supabase } from "@/lib/supabaseClient";
import type { NotificationType } from "../../types/notifications";

const ONLINE_COOLDOWN_MS = 20 * 60_000;
const VENUE_COOLDOWN_MS = 2 * 60 * 60_000;
const NEARBY_COOLDOWN_MS = 30 * 60_000;
const DAILY_PUSH_LIMIT = 3;

type PrefRow = {
  push_enabled: boolean;
  friend_activity_enabled: boolean;
  venue_pop_enabled: boolean;
  friend_request_enabled: boolean;
  stories_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  last_sent_at: string | null;
};

function isWithinQuietHours(now: Date, start: string | null, end: string | null) {
  if (!start || !end) return false;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = (sh ?? 0) * 60 + (sm ?? 0);
  const endMin = (eh ?? 0) * 60 + (em ?? 0);
  if (startMin === endMin) return false;
  if (startMin < endMin) return nowMin >= startMin && nowMin < endMin;
  return nowMin >= startMin || nowMin < endMin;
}

async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  try {
    await fetch("/api/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, body, data: data ?? {} }),
    });
  } catch {
    // noop (best effort)
  }
}

export async function createNotification(params: {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  venueId?: string | null;
}) {
  const { recipientId, actorId, type, venueId = null } = params;

  if (!recipientId || !actorId) return;
  if (recipientId === actorId) return;

  const { data: pref } = await supabase
    .from("notification_preferences")
    .select(
      "push_enabled, friend_activity_enabled, venue_pop_enabled, friend_request_enabled, stories_enabled, quiet_hours_start, quiet_hours_end, last_sent_at"
    )
    .eq("user_id", recipientId)
    .maybeSingle();

  const prefs = (pref as PrefRow | null) ?? {
    push_enabled: true,
    friend_activity_enabled: true,
    venue_pop_enabled: true,
    friend_request_enabled: true,
    stories_enabled: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
    last_sent_at: null,
  };

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const { count: sentToday } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", recipientId)
    .gte("created_at", todayStart.toISOString());

  const directSocialEvent =
    type === "friend_online" ||
    type === "friend_request_received" ||
    type === "friend_request_accepted" ||
    type === "friend_story" ||
    type === "friend_joined_venue";
  if (!directSocialEvent && (sentToday ?? 0) >= DAILY_PUSH_LIMIT) return;

  if (isWithinQuietHours(now, prefs.quiet_hours_start, prefs.quiet_hours_end)) return;

  if (type === "friend_online") {
    if (!prefs.friend_activity_enabled) return;
    const sinceIso = new Date(Date.now() - ONLINE_COOLDOWN_MS).toISOString();
    const { data: recent } = await supabase
      .from("notifications")
      .select("id")
      .eq("recipient_user_id", recipientId)
      .eq("actor_user_id", actorId)
      .eq("type", "friend_online")
      .gte("created_at", sinceIso)
      .limit(1);

    if (recent?.length) return;
  }

  if (type === "friend_joined_venue") {
    if (!prefs.friend_activity_enabled) return;
    const { data: recentVenue } = await supabase
      .from("notifications")
      .select("id, venue_id")
      .eq("recipient_user_id", recipientId)
      .eq("actor_user_id", actorId)
      .eq("type", "friend_joined_venue")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Anti-spam: do not re-notify same venue repeatedly for 2 hours.
    if (recentVenue?.venue_id && recentVenue.venue_id === venueId) {
      const { data: latestSame } = await supabase
        .from("notifications")
        .select("created_at")
        .eq("recipient_user_id", recipientId)
        .eq("actor_user_id", actorId)
        .eq("type", "friend_joined_venue")
        .eq("venue_id", venueId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (
        latestSame?.created_at &&
        Date.now() - new Date(latestSame.created_at).getTime() < VENUE_COOLDOWN_MS
      ) {
        return;
      }
    }
  }

  if (type === "friend_nearby") {
    if (!prefs.friend_activity_enabled) return;
    const sinceIso = new Date(Date.now() - NEARBY_COOLDOWN_MS).toISOString();
    const { data: recentNearby } = await supabase
      .from("notifications")
      .select("id")
      .eq("recipient_user_id", recipientId)
      .eq("actor_user_id", actorId)
      .eq("type", "friend_nearby")
      .gte("created_at", sinceIso)
      .limit(1);
    if (recentNearby?.length) return;
  }

  if (type === "venue_popping" && !prefs.venue_pop_enabled) return;
  if (type === "friend_story" && !prefs.stories_enabled) return;
  if ((type === "friend_request_accepted" || type === "friend_request_received") && !prefs.friend_request_enabled) return;

  const { error } = await supabase.from("notifications").insert({
    recipient_user_id: recipientId,
    actor_user_id: actorId,
    type,
    venue_id: venueId,
  });
  if (error) return;

  const { data: actor } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", actorId)
    .maybeSingle();
  const actorName = actor?.display_name || actor?.username || "Someone";
  let pushTitle = "AfterHours";
  let pushBody = "Something new is happening.";
  if (type === "friend_online") {
    pushTitle = "Friends active";
    pushBody = `${actorName} is out right now`;
  } else if (type === "friend_nearby") {
    pushTitle = "Friend nearby";
    pushBody = `${actorName} is nearby`;
  } else if (type === "friend_joined_venue") {
    const { data: venue } = venueId
      ? await supabase.from("venues").select("name").eq("id", venueId).maybeSingle()
      : { data: null as any };
    pushTitle = "Friend at venue";
    pushBody = `${actorName} is at ${venue?.name ?? "a venue"} 👀`;
  } else if (type === "friend_story") {
    pushTitle = "New story";
    pushBody = `${actorName} posted a new story`;
  } else if (type === "friend_request_received") {
    pushTitle = "New friend request";
    pushBody = `${actorName} sent you a friend request`;
  } else if (type === "friend_request_accepted") {
    pushTitle = "New connection";
    pushBody = `You and ${actorName} are now connected`;
  } else if (type === "venue_popping") {
    pushTitle = "Venue update";
    pushBody = `${venueId ? "A nearby venue" : "A venue"} is heating up 🔥`;
  }

  if (prefs.push_enabled) {
    // Do not push if user appears currently active in app.
    const { data: recPresence } = await supabase
      .from("user_presence")
      .select("updated_at")
      .eq("user_id", recipientId)
      .maybeSingle();
    const currentlyActive =
      !!recPresence?.updated_at &&
      Date.now() - new Date(recPresence.updated_at).getTime() < 20_000;
    const shouldSuppressForActiveSession = currentlyActive && type !== "friend_online";
    if (!shouldSuppressForActiveSession) {
      await sendPushToUser(recipientId, pushTitle, pushBody, {
        type,
        venueId: venueId ?? null,
        actorId,
      });
      await supabase
        .from("notification_preferences")
        .upsert({ user_id: recipientId, last_sent_at: new Date().toISOString() });
    }
  }
}

export async function getMyFriendIds(userId: string) {
  const { data } = await supabase
    .from("friend_requests")
    .select("requester_id, addressee_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  const friendIds = (data ?? []).map((r: any) =>
    r.requester_id === userId ? r.addressee_id : r.requester_id
  );

  return Array.from(new Set(friendIds));
}

export async function getNotificationPreferences(userIds: string[]) {
  if (!userIds.length) return new Map<string, { online: boolean; venue: boolean }>();

  const { data } = await supabase
    .from("notification_preferences")
    .select("user_id, friend_activity_enabled, venue_pop_enabled")
    .in("user_id", userIds);

  const prefs = new Map<string, { online: boolean; venue: boolean }>();
  for (const uid of userIds) {
    prefs.set(uid, { online: true, venue: true });
  }

  (data ?? []).forEach((row: any) => {
    prefs.set(row.user_id, {
      online: row.friend_activity_enabled ?? true,
      venue: row.venue_pop_enabled ?? true,
    });
  });

  return prefs;
}

