import { createNotification } from "./createNotification";
import { supabase } from "./supabase/client";

/** Phase 5.2 — debounce multiple friend_online rows into one bundle. */
export const FRIENDS_ACTIVE_BUNDLE_DEBOUNCE_MS = 30_000;

export async function notifyFriendOnline(args: {
  recipientId: string;
  actorId: string;
  actorLabel: string;
  hourBucket: string;
}): Promise<void> {
  const since = new Date(Date.now() - FRIENDS_ACTIVE_BUNDLE_DEBOUNCE_MS).toISOString();
  const { data: recentRows } = await supabase
    .from("notifications")
    .select("id, type, actor_user_id, created_at")
    .eq("recipient_user_id", args.recipientId)
    .in("type", ["friend_online", "friends_active_bundle"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(16);

  const recentOnline = (recentRows ?? []).filter((row) => row.type === "friend_online");
  const hasRecentBundle = (recentRows ?? []).some((row) => row.type === "friends_active_bundle");

  if (recentOnline.length >= 1 || hasRecentBundle) {
    const bucket = Math.floor(Date.now() / FRIENDS_ACTIVE_BUNDLE_DEBOUNCE_MS);
    const friendCount = recentOnline.length + 1;
    await createNotification({
      recipientId: args.recipientId,
      actorId: args.actorId,
      type: "friends_active_bundle",
      dedupeKey: `friends_active_bundle:${args.recipientId}:${bucket}`,
      pushTitle: "Friends are active",
      pushBody:
        friendCount <= 2
          ? `${args.actorLabel} and a friend are on the map.`
          : `${friendCount} friends are active on the map.`,
      route: "/map",
    });
    return;
  }

  await createNotification({
    recipientId: args.recipientId,
    actorId: args.actorId,
    type: "friend_online",
    dedupeKey: `friend_online:${args.recipientId}:${args.actorId}:${args.hourBucket}`,
    pushTitle: `${args.actorLabel} is active`,
    pushBody: "Your friend is on the map.",
    route: "/map",
  });
}
