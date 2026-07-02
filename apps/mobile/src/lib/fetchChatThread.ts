import type { ChatThreadData, ChatThreadMessage, ChatThreadPeer } from "../types/chatThread";
import { hydrateChatStoryReplies } from "./hydrateChatStoryReplies";
import { logChatThreadDebug } from "./chatThreadDebug";
import { getPairBlockStatus, type PairBlockStatus } from "./pairBlockStatus";
import { supabase } from "./supabase/client";

/**
 * READ-SOCIAL-1 — read-only thread hydration.
 * Mirrors PWA `ChatConversationPage` queries (no joins, no writes, no realtime).
 *
 * Reads:
 * 1. `chats` — id, user1_id, user2_id (membership gate)
 * 2. `profiles` — id, username, display_name, avatar_url (peer)
 * 3. `blocks` — via `getPairBlockStatus` (read-only)
 * 4. `messages` — id, sender_id, receiver_id, content, created_at ASC
 */

const CHAT_MEMBERSHIP_COLUMNS = "id, user1_id, user2_id" as const;
const PEER_PROFILE_COLUMNS = "id, username, display_name, avatar_url" as const;
const MESSAGE_COLUMNS = "id, sender_id, receiver_id, content, created_at, story_id" as const;

type ChatMembershipRow = {
  id: string;
  user1_id: string;
  user2_id: string;
};

export function peerDisplayTitle(peer: ChatThreadPeer | null): string {
  if (!peer) return "Chat";
  const d = peer.display_name?.trim();
  if (d) return d;
  const u = peer.username?.trim();
  if (u) return u;
  return "Chat";
}

export async function fetchChatThreadGate(
  meId: string,
  chatId: string
): Promise<{
  gateError: ChatThreadData["gateError"];
  peer: ChatThreadPeer | null;
  otherId: string | null;
  pairBlock: PairBlockStatus;
}> {
  logChatThreadDebug("membership_query", { chatId, meId });

  const { data: chat, error: chatErr } = await supabase
    .from("chats")
    .select(CHAT_MEMBERSHIP_COLUMNS)
    .eq("id", chatId)
    .maybeSingle();

  if (chatErr || !chat) {
    logChatThreadDebug("membership_result", {
      chatId,
      ok: false,
      error: chatErr?.message ?? "no_row",
    });
    return { gateError: "not_found", peer: null, otherId: null, pairBlock: "none" };
  }

  const row = chat as ChatMembershipRow;
  if (row.user1_id !== meId && row.user2_id !== meId) {
    logChatThreadDebug("membership_result", { chatId, ok: false, reason: "not_participant" });
    return { gateError: "not_participant", peer: null, otherId: null, pairBlock: "none" };
  }

  const otherId = row.user1_id === meId ? row.user2_id : row.user1_id;
  if (!otherId) {
    logChatThreadDebug("membership_result", { chatId, ok: false, reason: "missing_other_id" });
    return { gateError: "not_found", peer: null, otherId: null, pairBlock: "none" };
  }

  logChatThreadDebug("membership_result", { chatId, ok: true, otherId });

  const { data: prof, error: profErr } = await supabase
    .from("profiles")
    .select(PEER_PROFILE_COLUMNS)
    .eq("id", otherId)
    .maybeSingle();

  if (profErr) {
    logChatThreadDebug("peer_profile_error", { otherId, message: profErr.message });
  }

  const peer = prof ? (prof as ChatThreadPeer) : null;
  logChatThreadDebug("peer_profile_result", {
    otherId,
    hasPeer: Boolean(peer),
    username: peer?.username ?? null,
    display_name: peer?.display_name ?? null,
  });

  const pairBlock = await getPairBlockStatus(meId, otherId);

  return { gateError: null, peer, otherId, pairBlock };
}

export async function fetchChatThreadMessages(
  chatId: string
): Promise<{ messages: ChatThreadMessage[]; messagesError: string | null }> {
  logChatThreadDebug("messages_query", { chatId });

  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    logChatThreadDebug("messages_result", {
      chatId,
      ok: false,
      error: error.message,
      code: error.code,
    });
    return { messages: [], messagesError: error.message };
  }

  const messages = await hydrateChatStoryReplies((data ?? []) as ChatThreadMessage[]);
  logChatThreadDebug("messages_result", {
    chatId,
    ok: true,
    count: messages.length,
    firstId: messages[0]?.id ?? null,
    lastId: messages[messages.length - 1]?.id ?? null,
  });

  return { messages, messagesError: null };
}

export async function fetchChatThread(
  meId: string,
  chatId: string
): Promise<ChatThreadData> {
  const gate = await fetchChatThreadGate(meId, chatId);
  if (gate.gateError) {
    return {
      peer: null,
      otherId: null,
      messages: [],
      pairBlock: "none",
      gateError: gate.gateError,
      messagesError: null,
    };
  }

  const { messages, messagesError } = await fetchChatThreadMessages(chatId);

  return {
    peer: gate.peer,
    otherId: gate.otherId,
    messages,
    pairBlock: gate.pairBlock,
    gateError: null,
    messagesError,
  };
}
