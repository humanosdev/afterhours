import * as SecureStore from "expo-secure-store";

export type RecentSearchKind = "user" | "venue";

export type RecentSearchItem = {
  kind: RecentSearchKind;
  id: string;
  label: string;
  subtitle?: string;
  at: number;
};

const STORAGE_KEY = "ah_recent_discovery_searches_v1";
const MAX_ITEMS = 10;

function storageKeyForUser(userId: string) {
  return `${STORAGE_KEY}:${userId}`;
}

async function readRaw(userId: string): Promise<RecentSearchItem[]> {
  try {
    const raw = await SecureStore.getItemAsync(storageKeyForUser(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x): x is RecentSearchItem =>
          !!x &&
          typeof x === "object" &&
          (x as RecentSearchItem).kind !== undefined &&
          typeof (x as RecentSearchItem).id === "string" &&
          typeof (x as RecentSearchItem).label === "string" &&
          typeof (x as RecentSearchItem).at === "number"
      )
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

async function writeRaw(userId: string, items: RecentSearchItem[]) {
  try {
    await SecureStore.setItemAsync(storageKeyForUser(userId), JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* unavailable */
  }
}

export async function getRecentDiscoverySearches(userId: string): Promise<RecentSearchItem[]> {
  const rows = await readRaw(userId);
  return rows.sort((a, b) => b.at - a.at).slice(0, MAX_ITEMS);
}

export async function pushRecentDiscoverySearch(
  userId: string,
  next: Omit<RecentSearchItem, "at"> & { at?: number }
): Promise<RecentSearchItem[]> {
  const at = next.at ?? Date.now();
  const dedupeKey = `${next.kind}:${next.id}`;
  const prev = (await readRaw(userId)).filter((x) => `${x.kind}:${x.id}` !== dedupeKey);
  const row: RecentSearchItem = { ...next, at };
  const merged = [row, ...prev].sort((a, b) => b.at - a.at).slice(0, MAX_ITEMS);
  await writeRaw(userId, merged);
  return merged;
}
