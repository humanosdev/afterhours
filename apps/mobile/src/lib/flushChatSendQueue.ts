import { bumpChatListRefresh } from "./chatListRefresh";
import {
  bumpQueuedChatSendAttempts,
  listQueuedChatSends,
  removeQueuedChatSend,
  type QueuedChatSend,
} from "./chatSendQueue";
import { sendChatMessage } from "./sendChatMessage";

const MAX_ATTEMPTS = 8;

export type FlushChatSendQueueResult = {
  sent: QueuedChatSend[];
  failed: QueuedChatSend[];
};

/** Retry SecureStore-backed chat sends after reconnect (Phase 1). */
export async function flushChatSendQueue(meId: string): Promise<FlushChatSendQueueResult> {
  const pending = await listQueuedChatSends(meId);
  if (pending.length === 0) {
    return { sent: [], failed: [] };
  }

  const sent: QueuedChatSend[] = [];
  const failed: QueuedChatSend[] = [];

  for (const item of pending) {
    const result = await sendChatMessage({
      chatId: item.chatId,
      meId: item.meId,
      receiverId: item.receiverId,
      content: item.content,
      storyId: item.storyId ?? null,
    });

    if (result.ok) {
      await removeQueuedChatSend(meId, item.id);
      sent.push(item);
      continue;
    }

    const attempts = await bumpQueuedChatSendAttempts(meId, item.id);
    if (attempts >= MAX_ATTEMPTS) {
      await removeQueuedChatSend(meId, item.id);
      failed.push({ ...item, attempts });
    }
  }

  if (sent.length > 0) {
    bumpChatListRefresh();
  }

  return { sent, failed };
}
