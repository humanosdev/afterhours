import type { ShareAspectFormat } from "./shareAspect";
import type { ComposerMode } from "./uploadStoryMediaTypes";

/** Phase 5.5 — optimistic hub row before upload completes. */
export type StoryPostStartPayload = {
  tempId: string;
  mode: ComposerMode;
  localUri: string;
  shareAspect?: ShareAspectFormat;
  userId: string;
  username: string;
  avatarUrl: string | null;
  profileSlug: string | null;
  createdAt: string;
};

export type StoryPostConfirmedPayload = {
  tempId: string;
  storyId: string;
  imageUrl: string;
};

type StoryPostStartListener = (payload: StoryPostStartPayload) => void;
type StoryPostConfirmedListener = (payload: StoryPostConfirmedPayload) => void;
type StoryPostFailedListener = (tempId: string) => void;

const startListeners = new Set<StoryPostStartListener>();
const confirmedListeners = new Set<StoryPostConfirmedListener>();
const failedListeners = new Set<StoryPostFailedListener>();

export function subscribeStoryPostStarted(listener: StoryPostStartListener): () => void {
  startListeners.add(listener);
  return () => startListeners.delete(listener);
}

export function subscribeStoryPostConfirmed(listener: StoryPostConfirmedListener): () => void {
  confirmedListeners.add(listener);
  return () => confirmedListeners.delete(listener);
}

export function subscribeStoryPostFailed(listener: StoryPostFailedListener): () => void {
  failedListeners.add(listener);
  return () => failedListeners.delete(listener);
}

export function emitStoryPostStarted(payload: StoryPostStartPayload): void {
  startListeners.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      /* listener */
    }
  });
}

export function emitStoryPostConfirmed(payload: StoryPostConfirmedPayload): void {
  confirmedListeners.forEach((fn) => {
    try {
      fn(payload);
    } catch {
      /* listener */
    }
  });
}

export function emitStoryPostFailed(tempId: string): void {
  failedListeners.forEach((fn) => {
    try {
      fn(tempId);
    } catch {
      /* listener */
    }
  });
}

export function makeOptimisticStoryId(): string {
  return `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isOptimisticStoryId(id: string): boolean {
  return id.startsWith("optimistic-");
}

export function mergeOptimisticMomentsMap<T extends { id: string }>(
  server: Map<string, T[]>,
  prev: Map<string, T[]>
): Map<string, T[]> {
  const next = new Map(server);
  for (const [uid, prevStories] of prev) {
    const pending = prevStories.filter((story) => isOptimisticStoryId(story.id));
    if (!pending.length) continue;
    const serverStories = next.get(uid) ?? [];
    const serverIds = new Set(serverStories.map((story) => story.id));
    const toKeep = pending.filter((story) => !serverIds.has(story.id));
    if (toKeep.length) {
      next.set(uid, [...serverStories, ...toKeep]);
    }
  }
  return next;
}

export function mergeOptimisticShareRows<T extends { id: string }>(server: T[], prev: T[]): T[] {
  const pending = prev.filter((row) => isOptimisticStoryId(row.id));
  if (!pending.length) return server;
  const serverIds = new Set(server.map((row) => row.id));
  const head = pending.filter((row) => !serverIds.has(row.id));
  return head.length ? [...head, ...server] : server;
}
