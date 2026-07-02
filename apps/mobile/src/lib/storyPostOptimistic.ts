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
