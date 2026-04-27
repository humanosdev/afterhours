import { supabase } from "@/lib/supabaseClient";
import type { NotificationType } from "../../types/notifications";

const ONLINE_COOLDOWN_MS = 5 * 60_000;

export async function createNotification(params: {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  venueId?: string | null;
}) {
  const { recipientId, actorId, type, venueId = null } = params;

  if (!recipientId || !actorId) return;
  if (recipientId === actorId) return;

  if (type === "friend_online") {
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
    const { data: recentVenue } = await supabase
      .from("notifications")
      .select("id, venue_id")
      .eq("recipient_user_id", recipientId)
      .eq("actor_user_id", actorId)
      .eq("type", "friend_joined_venue")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Anti-spam: do not re-notify same venue repeatedly.
    if (recentVenue?.venue_id && recentVenue.venue_id === venueId) return;
  }

  await supabase.from("notifications").insert({
    recipient_user_id: recipientId,
    actor_user_id: actorId,
    type,
    venue_id: venueId,
  });
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
    .from("user_preferences")
    .select("user_id, notify_friend_online, notify_friend_joined_venue")
    .in("user_id", userIds);

  const prefs = new Map<string, { online: boolean; venue: boolean }>();
  for (const uid of userIds) {
    prefs.set(uid, { online: true, venue: true });
  }

  (data ?? []).forEach((row: any) => {
    prefs.set(row.user_id, {
      online: row.notify_friend_online ?? true,
      venue: row.notify_friend_joined_venue ?? true,
    });
  });

  return prefs;
}

