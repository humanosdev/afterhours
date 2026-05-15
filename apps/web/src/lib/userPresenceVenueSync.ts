import type { SupabaseClient } from "@supabase/supabase-js";
import { computePresenceFromGps } from "@intencity/shared";
import {
  createNotification,
  getMyFriendIds,
  getNotificationPreferences,
} from "@/lib/notifications";
import { isFriendOnlineNow, isPresenceLive, isValidCoordinatePair } from "@/lib/presence";
import { upsertUserPresenceGhostSafeCoords } from "@/lib/userPresenceWrite";

export type VenueForPresenceSync = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  inner_radius_m: number;
  outer_radius_m: number;
  halo_radius_m: number | null;
};

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type PrevPresence = {
  venue_id: string | null;
  venue_state: string | null;
  entered_inner_at: string | null;
  updated_at: string | null;
  lat: number | null;
  lng: number | null;
};

/**
 * Full `user_presence` write + friend notifications — same logic whether the user is on `/map`
 * or any other shell route (`AppShell` pings). Keeps `venue_id` / zone state aligned with GPS.
 */
export async function syncUserPresenceWithVenuesFromCoords(
  supabase: SupabaseClient,
  args: {
    userId: string;
    lat: number;
    lng: number;
    venues: VenueForPresenceSync[];
    myGhostMode: boolean;
    /** Push / in-app copy; if omitted, loaded from `profiles`. */
    actorLabel?: string | null;
  }
): Promise<{ error: Error | null }> {
  const { userId, lat, lng, venues, myGhostMode } = args;
  if (!isValidCoordinatePair(lat, lng)) {
    return { error: new Error("invalid coordinates") };
  }

  if (myGhostMode) {
    const { error } = await upsertUserPresenceGhostSafeCoords(supabase, { userId, lat, lng });
    return { error: error ? new Error(error.message) : null };
  }

  const { data: prevRow, error: prevErr } = await supabase
    .from("user_presence")
    .select("venue_id, venue_state, entered_inner_at, updated_at, lat, lng")
    .eq("user_id", userId)
    .maybeSingle();

  if (prevErr) {
    return { error: new Error(prevErr.message) };
  }

  const prev = (prevRow ?? null) as PrevPresence | null;

  const prevState = (prev?.venue_state ?? "outside") as string;

  const computed = computePresenceFromGps({
    lat,
    lng,
    venues,
    prevVenueState: prevState,
    prevEnteredInnerAt: prev?.entered_inner_at ?? null,
  });
  const venueId = computed.venueId;
  const zoneType = computed.zoneType;
  const nextVenueState = computed.venueState;
  const enteredInnerAt = computed.enteredInnerAt;

  const { error: upErr } = await supabase.from("user_presence").upsert(
    {
      user_id: userId,
      lng,
      lat,
      venue_id: venueId,
      zone_type: zoneType,
      venue_state: nextVenueState,
      entered_inner_at: enteredInnerAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (upErr) {
    return { error: new Error(upErr.message) };
  }

  let actorLabel =
    typeof args.actorLabel === "string" && args.actorLabel.trim()
      ? args.actorLabel.trim()
      : "";
  if (!actorLabel) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", userId)
      .maybeSingle();
    actorLabel =
      (prof as { display_name?: string | null; username?: string | null } | null)?.display_name?.trim() ||
      (prof as { username?: string | null } | null)?.username?.trim() ||
      "A friend";
  }

  const wasRecentlyOnline = isFriendOnlineNow(prev?.updated_at ?? null);
  const nowRecentlyOnline = true;

  const friendIds = await getMyFriendIds(userId);
  if (friendIds.length > 0) {
    const prefs = await getNotificationPreferences(friendIds);
    const hourBucket = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}-${new Date().getHours()}`;
    const dayBucket = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
    const venueLabel =
      venueId && venues.length
        ? venues.find((v) => v.id === venueId)?.name?.trim() || "a venue"
        : "a venue";

    if (!wasRecentlyOnline && nowRecentlyOnline) {
      for (const fid of friendIds) {
        const p = prefs.get(fid);
        if (p?.online === false) continue;
        await createNotification({
          recipientId: fid,
          actorId: userId,
          type: "friend_online",
          dedupeKey: `friend_online:${fid}:${userId}:${hourBucket}`,
          pushTitle: `${actorLabel} is active`,
          pushBody: "Your friend is on the map.",
          route: "/map",
        });
      }
    }

    const prevVenueId = prev?.venue_id ?? null;
    const joinedNewVenue =
      !!venueId && venueId !== prevVenueId && (zoneType === "inner" || zoneType === "outer");

    if (joinedNewVenue) {
      for (const fid of friendIds) {
        const p = prefs.get(fid);
        if (p?.venue === false) continue;
        await createNotification({
          recipientId: fid,
          actorId: userId,
          type: "friend_joined_venue",
          venueId,
          dedupeKey: `friend_joined_venue:${fid}:${userId}:${venueId}:${dayBucket}`,
          pushTitle: `${actorLabel} is at ${venueLabel}`,
          pushBody: "Open the map to see where they checked in.",
          route: venueId ? `/map?venueId=${encodeURIComponent(venueId)}` : "/map",
        });
      }
    }

    const canSendNearby = !venueId;
    if (canSendNearby) {
      const [{ data: friendPresenceRows }, { data: ghostRows }] = await Promise.all([
        supabase
          .from("user_presence")
          .select("user_id, lat, lng, venue_id, updated_at")
          .in("user_id", friendIds),
        supabase.from("profiles").select("id, ghost_mode").in("id", friendIds),
      ]);
      const friendGhostMap: Record<string, boolean> = {};
      for (const row of (ghostRows ?? []) as Array<{ id: string; ghost_mode: boolean | null }>) {
        friendGhostMap[row.id] = !!row.ghost_mode;
      }
      const nearbyThresholdM = 300;
      for (const fp of (friendPresenceRows ?? []) as Array<{
        user_id: string;
        lat: number;
        lng: number;
        venue_id: string | null;
        updated_at: string;
      }>) {
        const p = prefs.get(fp.user_id);
        if (p?.online === false) continue;
        if (friendGhostMap[fp.user_id]) continue;
        if (!isValidCoordinatePair(fp.lat, fp.lng)) continue;
        if (!isPresenceLive(fp.updated_at)) continue;
        if (fp.venue_id) continue;
        const d = distanceMeters(lat, lng, fp.lat, fp.lng);
        if (d > nearbyThresholdM) continue;
        const prevDist =
          prev?.lat != null && prev?.lng != null
            ? distanceMeters(prev.lat, prev.lng, fp.lat, fp.lng)
            : Number.POSITIVE_INFINITY;
        const crossedIntoNearby = prevDist > nearbyThresholdM;
        if (!crossedIntoNearby) continue;
        await createNotification({
          recipientId: fp.user_id,
          actorId: userId,
          type: "friend_nearby",
          dedupeKey: `friend_nearby:${fp.user_id}:${userId}:${hourBucket}`,
          pushTitle: `${actorLabel} is nearby`,
          pushBody: "A friend is close on the map.",
          route: "/map",
        });
      }
    }
  }

  return { error: null };
}
