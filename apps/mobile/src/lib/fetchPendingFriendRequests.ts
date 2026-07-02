import { decodeFriendRequestNotificationPreview } from "./notificationFriendPreview";
import { idsBlockedWithMe } from "./pairBlockStatus";
import { supabase } from "./supabase/client";

export type PendingFriendRequest = {
  id: string;
  requester_id: string;
  created_at: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

/** Incoming pending requests for notifications strip — `friend_requests` + `profiles` only. */
export async function fetchPendingFriendRequests(userId: string): Promise<{
  rows: PendingFriendRequest[];
  error: string | null;
}> {
  const { data: pending, error } = await supabase
    .from("friend_requests")
    .select("id, requester_id, created_at")
    .eq("addressee_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return { rows: [], error: error.message };
  }

  const blockedIds = await idsBlockedWithMe(userId);
  const visiblePending = (pending ?? []).filter((r) => !blockedIds.has(r.requester_id));

  const requesterIds = Array.from(
    new Set(visiblePending.map((r) => r.requester_id).filter(Boolean))
  ) as string[];

  if (requesterIds.length === 0) {
    return { rows: [], error: null };
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", requesterIds);

  if (profileError) {
    return { rows: [], error: profileError.message };
  }

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const needSnap = requesterIds.filter((id) => {
    const p = byId.get(id);
    return !p || (!p.display_name?.trim() && !p.username?.trim());
  });
  const snapFromNotif: Record<string, ReturnType<typeof decodeFriendRequestNotificationPreview>> =
    {};
  if (needSnap.length) {
    const { data: notifRows } = await supabase
      .from("notifications")
      .select("actor_user_id, message_preview, created_at")
      .eq("recipient_user_id", userId)
      .eq("type", "friend_request_received")
      .in("actor_user_id", needSnap)
      .order("created_at", { ascending: false });
    for (const row of notifRows ?? []) {
      const aid = row.actor_user_id as string;
      if (snapFromNotif[aid]) continue;
      snapFromNotif[aid] = decodeFriendRequestNotificationPreview(row.message_preview);
    }
  }

  const rows: PendingFriendRequest[] = visiblePending.map((r) => {
    const p = byId.get(r.requester_id);
    const snap = snapFromNotif[r.requester_id] ?? {};
    return {
      id: r.id,
      requester_id: r.requester_id,
      created_at: r.created_at,
      username: p?.username ?? snap.username ?? null,
      display_name: p?.display_name?.trim() || snap.display_name?.trim() || null,
      avatar_url: p?.avatar_url ?? snap.avatar_url ?? null,
    };
  });

  return { rows, error: null };
}
