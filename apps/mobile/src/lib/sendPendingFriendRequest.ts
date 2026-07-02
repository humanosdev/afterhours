import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "./supabase/client";

export type SendPendingFriendRequestResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

/** Mirrors web `sendPendingFriendRequest`. */
export async function sendPendingFriendRequest(
  client: SupabaseClient,
  addresseeId: string
): Promise<SendPendingFriendRequestResult> {
  const { data: auth } = await client.auth.getUser();
  const me = auth.user?.id;
  if (!me) return { ok: false, code: "auth", message: "Not signed in" };
  if (!addresseeId || me === addresseeId) return { ok: false, code: "invalid", message: "Invalid recipient" };

  const { error: rpcError } = await client.rpc("send_pending_friend_request", {
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

  if (
    rpcError.code === "PGRST202" ||
    rpcError.code === "42883" ||
    rpcMsg.toLowerCase().includes("could not find the function") ||
    rpcMsg.toLowerCase().includes("does not exist")
  ) {
    const { error: insertError } = await client.from("friend_requests").insert({
      requester_id: me,
      addressee_id: addresseeId,
      status: "pending",
    });
    if (!insertError) return { ok: true };
    return { ok: false, code: insertError.code ?? "insert", message: insertError.message ?? "Insert failed" };
  }

  return { ok: false, code: rpcError.code ?? "rpc", message: rpcMsg || "Request failed" };
}

export async function sendPendingFriendRequestDefault(addresseeId: string) {
  return sendPendingFriendRequest(supabase, addresseeId);
}
