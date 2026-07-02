import { createFriendRequestAcceptedNotification } from "./createNotification";
import { invalidateSocialGraph } from "./socialGraphSync";
import type { FriendRequestNotificationPreview } from "./notificationFriendPreview";
import { getPairBlockStatus } from "./pairBlockStatus";
import { supabase } from "./supabase/client";

async function profilePreview(userId: string): Promise<FriendRequestNotificationPreview> {
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

/** PWA notifications page `acceptRequest` / `denyRequest`. */
export async function acceptIncomingFriendRequest(
  meId: string,
  requestId: string,
  requesterId: string
): Promise<{ ok: boolean; error?: string }> {
  const pair = await getPairBlockStatus(meId, requesterId);
  if (pair !== "none") {
    await supabase.from("friend_requests").update({ status: "declined" }).eq("id", requestId);
    return { ok: true };
  }

  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "accepted" })
    .eq("id", requestId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await createFriendRequestAcceptedNotification({
    recipientId: requesterId,
    actorId: meId,
    actorPreview: await profilePreview(meId),
  });
  invalidateSocialGraph(meId);
  invalidateSocialGraph(requesterId);
  return { ok: true };
}

export async function denyIncomingFriendRequest(
  requestId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "declined" })
    .eq("id", requestId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
