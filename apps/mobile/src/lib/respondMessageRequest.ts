import { bumpChatListRefresh } from "./chatListRefresh";
import {
  approveChatInboxRequest,
  denyChatInboxRequest,
  type ChatInboxPrefs,
} from "./chatInboxPrefs";
import {
  acceptIncomingFriendRequest,
  denyIncomingFriendRequest,
} from "./respondIncomingFriendRequest";
import { invalidateSocialGraph } from "./socialGraphSync";
import { supabase } from "./supabase/client";

async function findIncomingFriendRequestId(
  meId: string,
  requesterId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("friend_requests")
    .select("id")
    .eq("requester_id", requesterId)
    .eq("addressee_id", meId)
    .eq("status", "pending")
    .maybeSingle();
  return data?.id ?? null;
}

export type RespondMessageRequestResult =
  | { ok: true; prefs: ChatInboxPrefs; becameFriends: boolean }
  | { ok: false; error: string };

/** Accept a DM request — approves inbox + accepts pending friend request when present. */
export async function acceptMessageRequest(params: {
  meId: string;
  chatId: string;
  peerId: string;
}): Promise<RespondMessageRequestResult> {
  const { meId, chatId, peerId } = params;

  let becameFriends = false;
  const requestId = await findIncomingFriendRequestId(meId, peerId);
  if (requestId) {
    const accepted = await acceptIncomingFriendRequest(meId, requestId, peerId);
    if (!accepted.ok) {
      return { ok: false, error: accepted.error ?? "Could not accept friend request." };
    }
    becameFriends = true;
  }

  const prefs = await approveChatInboxRequest(meId, chatId);
  if (becameFriends) invalidateSocialGraph(meId);
  bumpChatListRefresh();
  return { ok: true, prefs, becameFriends };
}

/** Deny a DM request — hides the thread and declines a pending friend request when present. */
export async function denyMessageRequest(params: {
  meId: string;
  chatId: string;
  peerId: string;
}): Promise<RespondMessageRequestResult> {
  const { meId, chatId, peerId } = params;

  const requestId = await findIncomingFriendRequestId(meId, peerId);
  if (requestId) {
    const denied = await denyIncomingFriendRequest(requestId);
    if (!denied.ok) {
      return { ok: false, error: denied.error ?? "Could not decline friend request." };
    }
    invalidateSocialGraph(meId);
  }

  const prefs = await denyChatInboxRequest(meId, chatId);
  bumpChatListRefresh();
  return { ok: true, prefs, becameFriends: false };
}
