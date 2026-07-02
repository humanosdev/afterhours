import * as SecureStore from "expo-secure-store";
import { secureStoreGetWithLegacy, secureUserKey } from "./secureStoreKeys";

const SEEN_VALUE = "1";
const SEEN_PREFIX = "profile_venues_intro_seen_v1";

const seenUserIds = new Set<string>();

async function hasSeenProfileVenuesIntro(userId: string): Promise<boolean> {
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
    return false;
  } catch {
    return seenUserIds.has(userId);
  }
}

export async function shouldShowProfileVenuesIntro(userId: string): Promise<boolean> {
  return !(await hasSeenProfileVenuesIntro(userId));
}

/** Persist before showing — one time per user. */
export async function recordProfileVenuesIntroSeen(userId: string): Promise<void> {
  if (!userId.trim()) return;
  seenUserIds.add(userId);
  try {
    await SecureStore.setItemAsync(secureUserKey(SEEN_PREFIX, userId), SEEN_VALUE);
  } catch {
    /* memory flag still prevents repeat within session */
  }
}
