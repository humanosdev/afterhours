import type { SupabaseClient } from "@supabase/supabase-js";

export type SendPendingFriendRequestResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/**
 * Creates a pending outgoing friend request as `auth.uid()` → `addresseeId`.
 * Prefer the `send_pending_friend_request` RPC (clears stale declined/canceled/outgoing rows
 * that often block inserts after unfriend / mutual block history). Falls back to a plain
 * insert if the RPC is not deployed yet.
 */
export async function sendPendingFriendRequest(
  supabase: SupabaseClient,
  addresseeId: string
): Promise<SendPendingFriendRequestResult> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { ok: false, code: "auth", message: "Not signed in" };
  if (!addresseeId || me === addresseeId) return { ok: false, code: "invalid", message: "Invalid recipient" };

  const { error: rpcError } = await supabase.rpc("send_pending_friend_request", {
    p_addressee_id: addresseeId,
  });

  if (!rpcError) return { ok: true };

  const rpcMsg = rpcError.message ?? "";
  if (
    rpcError.code === "P0001" ||
    rpcMsg.includes("incoming_friend_request_exists") ||
    rpcMsg.includes("already_friends")
  ) {
    return { ok: false, code: rpcError.code ?? "P0001", message: rpcMsg };
  }

  // Schema cache / older DB without RPC
  if (
    rpcError.code === "PGRST202" ||
    rpcError.code === "42883" ||
    rpcMsg.toLowerCase().includes("could not find the function") ||
    rpcMsg.toLowerCase().includes("does not exist")
  ) {
    const { error: insertError } = await supabase.from("friend_requests").insert({
      requester_id: me,
      addressee_id: addresseeId,
      status: "pending",
    });
    if (!insertError) return { ok: true };
    return { ok: false, code: insertError.code ?? "insert", message: insertError.message ?? "Insert failed" };
  }

  return { ok: false, code: rpcError.code ?? "rpc", message: rpcMsg || "Request failed" };
}
