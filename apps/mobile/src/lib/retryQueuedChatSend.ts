import { bumpChatListRefresh } from "./chatListRefresh";
import {
  listQueuedChatSends,
  removeQueuedChatSend,
  type QueuedChatSend,
} from "./chatSendQueue";
import { sendChatMessage, type SendChatMessageResult } from "./sendChatMessage";
import type { ChatThreadMessage } from "../types/chatThread";

export type RetryQueuedChatSendResult =
  | { ok: true; message: ChatThreadMessage }
  | { ok: false; error: string; stillQueued: boolean };

export async function findQueuedChatSendByOptimisticId(
  meId: string,
  optimisticId: string
): Promise<QueuedChatSend | null> {
  const queue = await listQueuedChatSends(meId);
  return queue.find((q) => q.optimisticId === optimisticId) ?? null;
}

/** Retry one queued outbound message by its optimistic bubble id. */
export async function retryQueuedChatSendByOptimisticId(
  meId: string,
  optimisticId: string
): Promise<RetryQueuedChatSendResult> {
  const item = await findQueuedChatSendByOptimisticId(meId, optimisticId);
  if (!item) {
    return { ok: false, error: "not_queued", stillQueued: false };
  }

  const result: SendChatMessageResult = await sendChatMessage({
    chatId: item.chatId,
    meId: item.meId,
    receiverId: item.receiverId,
    content: item.content,
    storyId: item.storyId ?? null,
  });

  if (result.ok) {
    await removeQueuedChatSend(meId, item.id);
    bumpChatListRefresh();
    return { ok: true, message: result.message };
  }

  if (result.error === "network_failed") {
    return { ok: false, error: "network_failed", stillQueued: true };
  }

  await removeQueuedChatSend(meId, item.id);
  return { ok: false, error: result.error, stillQueued: false };
}
