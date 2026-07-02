import { bumpChatListRefresh } from "./chatListRefresh";
import { createMessageNotification } from "./createNotification";
import { isLikelyNetworkFailure, isNetworkRequestFailed } from "./networkErrors";
import { supabase } from "./supabase/client";
import type { ChatThreadMessage } from "../types/chatThread";

const MESSAGE_COLUMNS = "id, sender_id, receiver_id, content, created_at, story_id" as const;

export function makeOptimisticMessageId(): string {
  const crypto = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (crypto?.randomUUID) {
    return `temp-${crypto.randomUUID()}`;
  }
  return `temp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type SendChatMessageResult =
  | { ok: true; message: ChatThreadMessage }
  | { ok: false; error: string };

/**
 * PWA `ChatConversationPage` send — insert message, update chat preview, notify peer.
 * CHAT-1 send; REALTIME-1 updates thread/list via postgres_changes (bump is fallback).
 */
export async function sendChatMessage(params: {
  chatId: string;
  meId: string;
  receiverId: string;
  content: string;
  /** When replying from story viewer — shows story preview in thread. */
  storyId?: string | null;
  storyAttachment?: ChatThreadMessage["story_attachment"];
}): Promise<SendChatMessageResult> {
  const payload = params.content.trim();
  if (!payload) return { ok: false, error: "empty" };

  const insertRow: Record<string, unknown> = {
    chat_id: params.chatId,
    sender_id: params.meId,
    receiver_id: params.receiverId,
    content: payload,
  };
  if (params.storyId) insertRow.story_id = params.storyId;

  let data: Record<string, unknown> | null = null;
  let insertError: { message?: string } | null = null;

  try {
    const result = await supabase.from("messages").insert(insertRow).select(MESSAGE_COLUMNS).single();
    data = result.data as Record<string, unknown> | null;
    insertError = result.error;
  } catch (e) {
    if (isNetworkRequestFailed(e)) return { ok: false, error: "network_failed" };
    return { ok: false, error: "send_failed" };
  }

  if (insertError || !data) {
    if (insertError && isLikelyNetworkFailure(insertError)) {
      return { ok: false, error: "network_failed" };
    }
    return { ok: false, error: insertError?.message ?? "send_failed" };
  }

  const message: ChatThreadMessage = {
    ...(data as ChatThreadMessage),
    story_id: params.storyId ?? (data as { story_id?: string | null }).story_id ?? null,
    story_attachment: params.storyAttachment ?? null,
  };

  try {
    const { error: chatErr } = await supabase
      .from("chats")
      .update({
        last_message: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.chatId);

    if (chatErr) {
      console.warn("sendChatMessage chat update:", chatErr.message);
    }
  } catch (e) {
    if (isNetworkRequestFailed(e)) {
      return { ok: false, error: "network_failed" };
    }
  }

  try {
    await createMessageNotification({
      recipientId: params.receiverId,
      actorId: params.meId,
      chatId: params.chatId,
      messagePreview: payload,
      dedupeKey: `message:${message.id}`,
    });
  } catch (e) {
    if (__DEV__ && isNetworkRequestFailed(e)) {
      console.warn("sendChatMessage notification:", e);
    }
  }

  bumpChatListRefresh();

  return { ok: true, message };
}
