import { isStoryRowShareFlag } from "./hubFeedSemantics";
import { getBlockDirections } from "./pairBlockStatus";
import { decodeFriendRequestNotificationPreview } from "./notificationFriendPreview";
import { supabase } from "./supabase/client";
import type { NotificationRow, NotificationWithMeta } from "../types/notification";

const ID_CHUNK = 80;

export async function enrichNotificationRows(
  rows: NotificationRow[],
  meId: string
): Promise<NotificationWithMeta[]> {
  if (rows.length === 0) return [];

  const actorIds = Array.from(new Set(rows.map((n) => n.actor_user_id).filter(Boolean)));
  const venueIds = Array.from(new Set(rows.map((n) => n.venue_id).filter(Boolean))) as string[];
  const storyIds = Array.from(
    new Set(
      rows
        .filter((n) => (n.type === "story_like" || n.type === "story_comment") && n.story_id)
        .map((n) => n.story_id as string)
    )
  );
  const { theyBlockedMe, iBlockedThem } = await getBlockDirections(meId);

  const actorLabelFor = (
    actorId: string,
    meta: { username: string | null; display_name: string | null }
  ) => {
    if (theyBlockedMe.has(actorId)) return "This user blocked you";
    if (iBlockedThem.has(actorId)) return "Blocked user";
    return meta.display_name?.trim() || meta.username?.trim() || "Someone";
  };

  const actorById: Record<
    string,
    { username: string | null; display_name: string | null; avatar_url: string | null }
  > = {};
  const venueById: Record<string, string> = {};

  for (let i = 0; i < actorIds.length; i += ID_CHUNK) {
    const chunk = actorIds.slice(i, i + ID_CHUNK);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", chunk);
    for (const row of data ?? []) {
      actorById[row.id] = {
        username: row.username ?? null,
        display_name: row.display_name ?? null,
        avatar_url: row.avatar_url ?? null,
      };
    }
  }

  if (venueIds.length) {
    for (let i = 0; i < venueIds.length; i += ID_CHUNK) {
      const chunk = venueIds.slice(i, i + ID_CHUNK);
      const { data } = await supabase.from("venues").select("id, name").in("id", chunk);
      for (const row of data ?? []) {
        venueById[row.id] = row.name ?? "Venue";
      }
    }
  }

  const storyShareById: Record<string, boolean> = {};
  if (storyIds.length) {
    for (let i = 0; i < storyIds.length; i += ID_CHUNK) {
      const chunk = storyIds.slice(i, i + ID_CHUNK);
      const { data } = await supabase.from("stories").select("id, is_share").in("id", chunk);
      for (const row of data ?? []) {
        storyShareById[row.id as string] = isStoryRowShareFlag(row.is_share);
      }
    }
  }

  return rows.map((n) => {
    const meta = actorById[n.actor_user_id] ?? {
      username: null,
      display_name: null,
      avatar_url: null,
    };
    const friendReqType =
      n.type === "friend_request_received" || n.type === "friend_request_accepted";
    const snap = friendReqType
      ? decodeFriendRequestNotificationPreview(n.message_preview)
      : {};
    const merged = {
      username: meta.username ?? snap.username ?? null,
      display_name: meta.display_name ?? snap.display_name ?? null,
      avatar_url: meta.avatar_url ?? snap.avatar_url ?? null,
    };
    const actor_label = friendReqType
      ? merged.display_name?.trim() || merged.username?.trim() || "Someone"
      : actorLabelFor(n.actor_user_id, {
          username: merged.username,
          display_name: merged.display_name,
        });
    return {
      ...n,
      actor_username: merged.username,
      actor_display_name: merged.display_name,
      actor_avatar_url: merged.avatar_url ?? null,
      actor_label,
      venue_name: n.venue_id ? (venueById[n.venue_id] ?? null) : null,
      story_is_share:
        n.story_id && (n.type === "story_like" || n.type === "story_comment")
          ? (storyShareById[n.story_id] ?? null)
          : null,
    };
  });
}
