import type { ChatThreadMessage, ChatThreadPeer } from "../types/chatThread";
import { hydrateChatStoryReplies } from "./hydrateChatStoryReplies";
import { getPairBlockStatus, type PairBlockStatus } from "./pairBlockStatus";
import { supabase } from "./supabase/client";

/**
 * READ-SOCIAL-1 — read-only thread hydration.
 * Mirrors PWA `ChatConversationPage` queries (no joins, no writes, no realtime).
 */

const CHAT_MEMBERSHIP_COLUMNS = "id, user1_id, user2_id" as const;
const PEER_PROFILE_COLUMNS = "id, username, display_name, avatar_url" as const;
const MESSAGE_COLUMNS = "id, sender_id, receiver_id, content, created_at, story_id, seen" as const;

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
  gateError: "not_found" | "not_participant" | null;
  peer: ChatThreadPeer | null;
  otherId: string | null;
  pairBlock: PairBlockStatus;
}> {
  const { data: chat, error: chatErr } = await supabase
    .from("chats")
    .select(CHAT_MEMBERSHIP_COLUMNS)
    .eq("id", chatId)
    .maybeSingle();

  if (chatErr || !chat) {
    return { gateError: "not_found", peer: null, otherId: null, pairBlock: "none" };
  }

  const row = chat as ChatMembershipRow;
  if (row.user1_id !== meId && row.user2_id !== meId) {
    return { gateError: "not_participant", peer: null, otherId: null, pairBlock: "none" };
  }

  const otherId = row.user1_id === meId ? row.user2_id : row.user1_id;
  if (!otherId) {
    return { gateError: "not_found", peer: null, otherId: null, pairBlock: "none" };
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select(PEER_PROFILE_COLUMNS)
    .eq("id", otherId)
    .maybeSingle();

  const peer = prof ? (prof as ChatThreadPeer) : null;
  const pairBlock = await getPairBlockStatus(meId, otherId);

  return { gateError: null, peer, otherId, pairBlock };
}

export async function fetchChatThreadMessages(
  chatId: string
): Promise<{ messages: ChatThreadMessage[]; messagesError: string | null }> {
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_COLUMNS)
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    return { messages: [], messagesError: error.message };
  }

  const raw = (data ?? []) as ChatThreadMessage[];
  const messages = await hydrateChatStoryReplies(raw);

  return { messages, messagesError: null };
}
