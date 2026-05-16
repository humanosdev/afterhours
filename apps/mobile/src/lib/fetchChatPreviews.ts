import type { ChatConversationPreview } from "../types/chatPreview";
import { formatChatListTime } from "./formatChatListTime";
import { supabase } from "./supabase/client";

/** PostgREST batched `in()` — same pattern as `fetchAcceptedFriends`. */
const ID_CHUNK_SIZE = 80;

const CHAT_COLUMNS = "id, user1_id, user2_id, created_at, updated_at, last_message" as const;
const PROFILE_COLUMNS = "id, username, display_name, avatar_url" as const;
const MESSAGE_COLUMNS = "id, chat_id, sender_id, receiver_id, content, seen, created_at" as const;

export type FetchChatPreviewsResult = {
  previews: ChatConversationPreview[];
  error: string | null;
};

type ChatRow = {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
  last_message: string | null;
};

type PeerProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type MessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  seen: boolean;
  created_at: string;
};

function peerTitle(p: PeerProfile | undefined): string {
  if (!p) return "Conversation";
  const d = p.display_name?.trim();
  if (d) return d;
  const u = p.username?.trim();
  if (u) return u;
  return "Conversation";
}

/**
 * Read-only chat list for signed-in user — mirrors web `apps/web/src/app/chat/page.tsx` initial load.
 * Phase 2N — no writes, no realtime, no `user_presence`.
 */
export async function fetchChatPreviews(meId: string): Promise<FetchChatPreviewsResult> {
  const { data: chatRows, error: chatsErr } = await supabase
    .from("chats")
    .select(CHAT_COLUMNS)
    .or(`user1_id.eq.${meId},user2_id.eq.${meId}`)
    .order("updated_at", { ascending: false });

  if (chatsErr) {
    return { previews: [], error: chatsErr.message };
  }

  const rows = (chatRows ?? []) as ChatRow[];
  const dedupedByPair = new Map<string, ChatRow>();
  for (const c of rows) {
    const pairKey = [c.user1_id, c.user2_id].sort().join(":");
    const current = dedupedByPair.get(pairKey);
    if (!current) {
      dedupedByPair.set(pairKey, c);
      continue;
    }
    const cTs = new Date(c.updated_at).getTime();
    const curTs = new Date(current.updated_at).getTime();
    if (cTs > curTs) dedupedByPair.set(pairKey, c);
  }

  const deduped = Array.from(dedupedByPair.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  const peerByChat = new Map<string, string>();
  const peerIds = new Set<string>();
  for (const c of deduped) {
    const otherId = c.user1_id === meId ? c.user2_id : c.user1_id;
    if (otherId) {
      peerByChat.set(c.id, otherId);
      peerIds.add(otherId);
    }
  }

  const profileById = new Map<string, PeerProfile>();
  const pidList = Array.from(peerIds);

  for (let i = 0; i < pidList.length; i += ID_CHUNK_SIZE) {
    const chunk = pidList.slice(i, i + ID_CHUNK_SIZE);
    if (chunk.length === 0) continue;
    const { data: profData, error: pErr } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .in("id", chunk);

    if (pErr) {
      return { previews: [], error: pErr.message };
    }
    for (const p of (profData ?? []) as PeerProfile[]) {
      if (p?.id) profileById.set(p.id, p);
    }
  }

  const chatIds = deduped.map((c) => c.id);
  const latestByChat = new Map<string, MessageRow>();

  for (let i = 0; i < chatIds.length; i += ID_CHUNK_SIZE) {
    const chunk = chatIds.slice(i, i + ID_CHUNK_SIZE);
    if (chunk.length === 0) continue;

    const { data: messageRows, error: messageErr } = await supabase
      .from("messages")
      .select(MESSAGE_COLUMNS)
      .in("chat_id", chunk)
      .order("created_at", { ascending: false });

    if (messageErr) {
      return { previews: [], error: messageErr.message };
    }

    for (const row of (messageRows ?? []) as MessageRow[]) {
      if (!latestByChat.has(row.chat_id)) {
        latestByChat.set(row.chat_id, row);
      }
    }
  }

  const previews: ChatConversationPreview[] = deduped.map((chat) => {
    const peerId = peerByChat.get(chat.id) ?? null;
    const profile = peerId ? profileById.get(peerId) : undefined;
    const title = peerTitle(profile);
    const latest = latestByChat.get(chat.id);
    const updatedAt = latest?.created_at || chat.updated_at || chat.created_at;
    const unread = !!latest && latest.receiver_id === meId && latest.seen === false;
    const content =
      typeof latest?.content === "string" ? latest.content.trim() : "";
    const lastStored = typeof chat.last_message === "string" ? chat.last_message.trim() : "";
    const preview = content || lastStored || "No messages yet";

    return {
      chatId: chat.id,
      peerId,
      peerUsername: profile?.username?.trim() ?? null,
      peerDisplayName: profile?.display_name?.trim() ?? null,
      title,
      preview,
      timeLabel: formatChatListTime(updatedAt),
      sortTime: new Date(updatedAt).getTime(),
      unread,
      avatarUrl: profile?.avatar_url ?? null,
    };
  });

  previews.sort((a, b) => b.sortTime - a.sortTime);

  return { previews, error: null };
}
