import * as SecureStore from "expo-secure-store";
import { isNetworkRequestFailed } from "./networkErrors";
import { secureUserKey } from "./secureStoreKeys";

const QUEUE_PREFIX = "chat_send_queue";

export type QueuedChatSend = {
  id: string;
  chatId: string;
  meId: string;
  receiverId: string;
  content: string;
  storyId?: string | null;
  optimisticId: string;
  createdAt: string;
  attempts: number;
};

function queueKey(userId: string): string {
  return secureUserKey(QUEUE_PREFIX, userId);
}

async function readQueue(userId: string): Promise<QueuedChatSend[]> {
  try {
    const raw = await SecureStore.getItemAsync(queueKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedChatSend[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(userId: string, items: QueuedChatSend[]): Promise<void> {
  if (items.length === 0) {
    await SecureStore.deleteItemAsync(queueKey(userId));
    return;
  }
  await SecureStore.setItemAsync(queueKey(userId), JSON.stringify(items));
}

export async function enqueueChatSend(item: Omit<QueuedChatSend, "attempts" | "createdAt">): Promise<void> {
  const queue = await readQueue(item.meId);
  if (queue.some((q) => q.id === item.id)) return;
  queue.push({
    ...item,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  await writeQueue(item.meId, queue);
}

export async function removeQueuedChatSend(meId: string, queueId: string): Promise<void> {
  const queue = await readQueue(meId);
  await writeQueue(
    meId,
    queue.filter((q) => q.id !== queueId)
  );
}

export async function bumpQueuedChatSendAttempts(meId: string, queueId: string): Promise<number> {
  const queue = await readQueue(meId);
  let nextAttempts = 0;
  const next = queue.map((q) => {
    if (q.id !== queueId) return q;
    nextAttempts = q.attempts + 1;
    return { ...q, attempts: nextAttempts };
  });
  await writeQueue(meId, next);
  return nextAttempts;
}

export async function listQueuedChatSends(meId: string): Promise<QueuedChatSend[]> {
  return readQueue(meId);
}

export function shouldQueueChatSendFailure(error: unknown): boolean {
  return isNetworkRequestFailed(error);
}

export function makeChatSendQueueId(): string {
  const crypto = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
