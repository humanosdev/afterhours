import * as SecureStore from "expo-secure-store";
import { secureStoreGetWithLegacy, secureUserKey } from "./secureStoreKeys";

const SEEN_VALUE = "1";
const SEEN_PREFIX = "map_intro_seen_v1";
const LEGACY_VIEWS_PREFIX = "map_intro_views_v1";

const seenUserIds = new Set<string>();

async function hasSeenMapIntro(userId: string): Promise<boolean> {
  if (!userId.trim()) return false;
  if (seenUserIds.has(userId)) return true;
  try {
    const seen = await secureStoreGetWithLegacy(
      (key) => SecureStore.getItemAsync(key),
      SEEN_PREFIX,
      userId
    );
    if (seen === SEEN_VALUE) {
      seenUserIds.add(userId);
      return true;
    }

    const legacy = await secureStoreGetWithLegacy(
      (key) => SecureStore.getItemAsync(key),
      LEGACY_VIEWS_PREFIX,
      userId
    );
    if (legacy) {
      const n = Number.parseInt(legacy, 10);
      if (Number.isFinite(n) && n >= 1) {
        seenUserIds.add(userId);
        return true;
      }
    }
    return false;
  } catch {
    return seenUserIds.has(userId);
  }
}

export async function shouldShowMapIntro(userId: string): Promise<boolean> {
  return !(await hasSeenMapIntro(userId));
}

/** Persist before showing — one time per user. */
export async function recordMapIntroSeen(userId: string): Promise<void> {
  if (!userId.trim()) return;
  seenUserIds.add(userId);
  try {
    await SecureStore.setItemAsync(secureUserKey(SEEN_PREFIX, userId), SEEN_VALUE);
  } catch {
    /* memory flag still prevents repeat within session */
  }
}
