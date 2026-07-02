import * as SecureStore from "expo-secure-store";
import { secureStoreGetWithLegacy, secureUserKey } from "./secureStoreKeys";

const OPEN_COUNT_PREFIX = "app_open_count_v1";
const HUB_PENDING_PREFIX = "hub_suggestions_pending_v1";
const PENDING_VALUE = "1";

let sessionOpenPromise: Promise<number> | null = null;
let sessionOpenUserId: string | null = null;

export async function readAppOpenCount(userId: string): Promise<number> {
  if (!userId.trim()) return 0;
  try {
    const raw = await secureStoreGetWithLegacy(
      (key) => SecureStore.getItemAsync(key),
      OPEN_COUNT_PREFIX,
      userId
    );
    const n = raw ? Number.parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

async function setHubSuggestionsPending(userId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(secureUserKey(HUB_PENDING_PREFIX, userId), PENDING_VALUE);
  } catch {
    /* best effort */
  }
}

async function hasHubSuggestionsPending(userId: string): Promise<boolean> {
  if (!userId.trim()) return false;
  try {
    const raw = await secureStoreGetWithLegacy(
      (key) => SecureStore.getItemAsync(key),
      HUB_PENDING_PREFIX,
      userId
    );
    return raw === PENDING_VALUE;
  } catch {
    return false;
  }
}

export async function clearHubSuggestionsPending(userId: string): Promise<void> {
  if (!userId.trim()) return;
  try {
    await SecureStore.deleteItemAsync(secureUserKey(HUB_PENDING_PREFIX, userId));
  } catch {
    /* best effort */
  }
}

/** Hub suggestions coach — every 3rd app open (3, 6, 9, …). */
export function shouldShowHubSuggestionsPopup(openCount: number): boolean {
  return openCount > 0 && openCount % 3 === 0;
}

/** Once per cold start — increments count and marks hub popup pending on 3rd/6th/9th open. */
export async function recordAuthenticatedAppOpen(userId: string): Promise<number> {
  if (!userId.trim()) return 0;
  const next = (await readAppOpenCount(userId)) + 1;
  await SecureStore.setItemAsync(secureUserKey(OPEN_COUNT_PREFIX, userId), String(next));
  if (shouldShowHubSuggestionsPopup(next)) {
    await setHubSuggestionsPending(userId);
  }
  return next;
}

/** Deduped session increment — safe to call from AppOpenTracker and Hub. */
export function ensureSessionAppOpenRecorded(userId: string): Promise<number> {
  if (!userId.trim()) return Promise.resolve(0);
  if (sessionOpenUserId === userId && sessionOpenPromise) {
    return sessionOpenPromise;
  }
  sessionOpenUserId = userId;
  sessionOpenPromise = recordAuthenticatedAppOpen(userId);
  return sessionOpenPromise;
}

export function resetAppOpenSessionState(): void {
  sessionOpenPromise = null;
  sessionOpenUserId = null;
}

/** True when an eligible open happened — show on next Hub visit. */
export async function shouldShowHubSuggestionsOnHubVisit(userId: string): Promise<boolean> {
  if (!userId.trim()) return false;
  await ensureSessionAppOpenRecorded(userId);
  return hasHubSuggestionsPending(userId);
}
